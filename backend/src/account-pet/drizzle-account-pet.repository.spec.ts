import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { databaseUrl, readTestUrl } from '../testing/postgres-lifecycle.js';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzleUserRepository } from '../users/infrastructure/drizzle-user.repository.js';
import { DrizzlePetRepository } from '../pet/infrastructure/drizzle-pet.repository.js';
import { initialSnapshot } from '../pet/pet-rules.js';
import { DrizzleAccountPetRepository } from './infrastructure/drizzle-account-pet.repository.js';

describe('account pet transactions (PostgreSQL)', () => {
  let fixture: TestDb;
  beforeAll(async () => { fixture = await createTestDb(); });
  afterAll(async () => { await fixture.close(); });
  const fresh = async () => {
    await fixture.client.query('TRUNCATE users,pet_states CASCADE');
    const user = await new DrizzleUserRepository(fixture.db).create({ name: 'Owner', email: 'owner@example.com', password: 'hash' });
    return { user, repo: new DrizzleAccountPetRepository(fixture.db), guest: new DrizzlePetRepository(fixture.db) };
  };
  const rows = async (table: string) => (await fixture.client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows;
  const state = async () => ({ pets: await rows('pet_states'), owners: await rows('user_pet_ownership'), balances: await rows('user_coin_balances'), entries: await rows('user_coin_entries') });
  // Observe only sessions in this fixture's private database; no host-wide probes.
  const lockConnection = async () => {
    const { rows: databases } = await fixture.client.query('SELECT current_database() AS name');
    const connection = new pg.Client({
      connectionString: databaseUrl(readTestUrl(), databases[0].name),
      connectionTimeoutMillis: 2_000,
      statement_timeout: 5_000,
    });
    await connection.connect();
    return connection;
  };
  const waitForBlocked = async (connection: pg.Client, fragment: string) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      await connection.query('SELECT pg_stat_clear_snapshot()');
      const result = await connection.query(
        `SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
         AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE $1`,
        [`%${fragment}%`],
      );
      if (result.rowCount) return;
      await delay(10);
    }
    throw new Error(`Expected blocked fixture query: ${fragment}`);
  };
  const conflict = async () => {
    const ctx = await fresh();
    const account = await ctx.guest.create(randomUUID(), { ...initialSnapshot(), coins: 37, name: 'Account', renameCount: 2 });
    await ctx.repo.bootstrap(ctx.user.id, account.guestKey);
    const device = await ctx.guest.create(randomUUID(), { ...initialSnapshot(), coins: 5, name: 'Device', coat: { ...initialSnapshot().coat, pattern: 'calico' } });
    const pending = await ctx.repo.bootstrap(ctx.user.id, device.guestKey);
    if (pending.status !== 'pending') throw new Error('expected pending');
    return { ...ctx, account, device, pending };
  };

  it('lookup does not generate a guest and bootstrap without either creates only its own initial pet', async () => {
    const { user, repo } = await fresh();
    expect(await repo.readCurrent(user.id)).toBeNull();
    expect(await rows('pet_states')).toEqual([]);
    const result = await repo.bootstrap(user.id, randomUUID());
    expect(result.status).toBe('confirmed');
    const current = await repo.readCurrent(user.id);
    expect(current).toMatchObject(initialSnapshot());
    expect(current).not.toHaveProperty('guestKey');
    expect(await rows('pet_states')).toHaveLength(1);
    expect(await rows('user_pet_ownership')).toHaveLength(1);
    expect(await rows('user_coin_entries')).toEqual([]);
    const before = await state();
    expect((await repo.bootstrap(user.id, randomUUID())).petId).toBe(current?.id);
    expect(await state()).toEqual(before);
  });

  it.each([0, 5, 37])('adopts exactly the existing UUID and complete state with server balance %s only once', async (coins) => {
    const { user, repo, guest } = await fresh();
    const pet = await guest.create(randomUUID(), { ...initialSnapshot(), coins, name: 'Legacy', renameCount: 3 });
    const pets = await rows('pet_states');
    const result = await repo.bootstrap(user.id, pet.guestKey);
    expect(result).toMatchObject({ status: 'confirmed', petId: pet.id, coins });
    expect(await rows('pet_states')).toEqual(pets);
    expect(await repo.readCurrent(user.id)).toMatchObject({ id: pet.id, coins, name: 'Legacy', renameCount: 3 });
    const before = await state();
    expect(await repo.bootstrap(user.id, pet.guestKey)).toMatchObject({ petId: pet.id, coins });
    expect(await state()).toEqual(before);
    expect(await guest.findByGuestKey(randomUUID())).toBeNull();
    await expect(guest.findByGuestKey(pet.guestKey)).rejects.toMatchObject({ code: 'GUEST_PET_UNAVAILABLE' });
  });

  it('no choice saves only pending metadata and status; no ownership, pet, archive or money changes', async () => {
    const { user, repo, guest } = await fresh();
    const account = await guest.create(randomUUID(), { ...initialSnapshot(), coins: 37 });
    await repo.bootstrap(user.id, account.guestKey);
    const device = await guest.create(randomUUID(), { ...initialSnapshot(), coins: 5 });
    const before = await state();
    const pending = await repo.bootstrap(user.id, device.guestKey);
    expect(pending).toMatchObject({ status: 'pending', accountPetId: account.id, guestPetId: device.id });
    expect(await state()).toEqual(before);
    expect(await repo.operationStatus(user.id, pending.operationId!)).toEqual(pending);
    const operations = await rows('pet_claim_operations');
    expect(await repo.bootstrap(user.id, device.guestKey)).toEqual(pending);
    expect(await rows('pet_claim_operations')).toEqual(operations);
    expect(await state()).toEqual(before);
    expect((await guest.findByGuestKey(device.guestKey))?.coins).toBe(5);
    expect((await repo.readCurrent(user.id))?.coins).toBe(37);
  });

  it.each(['keep_account', 'keep_guest'] as const)('%s retains complete rows, credits 37+5 once, revokes both keys and replays exact result', async (choice) => {
    const { user, repo, guest, account, device, pending } = await conflict();
    const pets = await rows('pet_states');
    const result = await repo.resolve(user.id, pending.operationId, choice);
    const currentId = choice === 'keep_account' ? account.id : device.id;
    expect(result).toMatchObject({ status: 'confirmed', petId: currentId, coins: 42 });
    expect(await rows('pet_states')).toEqual(pets);
    const owners = await rows('user_pet_ownership');
    expect(owners.filter((o) => o.status === 'current')).toEqual([expect.objectContaining({ user_id: user.id, pet_id: currentId })]);
    expect(owners.filter((o) => o.status === 'archived')).toEqual([expect.objectContaining({ archive_operation_id: pending.operationId, archived_at: expect.any(Date), archive_reason: choice })]);
    expect(await rows('user_coin_entries')).toHaveLength(2);
    for (const key of [account.guestKey, device.guestKey]) {
      await expect(guest.findByGuestKey(key)).rejects.toMatchObject({ code: 'GUEST_PET_UNAVAILABLE' });
      await expect(guest.update(key, initialSnapshot())).rejects.toMatchObject({ code: 'GUEST_PET_UNAVAILABLE' });
    }
    const before = await state();
    expect(await repo.resolve(user.id, pending.operationId, choice)).toEqual(result);
    expect(await repo.operationStatus(user.id, pending.operationId)).toEqual(result);
    expect(await repo.bootstrap(user.id)).toMatchObject({ petId: currentId, coins: 42 });
    expect(await state()).toEqual(before);
    await expect(repo.resolve(user.id, pending.operationId, choice === 'keep_account' ? 'keep_guest' : 'keep_account')).rejects.toMatchObject({ code: 'PET_OPERATION_DECISION_MISMATCH' });
    expect(await state()).toEqual(before);
  });

  it('stale pair rejects before any archive or credit, including operation metadata changes', async () => {
    const { user, repo, guest, device, pending } = await conflict();
    const third = await guest.create(randomUUID(), { ...initialSnapshot(), coins: 5 });
    const next = await repo.bootstrap(user.id, third.guestKey);
    if (next.status !== 'pending') throw new Error('pending');
    await repo.resolve(user.id, next.operationId, 'keep_guest');
    const before = { state: await state(), ops: await rows('pet_claim_operations') };
    await expect(repo.resolve(user.id, pending.operationId, 'keep_account')).rejects.toMatchObject({ code: 'PET_CONFLICT_STALE' });
    expect({ state: await state(), ops: await rows('pet_claim_operations') }).toEqual(before);
    expect(await guest.findByGuestKey(device.guestKey)).not.toBeNull();
  });

  it('denies another owner and foreign operation status without disclosing or changing anything', async () => {
    const { user, repo, device, pending } = await conflict();
    const other = await new DrizzleUserRepository(fixture.db).create({ name: 'Other' });
    const before = { state: await state(), ops: await rows('pet_claim_operations') };
    await expect(repo.resolve(other.id, pending.operationId, 'keep_guest')).rejects.toMatchObject({ code: 'PET_OPERATION_UNAVAILABLE' });
    await expect(repo.operationStatus(other.id, pending.operationId)).rejects.toMatchObject({ code: 'PET_OPERATION_UNAVAILABLE' });
    expect({ state: await state(), ops: await rows('pet_claim_operations') }).toEqual(before);
    await repo.resolve(user.id, pending.operationId, 'keep_account');
    const adopted = await state();
    await expect(repo.bootstrap(other.id, device.guestKey)).rejects.toMatchObject({ code: 'PET_UNAVAILABLE' });
    expect(await state()).toEqual(adopted);
  });

  it('care, coat and rename reuse rules under lock, leave legacy/canonical coins and archive intact', async () => {
    const { user, repo, account, device, pending } = await conflict();
    await repo.resolve(user.id, pending.operationId, 'keep_account');
    const archived = (await rows('pet_states')).find((r) => r.id === device.id);
    const entries = await rows('user_coin_entries');
    await repo.mutateCurrent(user.id, { kind: 'care', action: 'feed' });
    await repo.mutateCurrent(user.id, { kind: 'coat', coat: { primary: '#AABBCC', secondary: '#DDEEFF', accent: '#112233' } });
    const current = await repo.mutateCurrent(user.id, { kind: 'rename', name: ' Luna ' });
    expect(current).toMatchObject({ id: account.id, coins: 42, name: 'Luna', renameCount: 3, needs: { hunger: 90 }, coat: { primary: '#aabbcc', pattern: 'solid' } });
    expect((await rows('pet_states')).find((r) => r.id === device.id)).toEqual(archived);
    expect((await rows('pet_states')).find((r) => r.id === account.id)?.coins).toBe(37);
    expect(await rows('user_coin_entries')).toEqual(entries);
    expect((await rows('user_coin_balances'))[0].balance).toBe(42);
    const before = await state();
    await expect(repo.mutateCurrent(user.id, { kind: 'rename', name: ' ' })).rejects.toMatchObject({ code: 'INVALID_PET_MUTATION' });
    expect(await state()).toEqual(before);
  });

  it('late ledger failure rolls back ownership, archive, pending result and balance together', async () => {
    const { user, repo, pending } = await conflict();
    const before = { state: await state(), ops: await rows('pet_claim_operations') };
    await fixture.client.query('ALTER TABLE user_coin_entries ADD CONSTRAINT fixture_no_five CHECK (amount <> 5)');
    try {
      await expect(repo.resolve(user.id, pending.operationId, 'keep_guest')).rejects.toThrow();
      expect({ state: await state(), ops: await rows('pet_claim_operations') }).toEqual(before);
    } finally { await fixture.client.query('ALTER TABLE user_coin_entries DROP CONSTRAINT fixture_no_five'); }
  });

  it('support recovery preserves full archived row, audits identity/operation and never recredits', async () => {
    const { user, repo, account, device, pending } = await conflict();
    await repo.resolve(user.id, pending.operationId, 'keep_guest');
    const pets = await rows('pet_states');
    const entries = await rows('user_coin_entries');
    const archivedOwnership = (await rows('user_pet_ownership')).find((o) => o.pet_id === account.id);
    const request = { userId: user.id, petId: account.id, operationId: randomUUID(), actor: 'support-ticket-123/operator-7', reason: 'Authorized recovery' };
    const restored = await repo.restoreArchived(request);
    expect(restored).toMatchObject({ petId: account.id, coins: 42 });
    expect(await repo.restoreArchived(request)).toEqual(restored);
    expect(await rows('pet_states')).toEqual(pets);
    expect(await rows('user_coin_entries')).toEqual(entries);
    expect((await rows('user_pet_ownership')).find((o) => o.pet_id === account.id)).toEqual({ ...archivedOwnership, status: 'current' });
    expect((await rows('user_pet_ownership')).filter((o) => o.status === 'current')).toEqual([expect.objectContaining({ pet_id: account.id })]);
    expect((await rows('pet_claim_operations')).find((o) => o.id === request.operationId)).toMatchObject({ kind: 'restore', support_actor: request.actor, reason: request.reason, account_pet_id: device.id, guest_pet_id: account.id, status: 'confirmed' });
    expect((await repo.bootstrap(user.id)).coins).toBe(42);
    const beforeRejectedReplay = { state: await state(), ops: await rows('pet_claim_operations') };
    await expect(repo.restoreArchived({ ...request, actor: 'different-operator' })).rejects.toMatchObject({ code: 'INVALID_SUPPORT_REQUEST' });
    expect({ state: await state(), ops: await rows('pet_claim_operations') }).toEqual(beforeRejectedReplay);
  });

  it('racing owners cannot both adopt the same guest and same-decision retries credit once', async () => {
    const { user, repo, guest } = await fresh();
    const other = await new DrizzleUserRepository(fixture.db).create({ name: 'Other' });
    const pet = await guest.create(randomUUID(), { ...initialSnapshot(), coins: 5 });
    const outcomes = await Promise.allSettled([repo.bootstrap(user.id, pet.guestKey), repo.bootstrap(other.id, pet.guestKey)]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((r) => r.status === 'rejected')).toEqual([expect.objectContaining({ reason: expect.objectContaining({ code: 'PET_UNAVAILABLE' }) })]);
    expect(await rows('user_coin_entries')).toHaveLength(1);
    expect(await rows('user_pet_ownership')).toHaveLength(1);
    const ctx = await conflict();
    const results = await Promise.all([ctx.repo.resolve(ctx.user.id, ctx.pending.operationId, 'keep_guest'), ctx.repo.resolve(ctx.user.id, ctx.pending.operationId, 'keep_guest')]);
    expect(results[0]).toEqual(results[1]);
    expect((await rows('user_coin_balances'))[0].balance).toBe(42);
    expect(await rows('user_coin_entries')).toHaveLength(2);
  });

  it('concurrent current-pet care uses fresh state and never overwrites the canonical balance', async () => {
    const { user, repo, pending } = await conflict();
    await repo.resolve(user.id, pending.operationId, 'keep_guest');
    const entries = await rows('user_coin_entries');
    await Promise.all([
      repo.mutateCurrent(user.id, { kind: 'care', action: 'feed' }),
      repo.mutateCurrent(user.id, { kind: 'care', action: 'play' }),
    ]);
    expect(await repo.readCurrent(user.id)).toMatchObject({
      coins: 42, needs: { hunger: 90, fun: 96, energy: 61, hygiene: 78 },
    });
    expect(await rows('user_coin_entries')).toEqual(entries);
    expect((await rows('user_coin_balances'))[0].balance).toBe(42);
  });

  it('adoption waits for a guest writer and imports the fresh locked legacy row', async () => {
    const { user, repo, guest } = await fresh();
    const pet = await guest.create(randomUUID(), { ...initialSnapshot(), coins: 5 });
    const connection = await lockConnection();
    let adoption: ReturnType<typeof repo.bootstrap> | undefined;
    try {
      await connection.query('BEGIN');
      await connection.query("UPDATE pet_states SET coins=37,name='Fresh' WHERE id=$1", [pet.id]);
      adoption = repo.bootstrap(user.id, pet.guestKey);
      await waitForBlocked(connection, 'from "pet_states"');
      await connection.query('COMMIT');
      expect(await adoption).toMatchObject({ petId: pet.id, coins: 37 });
      expect(await repo.readCurrent(user.id)).toMatchObject({ id: pet.id, coins: 37, name: 'Fresh' });
      expect((await rows('user_coin_entries'))[0].amount).toBe(37);
    } finally {
      await connection.query('ROLLBACK');
      await connection.end();
      await adoption?.catch(() => undefined);
    }
  });

  it('guest initialization racing an uncommitted adopted key explicitly denies instead of surfacing duplicate or recreating', async () => {
    const { user, guest } = await fresh();
    const key = randomUUID();
    const connection = await lockConnection();
    let creation: Promise<unknown> | undefined;
    try {
      await connection.query('BEGIN');
      const pet = (await connection.query('INSERT INTO pet_states (guest_key) VALUES ($1) RETURNING id', [key])).rows[0];
      await connection.query("INSERT INTO user_pet_ownership (pet_id,user_id,status) VALUES ($1,$2,'current')", [pet.id, user.id]);
      creation = guest.create(key, { ...initialSnapshot(), name: 'Replacement' })
        .then(() => ({ code: 'UNEXPECTED_SUCCESS' }), (error: unknown) => error);
      await waitForBlocked(connection, 'insert into "pet_states"');
      await connection.query('COMMIT');
      expect(await creation).toMatchObject({ code: 'GUEST_PET_UNAVAILABLE' });
      expect(await rows('pet_states')).toEqual([expect.objectContaining({ id: pet.id, guest_key: key, name: 'Michi' })]);
      expect(await rows('user_pet_ownership')).toHaveLength(1);
      expect(await rows('user_coin_entries')).toEqual([]);
    } finally {
      await connection.query('ROLLBACK');
      await connection.end();
      await creation;
    }
  });

  it('guest stale update waits on the real adoption transaction and revalidates after commit', async () => {
    const { user, repo, guest } = await fresh();
    const pet = await guest.create(randomUUID(), { ...initialSnapshot(), coins: 5 });
    await fixture.client.query('INSERT INTO user_coin_balances (user_id,balance) VALUES ($1,0)', [user.id]);
    const connection = await lockConnection();
    let adoption: ReturnType<typeof repo.bootstrap> | undefined;
    let update: Promise<unknown> | undefined;
    try {
      await connection.query('BEGIN');
      await connection.query('SELECT * FROM user_coin_balances WHERE user_id=$1 FOR UPDATE', [user.id]);
      adoption = repo.bootstrap(user.id, pet.guestKey);
      // Adoption holds the pet lock and uncommitted ownership while awaiting credit.
      await waitForBlocked(connection, 'update "user_coin_balances"');
      update = guest.update(pet.guestKey, { ...initialSnapshot(), name: 'Stale', coins: 999 })
        .then(() => ({ code: 'UNEXPECTED_SUCCESS' }), (error: unknown) => error);
      await waitForBlocked(connection, 'from "pet_states"');
      await connection.query('COMMIT');
      expect(await adoption).toMatchObject({ petId: pet.id, coins: 5 });
      expect(await update).toMatchObject({ code: 'GUEST_PET_UNAVAILABLE' });
      expect((await rows('pet_states'))[0]).toMatchObject({ name: 'Michi', coins: 5 });
      expect((await rows('user_coin_balances'))[0].balance).toBe(5);
    } finally {
      await connection.query('ROLLBACK');
      await connection.end();
      await Promise.allSettled([adoption, update]);
    }
  });
});
