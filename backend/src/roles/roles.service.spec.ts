import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UserRole } from '../users/enums/user-role.enum.js';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { InMemoryRoleRepository } from './infrastructure/in-memory-role.repository.js';
import { DrizzleRoleRepository } from './infrastructure/drizzle-role.repository.js';
import type { RoleRepository } from './ports/role-repository.port.js';
import { RolesService } from './roles.service.js';

const USER = '11111111-1111-4111-8111-111111111111';

describe('RolesService', () => {
  const setup = () => {
    const repo = new InMemoryRoleRepository();
    return { repo, service: new RolesService(repo) };
  };

  it('lists the three catalog codes', async () => {
    const { service } = setup();

    const listed = await service.list();

    expect(listed.map((role) => role.code).sort()).toEqual([
      'admin',
      'member',
      'super_admin',
    ]);
  });

  it('replaces the set and reports the highest role first', async () => {
    const { repo, service } = setup();

    await expect(
      service.replace(USER, [UserRole.MEMBER, UserRole.ADMIN, UserRole.ADMIN]),
    ).resolves.toEqual({
      roles: [UserRole.ADMIN, UserRole.MEMBER],
    });
    expect(await repo.codesFor(USER)).toEqual([
      UserRole.ADMIN,
      UserRole.MEMBER,
    ]);
  });

  it('rejects an empty set and an unknown code', async () => {
    const { service } = setup();

    await expect(service.replace(USER, [])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.replace(USER, ['vet'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(await service.list()).toHaveLength(3);
  });
});

describe('custom roles', () => {
  const setup = () => {
    const repo = new InMemoryRoleRepository();
    return { service: new RolesService(repo) };
  };

  it('creates a role with catalog permissions and lists it active', async () => {
    const { service } = setup();

    await expect(
      service.create({
        name: '  Veterinarian  ',
        permissions: ['users:read', 'users:write'],
      }),
    ).resolves.toMatchObject({
      code: 'veterinarian',
      name: 'Veterinarian',
      active: true,
      permissions: ['users:read', 'users:write'],
    });
    const listed = await service.list();
    expect(listed.find((role) => role.code === 'veterinarian')).toMatchObject({
      name: 'Veterinarian',
      active: true,
    });
  });

  it('deduplicates permissions and rejects a duplicate name or code', async () => {
    const { service } = setup();

    await expect(
      service.create({
        name: 'Groomer',
        permissions: ['users:read', 'users:read'],
      }),
    ).resolves.toMatchObject({ permissions: ['users:read'] });
    await expect(
      service.create({ name: 'groomer', permissions: ['users:read'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ name: 'Administrator', permissions: ['users:read'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a blank name, an unknown permission and an empty permission list', async () => {
    const { service } = setup();

    await expect(
      service.create({ name: '   ', permissions: ['users:read'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ name: 'Vet', permissions: ['pets:fly'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ name: 'Vet', permissions: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('turns a role off and refuses to touch the super admin', async () => {
    const { service } = setup();

    await expect(
      service.update('admin', { active: false }),
    ).resolves.toMatchObject({ code: 'admin', active: false });
    await expect(
      service.update('super_admin', { active: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const listed = await service.list();
    expect(listed.find((role) => role.code === 'super_admin')?.active).toBe(
      true,
    );
  });

  it('replaces the permissions of an existing role and 404s an unknown code', async () => {
    const { service } = setup();

    await expect(
      service.update('admin', { permissions: ['users:read', 'roles:manage'] }),
    ).resolves.toMatchObject({
      code: 'admin',
      permissions: ['users:read', 'roles:manage'],
    });
    await expect(
      service.update('ghost', { active: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('duplicate role races (S5)', () => {
  /** Repo double whose create always loses the unique race with 23505. */
  const losingRepo = (): RoleRepository =>
    ({
      list: async () => [],
      create: async () => {
        throw Object.assign(new Error('uq_roles_code'), { code: '23505' });
      },
    }) as unknown as RoleRepository;

  it('maps a 23505 unique violation to ConflictException (409), not 500', async () => {
    const service = new RolesService(losingRepo());

    await expect(
      service.create({ name: 'Groomer', permissions: ['users:read'] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps a wrapped (DrizzleQueryError.cause) 23505 to ConflictException too', async () => {
    const repo = {
      list: async () => [],
      create: async () => {
        throw Object.assign(new Error('wrapped'), {
          cause: Object.assign(new Error('uq_roles_code'), { code: '23505' }),
        });
      },
    } as unknown as RoleRepository;
    const service = new RolesService(repo);

    await expect(
      service.create({ name: 'Groomer', permissions: ['users:read'] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unrelated repository errors unchanged', async () => {
    const repo = {
      list: async () => [],
      create: async () => {
        throw Object.assign(new Error('connection refused'), { code: '08006' });
      },
    } as unknown as RoleRepository;
    const service = new RolesService(repo);

    await expect(
      service.create({ name: 'Groomer', permissions: ['users:read'] }),
    ).rejects.toMatchObject({ message: 'connection refused' });
  });
});

describe('RolesService against PostgreSQL (S5 races)', () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });
  afterAll(async () => {
    await testDb.close();
  });

  async function freshService(): Promise<RolesService> {
    await testDb.client.query(
      'TRUNCATE users, user_roles RESTART IDENTITY CASCADE',
    );
    await testDb.client.query(
      "DELETE FROM roles WHERE code NOT IN ('admin', 'super_admin', 'member')",
    );
    await testDb.client.query(
      "UPDATE roles SET is_active = true, permissions = '[]'::jsonb",
    );
    return new RolesService(new DrizzleRoleRepository(testDb.db));
  }

  it('keeps the sequential duplicate answer: 400 with the existing message', async () => {
    const service = await freshService();
    await service.create({ name: 'Groomer', permissions: ['users:read'] });

    await expect(
      service.create({ name: 'Groomer', permissions: ['users:read'] }),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        message: 'A role with that name already exists',
      },
    });
    const stored = await testDb.client.query(
      "SELECT count(*)::int AS n FROM roles WHERE code = 'groomer'",
    );
    expect(stored.rows[0].n).toBe(1);
  });

  it('answers a concurrent duplicate race without a 500 and stores exactly one row', async () => {
    const service = await freshService();

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        service.create({ name: 'Vet', permissions: ['users:read'] }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    for (const result of results) {
      if (result.status === 'rejected') {
        expect([400, 409]).toContain(
          result.reason?.response?.statusCode ?? result.reason?.status,
        );
      }
    }
    const stored = await testDb.client.query(
      "SELECT count(*)::int AS n FROM roles WHERE code = 'vet'",
    );
    expect(stored.rows[0].n).toBe(1);
  });
});
