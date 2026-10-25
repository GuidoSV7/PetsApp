import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../../testing/postgres.js';
import { INITIAL_NEEDS, STARTING_COINS, initialSnapshot } from '../pet-rules.js';
import { DrizzlePetRepository } from './drizzle-pet.repository.js';

const GUEST = '22222222-2222-4222-8222-222222222222';

describe('DrizzlePetRepository (PostgreSQL)', () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  afterAll(async () => {
    await testDb.close();
  });

  const fresh = async () => {
    await testDb.client.query('TRUNCATE pet_states RESTART IDENTITY CASCADE');
    return new DrizzlePetRepository(testDb.db);
  };

  it('returns null when guest has no row', async () => {
    const repo = await fresh();
    expect(await repo.findByGuestKey(GUEST)).toBeNull();
  });

  it('creates and reads a pet state row', async () => {
    const repo = await fresh();
    const created = await repo.create(GUEST, initialSnapshot());
    expect(created.guestKey).toBe(GUEST);
    expect(created.coins).toBe(STARTING_COINS);
    expect(created.needs).toEqual({ ...INITIAL_NEEDS });

    const found = await repo.findByGuestKey(GUEST);
    expect(found?.id).toBe(created.id);
    expect(found?.coat.primary).toBe('#8a8a8e');
  });

  it('updates coins and needs for the same guest', async () => {
    const repo = await fresh();
    await repo.create(GUEST, initialSnapshot());
    const updated = await repo.update(GUEST, {
      coins: 20,
      needs: { hunger: 90, fun: 80, energy: 65, hygiene: 78 },
      coat: {
        primary: '#aabbcc',
        secondary: '#ddeeff',
        accent: '#123456',
      },
      statusKey: 'fed',
      name: 'Luna',
      renameCount: 1,
    });
    expect(updated.coins).toBe(20);
    expect(updated.needs.hunger).toBe(90);
    expect(updated.statusKey).toBe('fed');
    expect(updated.coat.primary).toBe('#aabbcc');
    expect(updated.name).toBe('Luna');
    expect(updated.renameCount).toBe(1);

    const again = await repo.findByGuestKey(GUEST);
    expect(again?.coins).toBe(20);
    expect(again?.statusKey).toBe('fed');
  });
});
