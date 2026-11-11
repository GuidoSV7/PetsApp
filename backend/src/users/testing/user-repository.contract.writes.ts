import { describe, expect, it } from 'vitest';
import { pgErrorCode } from '../../database/pg-error.util.js';
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
        tokenVersion: 0,
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

    it('rejects a duplicate email with unique_violation (23505), case-insensitively (S3)', async () => {
      await repo().create(userData());

      const error = await repo()
        .create(userData())
        .then(
          () => undefined,
          (e: unknown) => e,
        );
      expect(error).toBeInstanceOf(Error);
      expect(pgErrorCode(error)).toBe('23505');
      const caseError = await repo()
        .create(userData({ email: 'ADA@example.com' }))
        .then(
          () => undefined,
          (e: unknown) => e,
        );
      expect(pgErrorCode(caseError)).toBe('23505');
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
      // Case-insensitive: another account's email in any case is a conflict.
      await expect(
        repo().update(other.id, { email: 'TAKEN@example.com' }),
      ).rejects.toThrow();
      // Their own email in any case is not (the unique index is per row).
      await expect(
        repo().update(other.id, { email: 'OTHER@example.com' }),
      ).resolves.toBeDefined();
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

  describe('toggleBlock (S12)', () => {
    it('flips is_blocked in one step and keeps every other column', async () => {
      const created = await repo().create(userData({ role: 'admin' }));

      const once = await repo().toggleBlock(created.id);
      expect(once).toEqual({ ...created, isBlocked: true });
      const twice = await repo().toggleBlock(created.id);
      expect(twice).toEqual({ ...created, isBlocked: false });
      expect(await repo().findById(created.id)).toEqual(created);
    });

    it('answers null for a missing id and rejects a malformed one', async () => {
      expect(await repo().toggleBlock(MISSING_ID)).toBeNull();
      await expect(repo().toggleBlock('nope')).rejects.toThrow();
    });
  });
}
