import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/user-role.enum.js';
import type { UserRepository } from '../ports/user-repository.port.js';
import { MISSING_ID, pause, userData } from './user-repository.fixtures.js';

export function userWritesContract(repo: () => UserRepository): void {
  describe('create', () => {
    it('applies the column defaults and returns the full row', async () => {
      const created = await repo().create(userData());

      expect(created).toEqual({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
        email: 'ada@example.com',
        password: 'hashed-password',
        name: 'Ada',
        role: 'member',
        roles: ['member'],
        isBlocked: false,
        isActive: true,
        profileImage: null,
        country: null,
        isVerified: false,
        lastLogin: null,
        createdAt: expect.any(Date) as unknown,
        updatedAt: expect.any(Date) as unknown,
      });
      expect(created.updatedAt.getTime()).toBe(created.createdAt.getTime());
      expect(Date.now() - created.createdAt.getTime()).toBeLessThan(60_000);
      const other = await repo().create(userData({ email: 'b@example.com' }));
      expect(other.id).not.toBe(created.id);
    });

    it('keeps every provided value', async () => {
      const lastLogin = new Date('2025-02-03T04:05:06.000Z');

      const created = await repo().create(
        userData({
          role: 'admin',
          isBlocked: true,
          isActive: false,
          profileImage: 'a.png',
          country: 'CO',
          isVerified: true,
          lastLogin,
        }),
      );

      expect(created).toMatchObject({
        role: 'admin',
        roles: ['admin'],
        isBlocked: true,
        isActive: false,
        profileImage: 'a.png',
        country: 'CO',
        isVerified: true,
        lastLogin,
      });
    });

    it('ignores undefined values and unknown keys (a forged id never wins)', async () => {
      const created = await repo().create(
        userData({ country: undefined, id: MISSING_ID, nope: 1 }),
      );

      expect(created.id).not.toBe(MISSING_ID);
      expect(created.country).toBeNull();
      expect(created).not.toHaveProperty('nope');
    });

    it('rejects a duplicate email but accepts one that differs in case', async () => {
      await repo().create(userData());

      await expect(repo().create(userData())).rejects.toThrow();
      await expect(
        repo().create(userData({ email: 'ADA@example.com' })),
      ).resolves.toMatchObject({ email: 'ADA@example.com' });
    });

    it('rejects nulls on NOT NULL columns, a bad role, an oversized column and a non-boolean flag', async () => {
      const attempt = (overrides: Record<string, unknown>) =>
        repo().create(userData(overrides));

      await expect(attempt({ email: null })).rejects.toThrow();
      await expect(attempt({ password: null })).rejects.toThrow();
      await expect(attempt({ name: null })).rejects.toThrow();
      await expect(attempt({ role: 'owner' })).rejects.toThrow();
      await expect(attempt({ country: 'COL' })).rejects.toThrow();
      await expect(attempt({ isBlocked: 'maybe' })).rejects.toThrow();
      expect(await repo().findMany()).toEqual([]);
    });
  });

  describe('update', () => {
    it('returns the full row with the new values and the password hash', async () => {
      const created = await repo().create(userData({ country: 'CO' }));

      const updated = await repo().update(created.id, {
        name: 'Grace',
        profileImage: 'g.png',
      });

      expect(updated).toEqual({
        ...created,
        name: 'Grace',
        profileImage: 'g.png',
      });
      expect(await repo().findById(created.id)).toEqual(updated);
    });

    it('leaves updatedAt unchanged (the repository never refreshes it)', async () => {
      const created = await repo().create(userData());
      await pause();

      const updated = await repo().update(created.id, { name: 'Grace' });

      expect(updated?.updatedAt.getTime()).toBe(created.updatedAt.getTime());
    });

    it('clears nullable columns with null and can change role and password', async () => {
      const created = await repo().create(
        userData({ profileImage: 'old.png', country: 'CO' }),
      );

      const updated = await repo().update(created.id, {
        profileImage: null,
        country: null,
        role: UserRole.ADMIN,
        password: 'new-hash',
        lastLogin: new Date('2025-02-03T04:05:06.000Z'),
      });

      expect(updated).toMatchObject({
        profileImage: null,
        country: null,
        role: 'admin',
        roles: ['admin'],
        password: 'new-hash',
        lastLogin: new Date('2025-02-03T04:05:06.000Z'),
      });
    });

    it('ignores undefined values and unknown keys, and returns the current row for an empty patch', async () => {
      const created = await repo().create(userData());

      expect(await repo().update(created.id, {})).toEqual(created);
      expect(
        await repo().update(created.id, { name: undefined } as never),
      ).toEqual(created);
      expect(
        await repo().update(created.id, { nope: 1, id: MISSING_ID } as never),
      ).toEqual(created);
      expect(await repo().update(MISSING_ID, {})).toBeNull();
    });

    it('answers null for a missing id and rejects a malformed one', async () => {
      expect(await repo().update(MISSING_ID, { name: 'x' })).toBeNull();
      await expect(repo().update('nope', { name: 'x' })).rejects.toThrow();
    });

    it('rejects a duplicate email and keeps the row, but allows the same email', async () => {
      await repo().create(userData({ email: 'taken@example.com' }));
      const other = await repo().create(
        userData({ email: 'other@example.com' }),
      );

      await expect(
        repo().update(other.id, { email: 'taken@example.com' }),
      ).rejects.toThrow();
      expect((await repo().findById(other.id))?.email).toBe(
        'other@example.com',
      );
      await expect(
        repo().update(other.id, { email: 'other@example.com' }),
      ).resolves.toMatchObject({ email: 'other@example.com' });
    });

    it('rejects nulls on NOT NULL columns and a bad role, leaving the row untouched', async () => {
      const created = await repo().create(userData());
      const attempt = (patch: Record<string, unknown>) =>
        repo().update(created.id, patch as never);

      await expect(attempt({ name: null })).rejects.toThrow();
      await expect(attempt({ email: null })).rejects.toThrow();
      await expect(attempt({ role: 'owner' })).rejects.toThrow();
      expect(await repo().findById(created.id)).toEqual(created);
    });
  });
}
