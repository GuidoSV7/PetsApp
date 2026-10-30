import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { accountPetApp, accountPetSnapshot } from '../account-pet/testing/account-pet-http-test-kit.js';
import { DrizzleAccountPetRepository } from '../account-pet/infrastructure/drizzle-account-pet.repository.js';
import { DrizzlePetRepository } from './infrastructure/drizzle-pet.repository.js';
import { initialSnapshot } from './pet-rules.js';

const colors = { primary: '#112233', secondary: '#445566', accent: '#778899' };
describe('adopted guest HTTP authorization, independent of feature flag', () => {
  let fixture: TestDb;
  let kit: Awaited<ReturnType<typeof accountPetApp>>;
  beforeAll(async () => { fixture = await createTestDb(); kit = await accountPetApp(fixture, { ACCOUNT_PET_ENABLED: 'false' }); });
  afterAll(async () => { try { await kit?.app.close(); } finally { await fixture?.close(); } });
  beforeEach(async () => { await fixture.client.query('TRUNCATE users,pet_states CASCADE'); });

  it.each(['keep_account', 'keep_guest'] as const)('denies GET and every mutation for both current/archived keys after %s without changing any stored column', async choice => {
    const { user } = await kit.owner();
    const guests = new DrizzlePetRepository(fixture.db);
    const repo = new DrizzleAccountPetRepository(fixture.db);
    const account = await guests.create(randomUUID(), { ...initialSnapshot(), coins: 37 });
    await repo.bootstrap(user.id, account.guestKey);
    const device = await guests.create(randomUUID(), { ...initialSnapshot(), coins: 5 });
    const pending = await repo.bootstrap(user.id, device.guestKey);
    await repo.resolve(user.id, pending.operationId!, choice);
    const before = await accountPetSnapshot(fixture);
    const responses = [];
    for (const key of [account.guestKey, device.guestKey]) {
      for (const [method, path, body] of [
        ['get', '/pet/state', undefined],
        ...['feed', 'play', 'sleep', 'bathe', 'pet'].map(action => ['post', `/pet/actions/${action}`, {}]),
        ['post', '/pet/coat', colors], ['post', '/pet/name', { name: 'Luna' }],
      ] as Array<['get' | 'post', string, object | undefined]>) {
        const req = request(kit.app.getHttpServer())[method](path).set('X-Pet-Guest-Key', key);
        const response = await (body ? req.send(body) : req);
        responses.push({ status: response.status, body: response.body });
        expect(await accountPetSnapshot(fixture)).toEqual(before);
      }
    }
    expect(responses).toEqual(Array.from({ length: 16 }, () => ({ status: 403, body: { statusCode: 403, error: 'Forbidden', message: 'GUEST_PET_UNAVAILABLE' } })));
  });
});
