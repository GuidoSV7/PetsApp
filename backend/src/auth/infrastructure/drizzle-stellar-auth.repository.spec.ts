import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { createTestDb, type TestDb } from '../../testing/postgres.js';
import { DrizzleStellarAuthRepository } from './drizzle-stellar-auth.repository.js';
import { DrizzleUserRepository } from '../../users/infrastructure/drizzle-user.repository.js';
import type { NewStellarChallenge, StellarBinding } from '../ports/stellar-auth-repository.port.js';
import { UserRole } from '../../users/enums/user-role.enum.js';

const address = 'G'.repeat(56);
const base = (patch: Partial<NewStellarChallenge> = {}): NewStellarChallenge => ({ purpose: 'login', network: 'testnet', address, transactionHash: 'a'.repeat(64), flowHash: 'b'.repeat(64), userId: null, sessionHash: null, expiresAt: new Date(Date.now() + 300_000), ...patch });
const binding = (patch: Partial<StellarBinding> = {}): StellarBinding => ({ purpose: 'login', flowHash: 'b'.repeat(64), userId: null, sessionHash: null, ...patch });
const limits = { addressKey: 'address:hmac', ipKey: 'ip:hmac' };
const validProof = async () => {};

describe('atomic Stellar authentication repository (PostgreSQL)', () => {
  let f: TestDb;
  let repo: DrizzleStellarAuthRepository;
  beforeAll(async () => { f = await createTestDb(); repo = new DrizzleStellarAuthRepository(f.db); });
  beforeEach(async () => { await f.client.query('TRUNCATE users,stellar_auth_attempts,stellar_auth_challenges CASCADE'); });
  afterAll(async () => { await f.close(); });
  const rows = async (table: string) => (await f.client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows;
  const state = async () => {
    const snapshot: Record<string, unknown> = {};
    for (const table of ['users', 'user_stellar_identities', 'user_roles', 'user_coin_balances', 'stellar_auth_challenges', 'stellar_auth_attempts']) snapshot[table] = await rows(table);
    return snapshot;
  };

  it('confirms wallet user, identity, member, zero balance and consumption together, never a pet', async () => {
    const c = await repo.issue(base(), limits);
    const user = await repo.confirm(c.id, binding(), validProof);
    expect(user).toMatchObject({ name: 'Freighter user', email: null, password: null, roles: ['member'], isActive: true, isBlocked: false });
    for (const table of ['users', 'user_stellar_identities', 'user_roles', 'user_coin_balances']) expect(await rows(table)).toHaveLength(1);
    expect(await rows('user_coin_balances')).toEqual([{ user_id: user.id, balance: 0 }]);
    expect(await repo.identity(user.id)).toEqual({ network: 'testnet', address });
    expect((await rows('stellar_auth_challenges'))[0].consumed_at).not.toBeNull();
    expect(await rows('pet_states')).toEqual([]);
  });

  it('rejects browser/purpose/user/session mismatches without proof calls, counters or row changes', async () => {
    const c = await repo.issue(base(), limits);
    const before = await state();
    for (const wrong of [binding({ flowHash: 'c'.repeat(64) }), binding({ purpose: 'link' }), binding({ userId: '00000000-0000-4000-8000-000000000001' }), binding({ sessionHash: 'd'.repeat(64) })]) {
      let called = false;
      await expect.soft(repo.confirm(c.id, wrong, async () => { called = true; })).rejects.toMatchObject({ status: 401 });
      expect.soft(called).toBe(false);
      expect.soft(await state()).toEqual(before);
    }
  });

  it('rejects expired challenges at the server-time boundary without mutation', async () => {
    const c = await repo.issue(base({ expiresAt: new Date(Date.now() - 1) }), limits);
    const before = await state();
    await expect(repo.confirm(c.id, binding(), validProof)).rejects.toMatchObject({ status: 401 });
    expect(await state()).toEqual(before);
  });

  it('allows one concurrent consumption and never issues another user or success after replay', async () => {
    const c = await repo.issue(base(), limits);
    const otherInstance = new DrizzleStellarAuthRepository(f.db);
    const result = await Promise.allSettled([repo.confirm(c.id, binding(), validProof), otherInstance.confirm(c.id, binding(), validProof)]);
    expect(result.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = result.find(r => r.status === 'rejected');
    expect(rejected?.reason).toMatchObject({ status: 409 });
    const before = await state();
    await expect(repo.confirm(c.id, binding(), validProof)).rejects.toMatchObject({ status: 409 });
    expect(await state()).toEqual(before);
    for (const table of ['users', 'user_stellar_identities', 'user_roles', 'user_coin_balances']) expect(await rows(table)).toHaveLength(1);
  });

  it('replaces only a pending same-browser/address/purpose flow', async () => {
    const a = await repo.issue(base(), limits);
    const b = await repo.issue(base({ flowHash: 'c'.repeat(64) }), limits);
    const replacement = await repo.issue(base(), limits);
    await expect.soft(repo.confirm(a.id, binding(), validProof)).rejects.toMatchObject({ status: 409 });
    await expect.soft(repo.confirm(b.id, binding({ flowHash: 'c'.repeat(64) }), validProof)).resolves.toHaveProperty('id');
    await expect.soft(repo.confirm(replacement.id, binding(), validProof)).resolves.toHaveProperty('id');
    expect(await rows('users')).toHaveLength(1);
  });

  it('counts exactly three legitimate bad signatures; wrong browsers and infrastructure failures do not spend crypto attempts', async () => {
    const c = await repo.issue(base(), limits);
    const before = await state();
    await expect(repo.confirm(c.id, binding(), async () => { throw new ServiceUnavailableException('temporary'); })).rejects.toMatchObject({ status: 503 });
    expect(await state()).toEqual(before);
    for (let attempt = 1; attempt <= 3; attempt++) {
      await expect.soft(repo.confirm(c.id, binding(), async () => { throw new UnauthorizedException('invalid proof'); })).rejects.toMatchObject({ status: 401 });
      expect.soft((await rows('stellar_auth_challenges'))[0].failed_attempts).toBe(attempt);
      for (const table of ['users', 'user_stellar_identities', 'user_roles', 'user_coin_balances']) expect.soft(await rows(table)).toEqual([]);
    }
    const exhausted = await state();
    let called = false;
    await expect.soft(repo.confirm(c.id, binding(), async () => { called = true; })).rejects.toMatchObject({ status: 401 });
    expect.soft(called).toBe(false);
    expect.soft(await state()).toEqual(exhausted);
  });

  it('rolls back consumption and every signup row if zero-balance insertion fails late', async () => {
    const c = await repo.issue(base(), limits);
    const before = await state();
    await f.client.query('ALTER TABLE user_coin_balances ADD CONSTRAINT fixture_t2_reject CHECK (balance > 0)');
    try {
      await expect(repo.confirm(c.id, binding(), validProof)).rejects.toThrow();
      expect(await state()).toEqual(before);
    } finally { await f.client.query('ALTER TABLE user_coin_balances DROP CONSTRAINT fixture_t2_reject'); }
  });

  it('shares the address five/5min limit across instances and purposes with Retry-After, without inserting a rejected challenge', async () => {
    const user = await new DrizzleUserRepository(f.db).create({ name: 'Email', email: 'rate@example.com', password: 'hash' });
    for (let i = 0; i < 5; i++) {
      await new DrizzleStellarAuthRepository(f.db).issue(base({ flowHash: String(i).repeat(64), ...(i % 2 ? { purpose: 'link', userId: user.id, sessionHash: 's'.repeat(64) } : {}) }), limits);
    }
    const before = await state();
    const error = await repo.issue(base(), limits).catch((e: unknown) => e);
    expect.soft(error).toMatchObject({ status: 429, retryAfter: expect.any(Number) });
    expect.soft(await state()).toEqual(before);
  });

  it('shares IP thirty/5min across addresses and resets expired volume windows', async () => {
    for (let i = 0; i < 30; i++) await repo.issue(base({ address: `G${String(i).padStart(55,'0')}` }), { addressKey: `address:${i}`, ipKey: limits.ipKey });
    const before = await state();
    await expect.soft(repo.issue(base(), { addressKey: 'new-address', ipKey: limits.ipKey })).rejects.toMatchObject({ status: 429, retryAfter: expect.any(Number) });
    expect.soft(await state()).toEqual(before);
    await f.client.query("UPDATE stellar_auth_attempts SET expires_at = now() - interval '1 second'");
    await expect(repo.issue(base(), limits)).resolves.toHaveProperty('id');
  });

  it('rechecks link user state, current roles, recent session; enforces identity uniqueness and idempotence without credential changes', async () => {
    const users = new DrizzleUserRepository(f.db);
    const user = await users.create({ name: 'Email', email: 'link@example.com', password: 'hash' });
    const link = binding({ purpose: 'link', userId: user.id, sessionHash: 's'.repeat(64), recentUntil: Date.now() + 300_000 });
    const challenge = () => repo.issue(base({ purpose: 'link', userId: user.id, sessionHash: link.sessionHash }), limits);
    for (const patch of [{ isBlocked: true }, { isActive: false }, { role: UserRole.ADMIN }]) {
      const c = await challenge();
      await users.update(user.id, patch);
      const before = await state();
      await expect.soft(repo.confirm(c.id, link, validProof)).rejects.toMatchObject({ status: patch.role ? 403 : 401 });
      expect.soft(await state()).toEqual(before);
      await users.update(user.id, { isBlocked: false, isActive: true, role: UserRole.MEMBER });
    }
    const c = await challenge(); const before = await state();
    await expect.soft(repo.confirm(c.id, { ...link, recentUntil: Date.now() - 1 }, validProof)).rejects.toMatchObject({ status: 401 });
    expect.soft(await state()).toEqual(before);
    await expect.soft(repo.confirm(c.id, link, validProof)).resolves.toEqual(user);
    const repeated = await challenge();
    await expect.soft(repo.confirm(repeated.id, link, validProof)).resolves.toEqual(user);
    expect(await rows('user_stellar_identities')).toHaveLength(1);
    expect(await users.findById(user.id)).toEqual(user);
  });

  it('retains identity/users and performs at most 100 expired-row deletions per transient table per issuance', async () => {
    const user = await repo.confirm((await repo.issue(base(), limits)).id, binding(), validProof);
    await f.client.query("INSERT INTO stellar_auth_attempts(key,window_started_at,expires_at,count) SELECT 'expired:'||i, now()-interval '1 hour', now()-interval '1 hour',1 FROM generate_series(1,250) i");
    await f.client.query("INSERT INTO stellar_auth_challenges(purpose,network,address,transaction_hash,flow_hash,expires_at) SELECT 'login','testnet','old','old','old',now()-interval '1 hour' FROM generate_series(1,250)");
    await repo.issue(base(), limits);
    expect.soft((await f.client.query("SELECT count(*)::int AS n FROM stellar_auth_attempts WHERE key LIKE 'expired:%'")).rows[0].n).toBe(150);
    expect.soft((await f.client.query("SELECT count(*)::int AS n FROM stellar_auth_challenges WHERE address='old'")).rows[0].n).toBe(150);
    expect(await repo.identity(user.id)).toEqual({ network: 'testnet', address });
    expect(await rows('users')).toHaveLength(1);
  });
});
