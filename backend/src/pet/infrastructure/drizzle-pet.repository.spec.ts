import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../../testing/postgres.js';
import {
  INITIAL_NEEDS,
  STARTING_COINS,
  initialSnapshot,
} from '../pet-rules.js';
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
    expect(created.coat).toEqual(initialSnapshot().coat);

    const found = await repo.findByGuestKey(GUEST);
    expect(found?.id).toBe(created.id);
    expect(found?.coat.primary).toBe('#8a8a8e');
  });

  it('round-trips explicit patterns on both create and update', async () => {
    const repo = await fresh();
    const original = initialSnapshot();
    const pointed = {
      ...original,
      coat: { ...original.coat, pattern: 'pointed' as const },
    };
    expect((await repo.create(GUEST, pointed)).coat).toEqual(pointed.coat);
    expect((await repo.findByGuestKey(GUEST))?.coat).toEqual(pointed.coat);
    const calico = {
      ...pointed,
      coat: { ...pointed.coat, pattern: 'calico' as const },
    };
    expect((await repo.update(GUEST, calico)).coat).toEqual(calico.coat);
    expect((await repo.findByGuestKey(GUEST))?.coat).toEqual(calico.coat);
  });

  it('reads a raw zebra value as solid without a repair write', async () => {
    const repo = await fresh();
    await repo.create(GUEST, initialSnapshot());
    await testDb.client.query(
      'UPDATE pet_states SET coat_pattern=$1 WHERE guest_key=$2',
      ['zebra', GUEST],
    );
    const found = await repo.findByGuestKey(GUEST);
    expect(found?.coat).toEqual(initialSnapshot().coat);
    expect(
      (
        await testDb.client.query(
          'SELECT coat_pattern FROM pet_states WHERE guest_key=$1',
          [GUEST],
        )
      ).rows,
    ).toEqual([{ coat_pattern: 'zebra' }]);
  });

  it.each([0, 5, 37])('persists explicit balance %s instead of substituting a default', async (coins) => {
    const repo = await fresh();
    const snapshot = { ...initialSnapshot(), coins };
    const created = await repo.create(GUEST, snapshot);
    expect(created.coins).toBe(coins);
    expect((await repo.findByGuestKey(GUEST))?.coins).toBe(coins);
    const updated = await repo.update(GUEST, { ...snapshot, statusKey: 'petted' });
    expect(updated.coins).toBe(coins);
    expect((await repo.findByGuestKey(GUEST))?.coins).toBe(coins);
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
        pattern: 'solid',
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
