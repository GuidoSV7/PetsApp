import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { GOOGLE_TOKEN_VERIFIER, type GoogleTokenVerifier } from '../auth/google-token.verifier.js';
import { DrizzleUserRepository } from '../users/infrastructure/drizzle-user.repository.js';
import request from 'supertest';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { accountPetApp, accountPetSnapshot, ORIGIN } from '../account-pet/testing/account-pet-http-test-kit.js';
import { initialSnapshot, applyCare, applyCoat, applyRename, moodFromNeeds, type PetSnapshot } from './pet-rules.js';

const GUEST = '12345678-1234-4234-8234-123456789012';
const colors = { primary: '#aabbcc', secondary: '#ddeeff', accent: '#112233' };

/** Also executed unchanged against the baseline in external scratch; no git-history dependency. */
describe('unadopted guest public compatibility transcript', () => {
  let fixture: TestDb;
  let kit: Awaited<ReturnType<typeof accountPetApp>>;
  const transcript: unknown[] = [];
  beforeAll(async () => { fixture = await createTestDb(); kit = await accountPetApp(fixture); });
  beforeEach(async () => { await fixture.client.query('TRUNCATE users,pet_states CASCADE'); });
  afterAll(async () => {
    try {
      console.info(`T4_GUEST_TRANSCRIPT_SHA256 ${createHash('sha256').update(JSON.stringify(transcript)).digest('hex')}`);
      console.info(`T4_GUEST_TRANSCRIPT ${JSON.stringify(transcript)}`);
      await kit?.app.close();
    } finally { await fixture?.close(); }
  });
  async function call(method: 'get' | 'post', path: string, body?: object, guest = GUEST) {
    const before = await accountPetSnapshot(fixture);
    const req = request(kit.app.getHttpServer())[method](path).set('X-Pet-Guest-Key', guest);
    const response = await (body ? req.send(body) : req);
    const after = await accountPetSnapshot(fixture);
    // Only random pet UUID and wall-clock values are normalized. Every other
    // column, every row, HTTP status/body and cookie side effect is retained.
    function stored(snapshot: typeof before) {
      return Object.fromEntries(Object.entries(snapshot).map(([table, rows]) => [table, rows.map(row => {
        if (table === 'roles') return { ...row, id: `<role-${String(row.code)}>` };
        if (table !== 'pet_states') return row;
        const { id, created_at, updated_at, ...rest } = row;
        expect(typeof id).toBe('string');
        expect(created_at).toBeInstanceOf(Date);
        expect(updated_at).toBeInstanceOf(Date);
        return { ...rest, id: '<pet-id>', created_at: '<timestamp>', updated_at: '<timestamp>' };
      }).toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
    }
    transcript.push({ method, path, body, guest, status: response.status, response: response.body, cookies: response.headers['set-cookie'] ?? [], before: stored(before), after: stored(after) });
    if (response.status >= 400 || method === 'get' && before.pet_states.length) expect(after).toEqual(before);
    return response;
  }
  const dto = (state: PetSnapshot) => ({ ...state, statusKey: state.statusKey === 'broke' ? 'idle' : state.statusKey, mood: moodFromNeeds(state.needs) });

  it.each([0, 5, 37])('preserves complete state/care/coat/name, validation and legacy broke at %s', async coins => {
    expect((await call('get', '/pet/state')).body).toEqual(dto(initialSnapshot()));
    await fixture.client.query("UPDATE pet_states SET coins=$1,status_key='broke',hunger=10,coat_pattern='calico' WHERE guest_key=$2", [coins, GUEST]);
    let state: PetSnapshot = { ...initialSnapshot(), coins, statusKey: 'broke', needs: { ...initialSnapshot().needs, hunger: 10 }, coat: { ...initialSnapshot().coat, pattern: 'calico' } };
    expect((await call('get', '/pet/state')).body).toEqual(dto(state));
    for (const action of ['feed', 'play', 'sleep', 'bathe', 'pet'] as const) {
      state = applyCare(state, action).snapshot;
      const response = await call('post', `/pet/actions/${action}`, {});
      expect({ status: response.status, body: response.body }).toEqual({ status: 201, body: dto(state) });
    }
    for (const coat of [{ ...colors, pattern: 'pointed' as const }, colors]) {
      state = applyCoat(state, coat);
      const response = await call('post', '/pet/coat', coat);
      expect({ status: response.status, body: response.body }).toEqual({ status: 201, body: dto(state) });
    }
    for (const name of [' Luna ', 'Nube']) {
      state = applyRename(state, name).snapshot;
      const response = await call('post', '/pet/name', { name });
      expect({ status: response.status, body: response.body }).toEqual({ status: 201, body: dto(state) });
    }
    for (const [path, body, message] of [
      ['/pet/actions/dance', {}, 'Unknown care action: dance'],
      ['/pet/name', { name: ' ' }, 'Invalid pet name'],
      ['/pet/name', { name: 'Nube' }, 'Invalid pet name'],
      ['/pet/name', { name: 'a'.repeat(17) }, ['name must be shorter than or equal to 16 characters']],
      ['/pet/coat', { ...colors, pattern: null }, 'Unknown coat pattern'],
      ['/pet/coat', { ...colors, pattern: 'striped' }, ['pattern must be one of the following values: solid, tabby, tuxedo, calico, pointed']],
      ['/pet/coat', { ...colors, extra: 1 }, ['property extra should not exist']],
    ] as const) {
      const response = await call('post', path, body);
      expect({ status: response.status, body: response.body }).toEqual({ status: 400, body: { statusCode: 400, error: 'Bad Request', message } });
    }
    const invalid = await call('get', '/pet/state', undefined, 'invalid');
    expect({ status: invalid.status, body: invalid.body }).toEqual({ status: 400, body: { statusCode: 400, error: 'Bad Request', message: 'X-Pet-Guest-Key must be a valid UUID' } });
    expect((await call('get', '/pet/state')).body).toEqual(dto(state));
  });

  it('preserves initialization by each mutation for absent guest keys', async () => {
    for (const [index, path, body, expected] of [
      [1, '/pet/actions/feed', {}, applyCare(initialSnapshot(), 'feed').snapshot],
      [2, '/pet/coat', colors, applyCoat(initialSnapshot(), colors)],
      [3, '/pet/name', { name: 'Luna' }, applyRename(initialSnapshot(), 'Luna').snapshot],
    ] as const) {
      const key = `12345678-1234-4234-8234-12345678901${index}`;
      const response = await call('post', path, body, key);
      expect({ status: response.status, body: response.body }).toEqual({ status: 201, body: dto(expected) });
    }
  });

  it('preserves all stored auth columns/rows through existing email/Google/profile/logout controls', async () => {
    // A fixed synthetic salt makes stored hashes comparable, without changing
    // production hashing or logging any credential. No external Google call.
    const password = 'synthetic-preservation-password';
    const hash = await bcrypt.hash(password, '$2b$04$abcdefghijklmnopqrstuu');
    const users = new DrizzleUserRepository(fixture.db);
    await users.create({ name: 'Email', email: 'email@example.com', password: hash });
    await users.create({ name: 'Google', email: 'google@example.com', password: hash, isVerified: true });
    const verifier = kit.app.get<GoogleTokenVerifier>(GOOGLE_TOKEN_VERIFIER);
    const spy = vi.spyOn(verifier, 'verify').mockResolvedValue({ sub: 'synthetic-google-subject', email: 'google@example.com', name: 'Google', emailVerified: true });
    const before = await accountPetSnapshot(fixture);
    try {
      for (const [path, body] of [['/auth/login', { email: 'email@example.com', password }], ['/auth/google', { idToken: 'synthetic-google-proof' }]] as const) {
        const response = await request(kit.app.getHttpServer()).post(path).set('Origin', ORIGIN).send(body);
        expect(response.status).toBe(201);
        const cookie = (response.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
        const profile = await request(kit.app.getHttpServer()).get('/auth/profile').set('Cookie', cookie);
        expect({ status: profile.status, body: profile.body }).toEqual({ status: 200, body: response.body.user });
        const logout = await request(kit.app.getHttpServer()).post('/auth/logout').set('Cookie', cookie).set('Origin', ORIGIN).send({});
        expect({ status: logout.status, body: logout.body }).toEqual({ status: 204, body: {} });
        expect(await accountPetSnapshot(fixture)).toEqual(before);
      }
      const labels = new Map<string, string>();
      for (const row of before.users) labels.set(String(row.id), `<user-${String(row.email)}>`);
      for (const row of before.roles) labels.set(String(row.id), `<role-${String(row.code)}>`);
      function normalize(value: unknown): unknown {
        if (value instanceof Date) return '<timestamp>';
        if (typeof value === 'string') return labels.get(value) ?? value;
        if (Array.isArray(value)) return value.map(normalize).toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalize(nested)]));
        return value;
      }
      // Hash the complete normalized storage, including password hashes: never
      // emit credentials. Only UUIDs/timestamps and SQL row order normalize.
      console.info(`T4_AUTH_STORED_SHA256 ${createHash('sha256').update(JSON.stringify(normalize(before))).digest('hex')}`);
    } finally { spy.mockRestore(); }
  });

  it('preserves rejection of null/unknown coat on an absent key without creation', async () => {
    for (const pattern of [null, 'striped']) {
      const response = await call('post', '/pet/coat', { ...colors, pattern });
      expect({ status: response.status, body: response.body }).toEqual({ status: 400, body: {
        statusCode: 400, error: 'Bad Request', message: pattern === null ? 'Unknown coat pattern' : ['pattern must be one of the following values: solid, tabby, tuxedo, calico, pointed'],
      } });
    }
  });
});
