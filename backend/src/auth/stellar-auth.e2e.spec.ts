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
});
