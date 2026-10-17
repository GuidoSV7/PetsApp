import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pgErrorCode } from '../../database/pg-error.util.js';
import { createTestDb, type TestDb } from '../../testing/pglite.js';
import { userRepositoryContract } from '../testing/user-repository.contract.js';
import { userData } from '../testing/user-repository.fixtures.js';
import { DrizzleUserRepository } from './drizzle-user.repository.js';

describe('DrizzleUserRepository (pglite)', () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });
  afterAll(async () => {
    await testDb.close();
  });

  const fresh = async () => {
    await testDb.client.exec('TRUNCATE users RESTART IDENTITY CASCADE');
    return new DrizzleUserRepository(testDb.db);
  };

  userRepositoryContract('DrizzleUserRepository', fresh);

  it('surfaces the raw unique violation (23505) for a duplicate email on create and update', async () => {
    const repo = await fresh();
    await repo.create(userData());
    const other = await repo.create(userData({ email: 'b@example.com' }));

    const onCreate = await repo.create(userData()).catch((e: unknown) => e);
    const onUpdate = await repo
      .update(other.id, { email: 'ada@example.com' })
      .catch((e: unknown) => e);

    expect(pgErrorCode(onCreate)).toBe('23505');
    expect(pgErrorCode(onUpdate)).toBe('23505');
  });

  it('surfaces NOT NULL (23502), varchar overflow (22001) and malformed uuid (22P02) codes', async () => {
    const repo = await fresh();
    const created = await repo.create(userData());
    const code = (promise: Promise<unknown>) =>
      promise.then(
        () => undefined,
        (e: unknown) => pgErrorCode(e),
      );

    expect(await code(repo.create(userData({ name: null })))).toBe('23502');
    await expect(
      repo.create(userData({ role: 'owner' as never })),
    ).rejects.toThrow('Invalid role');
    expect(await code(repo.create(userData({ country: 'COL' })))).toBe('22001');
    expect(await code(repo.findById('nope'))).toBe('22P02');
    expect(await code(repo.update(created.id, { email: null } as never))).toBe(
      '23502',
    );
  });

  it('links the user to the role catalog through user_roles', async () => {
    const repo = await fresh();
    const created = await repo.create(userData({ role: 'admin' as never }));

    const { rows } = await testDb.client.query<{ code: string }>(
      `SELECT r.code FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1`,
      [created.id],
    );

    expect(rows).toEqual([{ code: 'admin' }]);
  });
});
