import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Keypair } from '@stellar/stellar-sdk';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzleUserRepository } from '../users/infrastructure/drizzle-user.repository.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { stellarHash } from './stellar-flow-cookie.js';
import { stellarHttpTestApp, stellarSigned, stellarCookies, stellarCookie, stellarSnapshot, STELLAR_TEST_ORIGIN as ORIGIN, STELLAR_TEST_PASSWORD as PASSWORD, STELLAR_TEST_HMAC as HMAC } from './testing/stellar-http-test-kit.js';

const client = Keypair.random();
const foreign = Keypair.random();
type Snapshot = Awaited<ReturnType<typeof stellarSnapshot>>;

describe('Stellar HTTP authentication (real guards, SDK and isolated PostgreSQL)', () => {
  let fixture: TestDb;
  let app: NestExpressApplication;
  let jwt: JwtService;
  let users: DrizzleUserRepository;
  beforeAll(async () => {
    fixture = await createTestDb(); users = new DrizzleUserRepository(fixture.db);
    console.info('[stellar-owned-db]', (await fixture.client.query('SELECT current_database() AS name')).rows[0].name);
  });
  afterAll(async () => { await fixture.close(); });
  beforeEach(async () => {
    await fixture.client.query('TRUNCATE users,stellar_auth_challenges,stellar_auth_attempts CASCADE');
    ({ app, jwt } = await stellarHttpTestApp(fixture));
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 404 }, { status: 404 })));
  });
  afterEach(async () => { await app.close(); vi.unstubAllGlobals(); });
  const snapshot = () => stellarSnapshot(fixture);
  const post = (path: string, body: object, cookies: string[] = [], token?: string, origin = ORIGIN) => {
    const call = request(app.getHttpServer()).post(path).set('Origin', origin).send(body);
    if (cookies.length) call.set('Cookie', cookies);
    if (token) call.set('Authorization', `Bearer ${token}`);
    return call;
  };
  const challenge = async (key = client, purpose: 'login' | 'link' = 'login', cookies: string[] = [], token?: string) => {
    const res = await post(purpose === 'login' ? '/auth/stellar/challenge' : '/account/stellar/challenge', { address: key.publicKey(), ...(purpose === 'link' ? { password: PASSWORD } : {}) }, cookies, token).expect(200);
    return { res, flow: stellarCookie(res, `petsapp_stellar_${purpose}`), input: { challengeId: res.body.challengeId as string, signedTxXdr: stellarSigned(res.body.transaction as string, [key]), signerAddress: key.publicKey() } };
  };
  const email = async (name = 'Email') => {
    const user = await users.create({ email: `${name.toLowerCase()}@example.com`, password: await bcrypt.hash(PASSWORD, 4), name });
    const res = await post('/auth/login', { email: user.email, password: PASSWORD }).expect(201);
    return { user, token: res.body.token as string, cookie: stellarCookie(res, 'petsapp_session') };
  };
  const rejected = async (res: request.Response, status: number, message: string, before: Snapshot, attemptId?: string) => {
    expect.soft(res.status).toBe(status); expect.soft(stellarCookies(res)).toHaveLength(0);
    if (res.status === status) expect.soft(res.body).toEqual({ statusCode: status, message, ...(status === 429 || (status === 401 && message === 'Unauthorized') ? {} : { error: ({ 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 409: 'Conflict', 503: 'Service Unavailable' } as Record<number,string>)[status] }) });
    const expected = structuredClone(before);
    if (attemptId) expected.stellar_auth_challenges.find(row => row.id === attemptId)!.failed_attempts = Number(expected.stellar_auth_challenges.find(row => row.id === attemptId)!.failed_attempts) + 1;
    expect.soft(await snapshot()).toEqual(expected);
  };

  it('returns only profile and an operational HttpOnly cookie after commit, with a signed method and no public JWT', async () => {
    const c = await challenge();
    const res = await post('/auth/stellar/verify', c.input, [c.flow]).expect(200);
    expect.soft(stellarCookies(res)).toHaveLength(1);
    expect.soft(Object.hasOwn(res.body, 'token')).toBe(false);
    expect.soft(res.body.user).toMatchObject({ email: null, role: 'member', roles: ['member'], name: 'Freighter user', country: null });
    if (stellarCookies(res).length) {
      const session = stellarCookie(res, 'petsapp_session');
      const claims = jwt.verify(session.slice('petsapp_session='.length));
      expect(claims).toMatchObject({ sub: res.body.user.id, email: null, method: 'stellar' });
      await request(app.getHttpServer()).get('/auth/profile').set('Cookie', session).expect(200, res.body.user);
      await request(app.getHttpServer()).get('/users/me').set('Cookie', session).expect(200);
      await post('/auth/logout', {}, [session]).expect(204);
    }
    const state = await snapshot();
    for (const table of ['users', 'user_stellar_identities', 'user_roles', 'user_coin_balances']) expect(state[table]).toHaveLength(1);
    expect(state.user_coin_balances[0].balance).toBe(0); expect(state.pet_states).toEqual([]);
    expect(state.stellar_auth_challenges[0].consumed_at).not.toBeNull();
  });

  it('rejects foreign-origin public challenge and verify before any cookie, counter or identity mutation', async () => {
    let before = await snapshot();
    await rejected(await post('/auth/stellar/challenge', { address: client.publicKey() }, [], undefined, 'https://foreign.example'), 403, 'Origin not allowed', before);
    const c = await challenge(); before = await snapshot();
    await rejected(await post('/auth/stellar/verify', c.input, [c.flow], undefined, 'https://foreign.example'), 403, 'Origin not allowed', before);
  });

  it('requires an explicit user JWT on account routes even when the global guard admits internal clients', async () => {
    const before = await snapshot();
    for (const [method, path, body] of [['get', '/account/stellar', {}], ['post', '/account/stellar/challenge', { address: client.publicKey() }], ['post', '/account/stellar/verify', { challengeId: '00000000-0000-4000-8000-000000000010', signedTxXdr: 'YQ==', signerAddress: client.publicKey() }]] as const) {
      const res = await request(app.getHttpServer())[method](path).set('X-Client-Secret', 'synthetic-internal-secret').set('Origin', ORIGIN).send(body);
      await rejected(res, 401, 'Unauthorized', before);
    }
  });

  it('origin-checks private linking POSTs with Bearer as well as cookie sessions', async () => {
    const e = await email(); const before = await snapshot();
    await rejected(await post('/account/stellar/challenge', { address: client.publicKey(), password: PASSWORD }, [], e.token, 'https://foreign.example'), 403, 'Origin not allowed', before);
  });

  it('returns Retry-After for the shared address limit without writing rejected requests', async () => {
    for (let i = 0; i < 5; i++) await challenge();
    const before = await snapshot(); const res = await post('/auth/stellar/challenge', { address: client.publicKey() });
    await rejected(res, 429, 'Stellar challenge limit reached', before);
    expect.soft(Number(res.headers['retry-after'])).toBeGreaterThan(0); expect.soft(Number(res.headers['retry-after'])).toBeLessThanOrEqual(300);
  });

  it('maps unsupported XDR to 400 without consuming a legitimate crypto attempt', async () => {
    const c = await challenge(); const before = await snapshot();
    await rejected(await post('/auth/stellar/verify', { ...c.input, signedTxXdr: 'YQ==' }, [c.flow]), 400, 'Unsupported Stellar XDR', before);
  });

  it('binds browser and purpose without spending legitimate attempts; rejects replay with no second cookie', async () => {
    const c = await challenge(); const before = await snapshot();
    for (let i = 0; i < 3; i++) await rejected(await post('/auth/stellar/verify', c.input, [`petsapp_stellar_login=${'w'.repeat(43)}`]), 401, 'Invalid Stellar flow', before);
    await rejected(await post('/auth/stellar/verify', c.input), 401, 'Invalid Stellar flow', before);
    const e = await email(); const withEmail = await snapshot();
    await rejected(await post('/account/stellar/verify', c.input, [`petsapp_stellar_link=${c.flow.split('=')[1]}`], e.token), 401, 'Invalid Stellar flow', withEmail);
    const good = await post('/auth/stellar/verify', c.input, [c.flow]).expect(200);
    expect(stellarCookies(good)).toHaveLength(1);
    await rejected(await post('/auth/stellar/verify', c.input, [c.flow]), 409, 'Stellar challenge consumed', await snapshot());
  });

  it('enforces server expiration and replaces only the same browser flow while preserving another browser', async () => {
    const expired = await challenge();
    await fixture.client.query('UPDATE stellar_auth_challenges SET expires_at = now() - interval \'1 millisecond\' WHERE id=$1', [expired.input.challengeId]);
    const beforeExpiry = await snapshot();
    await rejected(await post('/auth/stellar/verify', expired.input, [expired.flow]), 401, 'Invalid or expired Stellar challenge', beforeExpiry);
    const first = await challenge();
    const independent = await challenge();
    const replacement = await challenge(client, 'login', [first.flow]);
    const beforeReplay = await snapshot();
    await rejected(await post('/auth/stellar/verify', first.input, [first.flow]), 409, 'Stellar challenge consumed', beforeReplay);
    const results = await Promise.all([post('/auth/stellar/verify', independent.input, [independent.flow]), post('/auth/stellar/verify', replacement.input, [replacement.flow])]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(results.map(r => r.body.user.id)[0]).toBe(results.map(r => r.body.user.id)[1]);
    expect(results.every(r => stellarCookies(r).length === 1)).toBe(true);
    expect((await snapshot()).users).toHaveLength(1);
  });

  it('reuses the production __Host- cookie policy for both browser flow and committed session', async () => {
    await app.close(); ({ app, jwt } = await stellarHttpTestApp(fixture, { NODE_ENV: 'production' }));
    const issued = await post('/auth/stellar/challenge', { address: client.publicKey() }).expect(200);
    const flow = stellarCookie(issued, '__Host-petsapp_stellar_login');
    const res = await post('/auth/stellar/verify', { challengeId: issued.body.challengeId, signedTxXdr: stellarSigned(issued.body.transaction as string, [client]), signerAddress: client.publicKey() }, [flow]).expect(200);
    const session = stellarCookie(res, '__Host-petsapp_session');
    for (const cookie of [...stellarCookies(issued), ...stellarCookies(res)]) {
      expect(/; Secure(?:;|$)/.test(cookie)).toBe(true); expect(/; HttpOnly(?:;|$)/.test(cookie)).toBe(true);
      expect(/; SameSite=Lax(?:;|$)/.test(cookie)).toBe(true); expect(/; Path=\/(?:;|$)/.test(cookie)).toBe(true); expect(/; Domain=/i.test(cookie)).toBe(false);
    }
    await request(app.getHttpServer()).get('/auth/profile').set('Cookie', session).expect(200, res.body.user);
  });

  it('counts three bad legitimate signatures, never consumes infrastructure failures, and creates no rejected sessions', async () => {
    const c = await challenge();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { status: 503 })));
    await rejected(await post('/auth/stellar/verify', c.input, [c.flow]), 503, 'Stellar verification temporarily unavailable', await snapshot());
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 404 }, { status: 404 })));
    const bad = { ...c.input, signedTxXdr: stellarSigned(c.res.body.transaction as string, [foreign]) };
    for (let i = 0; i < 3; i++) {
      const before = await snapshot();
      await rejected(await post('/auth/stellar/verify', bad, [c.flow]), 401, 'Invalid Stellar proof', before, c.input.challengeId);
    }
    await rejected(await post('/auth/stellar/verify', c.input, [c.flow]), 401, 'Invalid or expired Stellar challenge', await snapshot());
  });

  it('accepts high-threshold weighted signatures but rejects a zero-weight master with no identity or session', async () => {
    const c = await challenge();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ thresholds: { high_threshold: 3 }, signers: [{ key: client.publicKey(), weight: 1, type: 'ed25519_public_key' }, { key: foreign.publicKey(), weight: 2, type: 'ed25519_public_key' }] })));
    const underweight = await snapshot();
    await rejected(await post('/auth/stellar/verify', c.input, [c.flow]), 401, 'Invalid Stellar proof', underweight, c.input.challengeId);
    await post('/auth/stellar/verify', { ...c.input, signedTxXdr: stellarSigned(c.res.body.transaction as string, [client, foreign]) }, [c.flow]).expect(200);
    const second = await challenge(foreign);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ thresholds: { high_threshold: 0 }, signers: [{ key: foreign.publicKey(), weight: 0, type: 'ed25519_public_key' }] })));
    const zeroWeight = await snapshot();
    await rejected(await post('/auth/stellar/verify', second.input, [second.flow]), 401, 'Invalid Stellar proof', zeroWeight, second.input.challengeId);
  });

  it('commits exactly one concurrent verification and rolls back all signup/consumption on a late database error', async () => {
    const c = await challenge();
    const results = await Promise.all([post('/auth/stellar/verify', c.input, [c.flow]), post('/auth/stellar/verify', c.input, [c.flow])]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(results.filter(r => stellarCookies(r).length === 1)).toHaveLength(1);
    expect((await snapshot()).users).toHaveLength(1);
    const next = await challenge(foreign); const before = await snapshot();
    await fixture.client.query('ALTER TABLE user_coin_balances ADD CONSTRAINT fixture_http_reject CHECK (balance > 0) NOT VALID');
    try {
      const res = await post('/auth/stellar/verify', next.input, [next.flow]);
      expect(res.status).toBe(500); expect(stellarCookies(res)).toHaveLength(0); expect(await snapshot()).toEqual(before);
    } finally { await fixture.client.query('ALTER TABLE user_coin_balances DROP CONSTRAINT fixture_http_reject'); }
  });

  it('requires password and recent signed session for linking, binds the exact user/session, and rechecks changed state', async () => {
    const e = await email(); let before = await snapshot();
    await rejected(await post('/account/stellar/challenge', { address: client.publicKey(), password: 'wrong' }, [], e.token), 401, 'Incorrect password', before);
    const stale = jwt.sign({ sub: e.user.id, email: e.user.email, iat: Math.floor(Date.now() / 1000) - 300 });
    await rejected(await post('/account/stellar/challenge', { address: client.publicKey(), password: PASSWORD }, [], stale), 401, 'Recent authentication required', before);
    const c = await challenge(client, 'link', [], e.token); before = await snapshot();
    const otherSession = jwt.sign({ sub: e.user.id, email: e.user.email, sessionNonce: 'different-signed-session' });
    await rejected(await post('/account/stellar/verify', c.input, [c.flow], otherSession), 401, 'Invalid Stellar flow', before);
    const other = await email('Other'); before = await snapshot();
    await rejected(await post('/account/stellar/verify', c.input, [c.flow], other.token), 401, 'Invalid Stellar flow', before);
    await users.update(e.user.id, { isBlocked: true }); before = await snapshot();
    await rejected(await post('/account/stellar/verify', c.input, [c.flow], e.token), 401, 'This account is blocked. Contact an administrator.', before);
    await users.update(e.user.id, { isBlocked: false });
    const res = await post('/account/stellar/verify', c.input, [c.flow], e.token).expect(200);
    expect(res.body).toEqual({ identity: { network: 'testnet', address: client.publicKey() } }); expect(stellarCookies(res)).toHaveLength(0);
    expect(await users.findById(e.user.id)).toEqual(e.user);
  });

  it('links idempotently without merging, replacing or transferring identities and denies wallet admin even after promotion', async () => {
    const e = await email();
    const c = await challenge(client, 'link', [], e.token);
    await post('/account/stellar/verify', c.input, [c.flow], e.token).expect(200);
    const repeated = await challenge(client, 'link', [c.flow], e.token);
    await post('/account/stellar/verify', repeated.input, [repeated.flow], e.token).expect(200);
    const next = await challenge(foreign, 'link', [c.flow], e.token);
    await rejected(await post('/account/stellar/verify', next.input, [next.flow], e.token), 409, 'Stellar identity already linked', await snapshot());
    const other = await email('Other'); const taken = await challenge(client, 'link', [], other.token);
    await rejected(await post('/account/stellar/verify', taken.input, [taken.flow], other.token), 409, 'Stellar identity already linked', await snapshot());
    const login = await challenge(); const signedIn = await post('/auth/stellar/verify', login.input, [login.flow]).expect(200);
    const session = stellarCookie(signedIn, 'petsapp_session'); expect(signedIn.body.user.id).toBe(e.user.id);
    await request(app.getHttpServer()).get('/account/stellar').set('Cookie', session).expect(200, { identity: { network: 'testnet', address: client.publicKey() } });
    await users.update(e.user.id, { role: UserRole.ADMIN });
    const res = await request(app.getHttpServer()).get('/admin/users').set('Cookie', session);
    expect(res.status).toBe(403); expect(stellarCookies(res)).toHaveLength(0);
    await request(app.getHttpServer()).get('/admin/users').set('Authorization', `Bearer ${e.token}`).expect(200);
    const adminChallenge = await challenge();
    await rejected(await post('/auth/stellar/verify', adminChallenge.input, [adminChallenge.flow]), 403, 'Stellar authentication does not permit administrative access', await snapshot());
  });

  it('aggregates IP limits using trusted req.ip rather than forged X-Forwarded-For, storing HMAC keys only', async () => {
    for (let i = 0; i < 30; i++) {
      await post('/auth/stellar/challenge', { address: Keypair.random().publicKey() }).set('X-Forwarded-For', `198.51.100.${i}`).expect(200);
    }
    const before = await snapshot(); const res = await post('/auth/stellar/challenge', { address: client.publicKey() }).set('X-Forwarded-For', '203.0.113.1');
    await rejected(res, 429, 'Stellar challenge limit reached', before);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    const ips = before.stellar_auth_attempts.filter(r => String(r.key).startsWith('ip:'));
    expect(ips).toHaveLength(1); expect(ips[0].count).toBe(30);
    // Supertest may bind IPv4 or IPv6 loopback; neither trusts the supplied header.
    expect(['127.0.0.1', '::1', '::ffff:127.0.0.1'].map(ip => `ip:${stellarHash(HMAC, 'ip', ip)}`)).toContain(ips[0].key);
    expect(before.stellar_auth_attempts.every(r => /^(ip|address):[a-f0-9]{64}$/.test(String(r.key)))).toBe(true);
  });

  it('rejects unsupported input without mutating state, and keeps flags off by default on every new route', async () => {
    let before = await snapshot();
    for (const body of [{ address: 'not-an-address' }, { address: client.publicKey(), user_id: 'client-selected' }, { address: client.publicKey(), network: 'mainnet' }]) {
      const res = await post('/auth/stellar/challenge', body); expect(res.status).toBe(400); expect(stellarCookies(res)).toHaveLength(0); expect(await snapshot()).toEqual(before);
    }
    const c = await challenge(); const e = await email();
    await app.close(); ({ app, jwt } = await stellarHttpTestApp(fixture, { STELLAR_AUTH_ENABLED: 'false' })); before = await snapshot();
    for (const path of ['/auth/stellar/challenge', '/account/stellar/challenge']) await rejected(await post(path, { address: client.publicKey() }, [c.flow], path.startsWith('/account') ? e.token : undefined), 503, 'Stellar authentication unavailable', before);
    await rejected(await post('/auth/stellar/verify', c.input, [c.flow]), 503, 'Stellar authentication unavailable', before);
    await rejected(await post('/account/stellar/verify', c.input, [`petsapp_stellar_link=${'f'.repeat(43)}`], e.token), 503, 'Stellar authentication unavailable', before);
    const res = await request(app.getHttpServer()).get('/account/stellar').set('Authorization', `Bearer ${e.token}`);
    await rejected(res, 503, 'Stellar authentication unavailable', before);
  });
});
