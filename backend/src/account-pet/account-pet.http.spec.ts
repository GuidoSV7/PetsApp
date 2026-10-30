import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { databaseUrl, readTestUrl } from '../testing/postgres-lifecycle.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzlePetRepository } from '../pet/infrastructure/drizzle-pet.repository.js';
import { initialSnapshot, applyCare, applyCoat, applyRename } from '../pet/pet-rules.js';
import { DrizzleAccountPetRepository } from './infrastructure/drizzle-account-pet.repository.js';
import { accountPetApp, accountPetSnapshot, INTERNAL_SECRET, ORIGIN } from './testing/account-pet-http-test-kit.js';

const colors = { primary: '#112233', secondary: '#445566', accent: '#778899' };
const error = (statusCode: number, label: string, message: unknown) => ({ statusCode, error: label, message });

describe('account pet HTTP using real AppModule, guards, cookies, validation and PostgreSQL', () => {
  let fixture: TestDb;
  let kit: Awaited<ReturnType<typeof accountPetApp>>;
  let owner: Awaited<ReturnType<typeof kit.owner>>;
  beforeAll(async () => { fixture = await createTestDb(); kit = await accountPetApp(fixture); });
  afterAll(async () => { try { await kit?.app.close(); } finally { await fixture?.close(); } });
  beforeEach(async () => { await fixture.client.query('TRUNCATE users,pet_states CASCADE'); owner = await kit.owner(); });
  function http(method: 'get' | 'post', path: string, body?: object, cookie = owner.cookie) {
    const req = request(kit.app.getHttpServer())[method](path).set('Cookie', cookie).set('Origin', ORIGIN);
    return body ? req.send(body) : req;
  }
  async function rejected(method: 'get' | 'post', path: string, body: object | undefined, status: number, expected: object, cookie = owner.cookie) {
    const before = await accountPetSnapshot(fixture);
    const response = await http(method, path, body, cookie);
    expect(await accountPetSnapshot(fixture)).toEqual(before);
    expect({ status: response.status, body: response.body }).toEqual({ status, body: expected });
    expect(response.headers['set-cookie']).toBeUndefined();
  }
  async function conflict() {
    const guests = new DrizzlePetRepository(fixture.db);
    const repo = new DrizzleAccountPetRepository(fixture.db);
    const account = await guests.create(randomUUID(), { ...initialSnapshot(), coins: 37, name: 'Account', renameCount: 2 });
    await repo.bootstrap(owner.user.id, account.guestKey);
    const device = await guests.create(randomUUID(), { ...initialSnapshot(), coins: 5, name: 'Device', coat: { ...initialSnapshot().coat, pattern: 'calico' } });
    return { account, device, repo, guests };
  }

  it('GET before bootstrap is 404 and never initializes', async () => {
    await rejected('get', '/account/pet/state', undefined, 404, error(404, 'Not Found', 'PET_NOT_INITIALIZED'));
  });

  it.each([0, 5, 37])('adopts same UUID and every stored pet column, canonical balance %s, with no private fields', async coins => {
    const pet = await new DrizzlePetRepository(fixture.db).create(randomUUID(), { ...initialSnapshot(), coins, name: 'Legacy', renameCount: 3 });
    const before = await accountPetSnapshot(fixture);
    const result = await http('post', '/account/pet/claim-guest', { guestKey: pet.guestKey });
    const after = await accountPetSnapshot(fixture);
    expect(after.pet_states).toEqual(before.pet_states);
    expect(after.user_pet_ownership).toEqual([expect.objectContaining({ user_id: owner.user.id, pet_id: pet.id, status: 'current' })]);
    expect(after.user_coin_entries).toEqual([expect.objectContaining({ pet_id: pet.id, amount: coins })]);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ status: 'confirmed', operationId: expect.any(String), petId: pet.id, coins });
    const state = await http('get', '/account/pet/state');
    expect(state.status).toBe(200);
    expect(state.body).toEqual({ ...initialSnapshot(), coins, name: 'Legacy', renameCount: 3, mood: 'Feliz' });
    expect((await http('get', `/account/pet/claims/${result.body.operationId}`)).body).toEqual(result.body);
  });

  it('neither creates a private zero-balance pet; current/no guest reuses it without writes', async () => {
    const created = await http('post', '/account/pet/claim-guest', {});
    expect(created.status).toBe(200);
    expect(created.body).toEqual({ status: 'confirmed', petId: expect.any(String), coins: 0 });
    const before = await accountPetSnapshot(fixture);
    expect(before.pet_states).toHaveLength(1);
    expect(before.user_coin_entries).toEqual([]);
    expect((await http('post', '/account/pet/claim-guest', { guestKey: randomUUID() })).body).toEqual(created.body);
    expect(await accountPetSnapshot(fixture)).toEqual(before);
    expect((await http('get', '/account/pet/state')).body).toEqual({ ...initialSnapshot(), mood: 'Feliz' });
  });

  it('no choice returns durable server-found conflict options and changes only pending metadata', async () => {
    const { account, device } = await conflict();
    const before = await accountPetSnapshot(fixture);
    const pending = await http('post', '/account/pet/claim-guest', { guestKey: device.guestKey });
    const after = await accountPetSnapshot(fixture);
    expect({ ...after, pet_claim_operations: before.pet_claim_operations }).toEqual(before);
    expect(after.pet_claim_operations).toHaveLength(before.pet_claim_operations.length + 1);
    expect(pending.status).toBe(409);
    expect(pending.body).toEqual({ statusCode: 409, error: 'Conflict', message: 'PET_CONFLICT', operationId: expect.any(String), options: { keep_account: { petId: account.id }, keep_guest: { petId: device.id } } });
    const operationId = pending.body.operationId;
    expect((await http('get', `/account/pet/claims/${operationId}`)).body).toEqual({ status: 'pending', operationId });
    expect((await http('post', '/account/pet/claim-guest', { guestKey: device.guestKey })).body).toEqual(pending.body);
    expect(await accountPetSnapshot(fixture)).toEqual(after);
  });

  it.each(['keep_account', 'keep_guest'] as const)('%s keeps both full rows, archives one, credits 37+5 once, and replays exact decision/status', async choice => {
    const { account, device, repo } = await conflict();
    // T3 prepares a valid operation so a missing T4 resolution rule, not a missing route, is exercised.
    const pending = await repo.bootstrap(owner.user.id, device.guestKey);
    const pets = (await accountPetSnapshot(fixture)).pet_states;
    const result = await http('post', '/account/pet/claim-guest', { operationId: pending.operationId, choice });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ status: 'confirmed', operationId: pending.operationId, petId: choice === 'keep_account' ? account.id : device.id, coins: 42 });
    const after = await accountPetSnapshot(fixture);
    expect(after.pet_states).toEqual(pets);
    expect(after.user_pet_ownership.filter(row => row.status === 'current')).toEqual([expect.objectContaining({ pet_id: result.body.petId })]);
    expect(after.user_pet_ownership.filter(row => row.status === 'archived')).toEqual([expect.objectContaining({ archive_reason: choice, archive_operation_id: pending.operationId })]);
    expect(after.user_coin_balances).toEqual([expect.objectContaining({ balance: 42 })]);
    expect(after.user_coin_entries).toHaveLength(2);
    expect((await http('post', '/account/pet/claim-guest', { operationId: pending.operationId, choice })).body).toEqual(result.body);
    expect((await http('get', `/account/pet/claims/${pending.operationId}`)).body).toEqual(result.body);
    expect(await accountPetSnapshot(fixture)).toEqual(after);
    await rejected('post', '/account/pet/claim-guest', { operationId: pending.operationId, choice: choice === 'keep_guest' ? 'keep_account' : 'keep_guest' }, 409, error(409, 'Conflict', 'PET_OPERATION_DECISION_MISMATCH'));
  });

  it('status exposes only minimal own pending metadata', async () => {
    const { device, repo } = await conflict();
    const pending = await repo.bootstrap(owner.user.id, device.guestKey);
    const before = await accountPetSnapshot(fixture);
    const result = await http('get', `/account/pet/claims/${pending.operationId}`);
    expect(await accountPetSnapshot(fixture)).toEqual(before);
    expect({ status: result.status, body: result.body }).toEqual({ status: 200, body: { status: 'pending', operationId: pending.operationId } });
  });

  it('a different already-confirmed decision rejects with 409 without mutation', async () => {
    const { device, repo } = await conflict();
    const pending = await repo.bootstrap(owner.user.id, device.guestKey);
    await repo.resolve(owner.user.id, pending.operationId!, 'keep_account');
    await rejected('post', '/account/pet/claim-guest', { operationId: pending.operationId, choice: 'keep_guest' }, 409, error(409, 'Conflict', 'PET_OPERATION_DECISION_MISMATCH'));
  });

  it('a stale pair rejects with 409 without partial effects', async () => {
    const { device, repo, guests } = await conflict();
    const pending = await repo.bootstrap(owner.user.id, device.guestKey);
    const third = await guests.create(randomUUID(), initialSnapshot());
    const next = await repo.bootstrap(owner.user.id, third.guestKey);
    await repo.resolve(owner.user.id, next.operationId!, 'keep_guest');
    await rejected('post', '/account/pet/claim-guest', { operationId: pending.operationId, choice: 'keep_account' }, 409, error(409, 'Conflict', 'PET_CONFLICT_STALE'));
  });

  it('a foreign adopted key rejects without disclosure or transfer', async () => {
    const { device, repo } = await conflict();
    const pending = await repo.bootstrap(owner.user.id, device.guestKey);
    await repo.resolve(owner.user.id, pending.operationId!, 'keep_guest');
    const other = await kit.owner('Other');
    await rejected('post', '/account/pet/claim-guest', { guestKey: device.guestKey }, 403, error(403, 'Forbidden', 'PET_UNAVAILABLE'), other.cookie);
  });

  it('rejects incomplete choices, mixed bootstrap/decision and client authority without mutation', async () => {
    for (const body of [{ choice: 'keep_guest' }, { operationId: randomUUID() }, { operationId: randomUUID(), choice: 'keep_guest', guestKey: randomUUID() }]) {
      await rejected('post', '/account/pet/claim-guest', body, 400, error(400, 'Bad Request', 'INVALID_PET_CLAIM'));
    }
    await rejected('post', '/account/pet/claim-guest', { operationId: randomUUID(), choice: 'invalid' }, 400, error(400, 'Bad Request', ['choice must be one of the following values: keep_account, keep_guest']));
    for (const [field, message] of [['guestKey', 'guestKey must be a UUID'], ['operationId', 'operationId must be a UUID']] as const) {
      for (const value of [null, 'invalid']) await rejected('post', '/account/pet/claim-guest', { [field]: value }, 400, error(400, 'Bad Request', [message]));
    }
    for (const field of ['owner', 'userId', 'petId', 'coins', 'snapshot']) {
      await rejected('post', '/account/pet/claim-guest', { [field]: 1 }, 400, error(400, 'Bad Request', [`property ${field} should not exist`]));
    }
  });

  it('foreign operations/keys and stale pairs reject without disclosure or partial changes', async () => {
    const { device, repo, guests } = await conflict();
    const pending = await repo.bootstrap(owner.user.id, device.guestKey);
    const other = await kit.owner('Other');
    await rejected('get', `/account/pet/claims/${pending.operationId}`, undefined, 403, error(403, 'Forbidden', 'PET_OPERATION_UNAVAILABLE'), other.cookie);
    await rejected('post', '/account/pet/claim-guest', { operationId: pending.operationId, choice: 'keep_guest' }, 403, error(403, 'Forbidden', 'PET_OPERATION_UNAVAILABLE'), other.cookie);
    const third = await guests.create(randomUUID(), initialSnapshot());
    const next = await repo.bootstrap(owner.user.id, third.guestKey);
    await repo.resolve(owner.user.id, next.operationId!, 'keep_guest');
    await rejected('post', '/account/pet/claim-guest', { operationId: pending.operationId, choice: 'keep_account' }, 409, error(409, 'Conflict', 'PET_CONFLICT_STALE'));
    await rejected('post', '/account/pet/claim-guest', { guestKey: third.guestKey }, 403, error(403, 'Forbidden', 'PET_UNAVAILABLE'), other.cookie);
  });

  it('current coat applies pattern and colors', async () => {
    await new DrizzleAccountPetRepository(fixture.db).bootstrap(owner.user.id);
    const response = await http('post', '/account/pet/coat', { ...colors, pattern: 'calico' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ...initialSnapshot(), coat: { ...colors, pattern: 'calico' }, statusKey: 'coated', mood: 'Feliz' });
  });

  it('current rename applies existing free name rules and increments once', async () => {
    await new DrizzleAccountPetRepository(fixture.db).bootstrap(owner.user.id);
    const response = await http('post', '/account/pet/name', { name: ' Luna ' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ...initialSnapshot(), name: 'Luna', renameCount: 1, statusKey: 'renamed', mood: 'Feliz' });
  });

  it('null pattern is rejected even though the existing DTO marks pattern optional', async () => {
    await new DrizzleAccountPetRepository(fixture.db).bootstrap(owner.user.id);
    await rejected('post', '/account/pet/coat', { ...colors, pattern: null }, 400, error(400, 'Bad Request', 'Unknown coat pattern'));
  });

  it('invalid or unchanged names reject without mutation', async () => {
    await new DrizzleAccountPetRepository(fixture.db).bootstrap(owner.user.id);
    for (const name of [' ', 'Michi']) await rejected('post', '/account/pet/name', { name }, 400, error(400, 'Bad Request', 'Invalid pet name'));
  });

  it.each([0, 5, 37])('current care/coat/name match guest rules at legacy %s without coin/ledger/archive overwrite', async coins => {
    const { account, device, repo } = await conflict();
    const pending = await repo.bootstrap(owner.user.id, device.guestKey);
    await repo.resolve(owner.user.id, pending.operationId!, 'keep_account');
    await fixture.client.query("UPDATE pet_states SET coins=$1,status_key='broke' WHERE id=$2", [coins, account.id]);
    const before = await accountPetSnapshot(fixture);
    const initial = { ...initialSnapshot(), coins: 42, name: 'Account', renameCount: 2 };
    expect((await http('get', '/account/pet/state')).body).toEqual({ ...initial, mood: 'Feliz' });
    let expected = initial;
    for (const action of ['feed', 'play', 'sleep', 'bathe', 'pet'] as const) {
      expected = applyCare(expected, action).snapshot;
      const response = await http('post', `/account/pet/actions/${action}`, {});
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ ...expected, mood: 'Feliz' });
    }
    expected = applyCoat(expected, { ...colors, pattern: 'pointed' });
    expect((await http('post', '/account/pet/coat', { ...colors, pattern: 'pointed' })).body).toEqual({ ...expected, mood: 'Feliz' });
    expected = applyCoat(expected, colors);
    expect((await http('post', '/account/pet/coat', colors)).body).toEqual({ ...expected, mood: 'Feliz' });
    expected = applyRename(expected, ' Luna ').snapshot;
    expect((await http('post', '/account/pet/name', { name: ' Luna ' })).body).toEqual({ ...expected, mood: 'Feliz' });
    const after = await accountPetSnapshot(fixture);
    expect(after.pet_states.find(row => row.id === device.id)).toEqual(before.pet_states.find(row => row.id === device.id));
    expect(after.pet_states.find(row => row.id === account.id)?.coins).toBe(coins);
    for (const table of Object.keys(before).filter(table => table !== 'pet_states')) expect(after[table]).toEqual(before[table]);
    await rejected('post', '/account/pet/coat', { ...colors, pattern: null }, 400, error(400, 'Bad Request', 'Unknown coat pattern'));
    await rejected('post', '/account/pet/name', { name: 'Luna' }, 400, error(400, 'Bad Request', 'Invalid pet name'));
    await rejected('post', '/account/pet/actions/dance', {}, 400, error(400, 'Bad Request', 'Unknown care action: dance'));
  });

  it.each([0, 5, 37])('canonical %s remains unchanged through repeated free care, coat and rename', async coins => {
    const pet = await new DrizzlePetRepository(fixture.db).create(randomUUID(), { ...initialSnapshot(), coins });
    await new DrizzleAccountPetRepository(fixture.db).bootstrap(owner.user.id, pet.guestKey);
    const before = await accountPetSnapshot(fixture);
    let expected = { ...initialSnapshot(), coins };
    for (const action of ['feed', 'feed', 'play', 'sleep', 'bathe', 'pet'] as const) {
      expected = applyCare(expected, action).snapshot;
      const response = await http('post', `/account/pet/actions/${action}`, {});
      expect({ status: response.status, body: response.body }).toEqual({ status: 201, body: { ...expected, mood: 'Feliz' } });
    }
    expected = applyCoat(expected, { ...colors, pattern: 'calico' });
    expect((await http('post', '/account/pet/coat', { ...colors, pattern: 'calico' })).body).toEqual({ ...expected, mood: 'Feliz' });
    expected = applyRename(expected, 'Luna').snapshot;
    expect((await http('post', '/account/pet/name', { name: 'Luna' })).body).toEqual({ ...expected, mood: 'Feliz' });
    expect((await http('get', '/account/pet/state')).body).toEqual({ ...expected, mood: 'Feliz' });
    const after = await accountPetSnapshot(fixture);
    expect(after.pet_states[0].coins).toBe(coins);
    for (const table of Object.keys(before).filter(table => table !== 'pet_states')) expect(after[table]).toEqual(before[table]);
  });

  it('development-open global guard still requires a real JWT on every private route', async () => {
    const before = await accountPetSnapshot(fixture);
    const previous = { NODE_ENV: kit.values.NODE_ENV, CLIENT_SECRET: kit.values.CLIENT_SECRET };
    kit.values.NODE_ENV = 'development'; kit.values.CLIENT_SECRET = undefined;
    try {
      for (const [method, path, body] of [
        ['get', '/account/pet/state', undefined], ['get', `/account/pet/claims/${randomUUID()}`, undefined],
        ['post', '/account/pet/claim-guest', {}], ['post', '/account/pet/actions/feed', {}],
        ['post', '/account/pet/coat', colors], ['post', '/account/pet/name', { name: 'Luna' }],
      ] as Array<['get' | 'post', string, object | undefined]>) {
        const req = request(kit.app.getHttpServer())[method](path);
        const response = await (body ? req.send(body) : req);
        expect({ status: response.status, body: response.body }).toEqual({ status: 401, body: { statusCode: 401, message: 'Unauthorized' } });
        expect(await accountPetSnapshot(fixture)).toEqual(before);
      }
    } finally { Object.assign(kit.values, previous); }
  });

  it('a valid Bearer chooses its own current pet ahead of another owner cookie', async () => {
    const other = await kit.owner('Other');
    const repo = new DrizzleAccountPetRepository(fixture.db);
    await repo.bootstrap(owner.user.id); await repo.bootstrap(other.user.id);
    await repo.mutateCurrent(other.user.id, { kind: 'rename', name: 'OtherPet' });
    const before = await accountPetSnapshot(fixture);
    const result = await request(kit.app.getHttpServer()).get('/account/pet/state').set('Cookie', owner.cookie).set('Authorization', `Bearer ${other.token}`);
    expect({ status: result.status, body: result.body }).toEqual({ status: 200, body: { ...initialSnapshot(), name: 'OtherPet', renameCount: 1, statusKey: 'renamed', mood: 'Feliz' } });
    expect(await accountPetSnapshot(fixture)).toEqual(before);
  });

  it('there are no archive/list/activate/restore self-service routes', async () => {
    for (const [method, path] of [['get', '/account/pet/archive'], ['get', '/account/pet'], ['post', '/account/pet/activate'], ['post', '/account/pet/restore']] as const) {
      await rejected(method, path, method === 'post' ? {} : undefined, 404, error(404, 'Not Found', `Cannot ${method.toUpperCase()} ${path}`));
    }
  });

  it('internal secret never substitutes for JWT; Origin and Bearer precedence are preserved', async () => {
    const before = await accountPetSnapshot(fixture);
    const internal = await request(kit.app.getHttpServer()).get('/account/pet/state').set('X-Client-Secret', INTERNAL_SECRET);
    expect(await accountPetSnapshot(fixture)).toEqual(before);
    expect({ status: internal.status, body: internal.body }).toEqual({ status: 401, body: { statusCode: 401, message: 'Unauthorized' } });
    const foreign = await request(kit.app.getHttpServer()).post('/account/pet/claim-guest').set('Cookie', owner.cookie).set('Origin', 'https://evil.example').send({});
    expect(foreign.status).toBe(403);
    expect(foreign.body).toEqual(error(403, 'Forbidden', 'Origin not allowed'));
    const bearer = await request(kit.app.getHttpServer()).post('/account/pet/claim-guest').set('Cookie', owner.cookie).set('Origin', ORIGIN).set('Authorization', 'Bearer invalid').send({});
    expect(bearer.status).toBe(401);
    expect(bearer.body).toEqual({ statusCode: 401, message: 'Unauthorized' });
    expect(await accountPetSnapshot(fixture)).toEqual(before);
  });

  it('racing owners and concurrent same-decision retries retain one owner/current and one credit', async () => {
    const other = await kit.owner('Other');
    const pet = await new DrizzlePetRepository(fixture.db).create(randomUUID(), { ...initialSnapshot(), coins: 5 });
    const before = await accountPetSnapshot(fixture);
    const results = await Promise.all([owner.cookie, other.cookie].map(cookie => http('post', '/account/pet/claim-guest', { guestKey: pet.guestKey }, cookie)));
    expect(results.map(result => result.status).toSorted((a, b) => a - b)).toEqual([200, 403]);
    expect(results.find(result => result.status === 403)?.body).toEqual(error(403, 'Forbidden', 'PET_UNAVAILABLE'));
    const after = await accountPetSnapshot(fixture);
    expect(after.pet_states).toEqual(before.pet_states);
    expect(after.user_pet_ownership).toEqual([expect.objectContaining({ pet_id: pet.id, status: 'current' })]);
    expect(after.user_coin_entries).toEqual([expect.objectContaining({ pet_id: pet.id, amount: 5 })]);
    expect(after.user_coin_balances).toEqual([expect.objectContaining({ balance: 5 })]);
    expect(after.pet_claim_operations).toEqual([expect.objectContaining({ user_id: after.user_pet_ownership[0].user_id, guest_pet_id: pet.id, status: 'confirmed' })]);
    for (const table of ['users', 'user_stellar_identities', 'roles', 'user_roles', 'stellar_auth_attempts', 'stellar_auth_challenges']) expect(after[table]).toEqual(before[table]);
    const winner = results[0].status === 200 ? owner : other;
    const device = await new DrizzlePetRepository(fixture.db).create(randomUUID(), { ...initialSnapshot(), coins: 37 });
    const pending = await new DrizzleAccountPetRepository(fixture.db).bootstrap(winner.user.id, device.guestKey);
    const decisions = await Promise.all([1, 2].map(() => http('post', '/account/pet/claim-guest', { operationId: pending.operationId, choice: 'keep_guest' }, winner.cookie)));
    expect(decisions.map(result => result.status)).toEqual([200, 200]);
    expect(decisions[0].body).toEqual(decisions[1].body);
    expect(decisions[0].body).toEqual({ status: 'confirmed', operationId: pending.operationId, petId: device.id, coins: 42 });
    const final = await accountPetSnapshot(fixture);
    expect(final.user_coin_entries).toHaveLength(2);
    expect(final.user_pet_ownership.filter(row => row.status === 'current')).toHaveLength(1);
    expect(final.user_coin_balances).toEqual([expect.objectContaining({ balance: 42 })]);
  });

  it('HTTP adoption and guest writes share a real cross-connection lock and revoke after commit', async () => {
    const pet = await new DrizzlePetRepository(fixture.db).create(randomUUID(), { ...initialSnapshot(), coins: 5 });
    await fixture.client.query('INSERT INTO user_coin_balances (user_id,balance) VALUES ($1,0)', [owner.user.id]);
    const before = await accountPetSnapshot(fixture);
    const name = (await fixture.client.query('SELECT current_database() AS name')).rows[0].name;
    const connection = new pg.Client({ connectionString: databaseUrl(readTestUrl(), name), statement_timeout: 5000 });
    await connection.connect();
    async function blocked(fragment: string) {
      for (let attempt = 0; attempt < 100; attempt++) {
        await connection.query('SELECT pg_stat_clear_snapshot()');
        const result = await connection.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE $1", [`%${fragment}%`]);
        if (result.rowCount) return;
        await delay(10);
      }
      throw new Error(`Expected blocked query ${fragment}`);
    }
    let claim: Promise<request.Response> | undefined;
    let write: Promise<request.Response> | undefined;
    try {
      await connection.query('BEGIN');
      await connection.query('SELECT * FROM user_coin_balances WHERE user_id=$1 FOR UPDATE', [owner.user.id]);
      claim = http('post', '/account/pet/claim-guest', { guestKey: pet.guestKey }).then(value => value);
      await blocked('update "user_coin_balances"');
      write = request(kit.app.getHttpServer()).post('/pet/actions/feed').set('X-Pet-Guest-Key', pet.guestKey).send({}).then(value => value);
      await blocked('from "pet_states"');
      await connection.query('COMMIT');
      const adopted = await claim;
      expect(adopted.status).toBe(200);
      const denied = await write;
      expect({ status: denied.status, body: denied.body }).toEqual({ status: 403, body: error(403, 'Forbidden', 'GUEST_PET_UNAVAILABLE') });
      const after = await accountPetSnapshot(fixture);
      expect(after.pet_states).toEqual(before.pet_states);
      expect(after.user_coin_balances).toEqual([expect.objectContaining({ balance: 5 })]);
      expect(after.user_coin_entries).toEqual([expect.objectContaining({ pet_id: pet.id, amount: 5 })]);
    } finally {
      await connection.query('ROLLBACK');
      await connection.end();
      await claim?.catch(() => undefined);
      await write?.catch(() => undefined);
    }
  });

  it('disabled feature returns generic 503 independently of Stellar config without mutations', async () => {
    const before = await accountPetSnapshot(fixture);
    kit.values.ACCOUNT_PET_ENABLED = undefined;
    try {
      const response = await http('post', '/account/pet/claim-guest', {});
      expect(await accountPetSnapshot(fixture)).toEqual(before);
      expect({ status: response.status, body: response.body }).toEqual({ status: 503, body: error(503, 'Service Unavailable', 'ACCOUNT_PET_DISABLED') });
    } finally { kit.values.ACCOUNT_PET_ENABLED = 'true'; }
  });
});
