import { afterAll, beforeAll, describe } from 'vitest';
import { createTestDb, type TestDb } from '../../testing/pglite.js';
import { roleRepositoryContract } from '../testing/role-repository.contract.js';
import { DrizzleRoleRepository } from './drizzle-role.repository.js';

describe('DrizzleRoleRepository (pglite)', () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });
  afterAll(async () => {
    await testDb.close();
  });

  roleRepositoryContract(
    'DrizzleRoleRepository',
    async () => {
      await testDb.client.exec(
        'TRUNCATE users, user_roles RESTART IDENTITY CASCADE',
      );
      await testDb.client.exec(
        "DELETE FROM roles WHERE code NOT IN ('admin', 'super_admin', 'member')",
      );
      await testDb.client.exec(
        "UPDATE roles SET is_active = true, permissions = '[]'::jsonb",
      );
      return new DrizzleRoleRepository(testDb.db);
    },
    {
      seedUser: async (id) => {
        await testDb.client.query(
          `INSERT INTO users (id, email, password, name) VALUES ($1, $2, 'hash', 'Ana')`,
          [id, `${id}@example.com`],
        );
      },
    },
  );
});
