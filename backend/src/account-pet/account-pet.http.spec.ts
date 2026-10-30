import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzlePetRepository } from '../pet/infrastructure/drizzle-pet.repository.js';
import { initialSnapshot } from '../pet/pet-rules.js';
import { DrizzleAccountPetRepository } from './infrastructure/drizzle-account-pet.repository.js';
import { accountPetApp, accountPetSnapshot, INTERNAL_SECRET, ORIGIN } from './testing/account-pet-http-test-kit.js';

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

  it('status exposes only minimal own pending metadata', async () => {
    const { device, repo } = await conflict();
    const pending = await repo.bootstrap(owner.user.id, device.guestKey);
    const before = await accountPetSnapshot(fixture);
    const result = await http('get', `/account/pet/claims/${pending.operationId}`);
    expect(await accountPetSnapshot(fixture)).toEqual(before);
    expect({ status: result.status, body: result.body }).toEqual({ status: 200, body: { status: 'pending', operationId: pending.operationId } });
  });

  it('a foreign adopted key rejects without disclosure or transfer', async () => {
    const { device, repo } = await conflict();
    const pending = await repo.bootstrap(owner.user.id, device.guestKey);
    await repo.resolve(owner.user.id, pending.operationId!, 'keep_guest');
    const other = await kit.owner('Other');
    await rejected('post', '/account/pet/claim-guest', { guestKey: device.guestKey }, 403, error(403, 'Forbidden', 'PET_UNAVAILABLE'), other.cookie);
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
