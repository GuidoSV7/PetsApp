import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../../testing/postgres.js';
import { pgErrorCode } from '../../database/pg-error.util.js';
import { DrizzleUserRepository } from './drizzle-user.repository.js';
import { DrizzleWalletUserRepository, createWalletUser, linkWalletIdentity } from './drizzle-wallet-user.repository.js';
import { withUserTransaction } from './user-persistence.js';
import { stellarAuthAttempts, stellarAuthChallenges } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const identity = { network: 'testnet' as const, address: 'G'.repeat(56) };

describe('atomic wallet persistence (PostgreSQL)', () => {
  let fixture: TestDb;
  beforeAll(async () => { fixture = await createTestDb(); });
  afterAll(async () => { await fixture.close(); });
  const fresh = async () => {
    await fixture.client.query('TRUNCATE users,stellar_auth_attempts CASCADE');
    return new DrizzleWalletUserRepository(fixture.db);
  };
  const all = async () => {
    const result: Record<string, unknown> = {};
    for (const table of ['users','user_stellar_identities','roles','user_roles','user_coin_balances','stellar_auth_attempts','stellar_auth_challenges']) {
      result[table] = (await fixture.client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows;
    }
    return result;
  };

  it('commits NULL credentials, unique identity, member and balance zero together, without a pet', async () => {
    const repo = await fresh();
    const user = await repo.create({ ...identity, name: 'Wallet' });
    expect(user).toMatchObject({ email: null, password: null, name: 'Wallet', role: 'member', roles: ['member'], isActive: true, isBlocked: false });
    expect(await repo.findByIdentity(identity)).toEqual(user);
    expect((await fixture.client.query('SELECT user_id,balance FROM user_coin_balances')).rows).toEqual([{ user_id: user.id, balance: 0 }]);
    expect((await fixture.client.query('SELECT * FROM pet_states')).rows).toEqual([]);
    expect((await fixture.client.query('SELECT user_id FROM user_roles')).rows).toEqual([{ user_id: user.id }]);
  });

  it('rolls back every signup row and the outer counter when a real late constraint fails', async () => {
    await fresh();
    const [challenge] = await fixture.db.insert(stellarAuthChallenges).values({
      purpose: 'login', ...identity, transactionHash: 'a'.repeat(64),
      flowHash: 'b'.repeat(64), expiresAt: new Date(Date.now() + 300_000),
    }).returning();
    const before = await all();
    // A real fixture CHECK fails after user/identity/member have been inserted.
    await fixture.client.query('ALTER TABLE user_coin_balances ADD CONSTRAINT fixture_reject_zero CHECK (balance > 0)');
    try {
      const error = await withUserTransaction(fixture.db, async (tx) => {
        await tx.update(stellarAuthChallenges).set({ consumedAt: new Date() }).where(eq(stellarAuthChallenges.id, challenge.id));
        await tx.insert(stellarAuthAttempts).values({ key: 'outer', windowStartedAt: new Date(), expiresAt: new Date(), count: 1 });
        return createWalletUser(tx, { ...identity, name: 'Rollback' });
      }).catch((e: unknown) => e);
      expect(pgErrorCode(error)).toBe('23514');
      expect(await all()).toEqual(before);
    } finally {
      await fixture.client.query('ALTER TABLE user_coin_balances DROP CONSTRAINT fixture_reject_zero');
    }
  });

  it('commits an outer counter and signup together; a later outer error undoes all four', async () => {
    await fresh();
    const before = await all();
    await expect(withUserTransaction(fixture.db, async (tx) => {
      await createWalletUser(tx, { ...identity, name: 'Outer' });
      await tx.insert(stellarAuthAttempts).values({ key: 'outer', windowStartedAt: new Date(), expiresAt: new Date(), count: 1 });
      await tx.insert(stellarAuthAttempts).values({ key: 'outer', windowStartedAt: new Date(), expiresAt: new Date(), count: 2 });
    })).rejects.toThrow();
    expect(await all()).toEqual(before);
    await withUserTransaction(fixture.db, async (tx) => {
      await createWalletUser(tx, { ...identity, name: 'Outer' });
      await tx.insert(stellarAuthAttempts).values({ key: 'outer', windowStartedAt: new Date(), expiresAt: new Date(), count: 1 });
    });
    expect((await fixture.client.query('SELECT count FROM stellar_auth_attempts')).rows).toEqual([{ count: 1 }]);
  });

  it('two independent connections racing signup leave exactly one complete user', async () => {
    const repo = await fresh();
    const results = await Promise.allSettled([repo.create({ ...identity, name: 'A' }), repo.create({ ...identity, name: 'B' })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(pgErrorCode(rejected?.reason)).toBe('23505');
    const state = await all();
    for (const table of ['users','user_stellar_identities','user_roles','user_coin_balances']) expect(state[table]).toHaveLength(1);
  });

  it('links once in an outer transaction without replacing identity and preserves email user defaults', async () => {
    const repo = await fresh();
    const user = await new DrizzleUserRepository(fixture.db).create({ name: 'Email', email: 'existing@example.com', password: 'existing-hash' });
    const linked = await withUserTransaction(fixture.db, (tx) => linkWalletIdentity(tx, user.id, identity));
    expect(linked).toEqual(user);
    expect(await withUserTransaction(fixture.db, (tx) => linkWalletIdentity(tx, user.id, identity))).toEqual(user);
    const before = await all();
    await expect(withUserTransaction(fixture.db, (tx) => linkWalletIdentity(tx, user.id, { ...identity, address: 'A'.repeat(56) }))).rejects.toThrow();
    expect(await all()).toEqual(before);
    expect(await repo.findByIdentity(identity)).toEqual(user);
  });
});
