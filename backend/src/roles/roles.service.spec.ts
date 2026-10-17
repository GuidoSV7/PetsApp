import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { UserRole } from '../users/enums/user-role.enum.js';
import { InMemoryRoleRepository } from './infrastructure/in-memory-role.repository.js';
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
