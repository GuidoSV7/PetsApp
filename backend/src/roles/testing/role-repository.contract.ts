import { beforeEach, describe, expect, it } from 'vitest';
import { UserRole } from '../../users/enums/user-role.enum.js';
import type { RoleRepository } from '../ports/role-repository.port.js';

const USER = '11111111-1111-4111-8111-111111111111';

/**
 * Behavior every `RoleRepository` adapter must honor. Run by the in-memory
 * adapter spec and by the Drizzle integration spec.
 */
export function roleRepositoryContract(
  name: string,
  setup: () => Promise<RoleRepository> | RoleRepository,
  options: { seedUser?: (id: string) => Promise<void> } = {},
): void {
  describe(`${name} satisfies the RoleRepository contract`, () => {
    let repo: RoleRepository;

    beforeEach(async () => {
      repo = await setup();
      await options.seedUser?.(USER);
    });

    it('lists the three built-in roles, active, with a permission list', async () => {
      const listed = await repo.list();

      expect(listed.map((role) => role.code).sort()).toEqual([
        'admin',
        'member',
        'super_admin',
      ]);
      for (const role of listed) {
        expect(role.active).toBe(true);
        expect(Array.isArray(role.permissions)).toBe(true);
      }
    });

    it('answers no codes for a user without roles', async () => {
      expect(await repo.codesFor(USER)).toEqual([]);
    });

    it('replace stores a unique set, highest privilege first', async () => {
      const stored = await repo.replace(USER, [
        UserRole.MEMBER,
        UserRole.ADMIN,
        UserRole.ADMIN,
      ]);

      expect(stored).toEqual([UserRole.ADMIN, UserRole.MEMBER]);
      expect(await repo.codesFor(USER)).toEqual([
        UserRole.ADMIN,
        UserRole.MEMBER,
      ]);

      await repo.replace(USER, [UserRole.SUPER_ADMIN]);
      expect(await repo.codesFor(USER)).toEqual([UserRole.SUPER_ADMIN]);
    });

    it('creates a custom role and lists it with its permissions', async () => {
      const created = await repo.create({
        code: 'vet',
        name: 'Veterinarian',
        active: true,
        permissions: ['users:read'],
      });

      expect(created).toEqual({
        code: 'vet',
        name: 'Veterinarian',
        active: true,
        permissions: ['users:read'],
      });
      expect(await repo.list()).toContainEqual(created);
      await expect(
        repo.create({
          code: 'vet',
          name: 'Other',
          active: true,
          permissions: [],
        }),
      ).rejects.toThrow();
    });

    it('save patches active and permissions, and answers null for an unknown code', async () => {
      expect(await repo.save('admin', { active: false })).toMatchObject({
        code: 'admin',
        active: false,
      });
      expect(
        await repo.save('admin', { permissions: ['roles:manage'] }),
      ).toMatchObject({
        code: 'admin',
        active: false,
        permissions: ['roles:manage'],
      });
      expect(await repo.save('ghost', { active: true })).toBeNull();
    });
  });
}
