import { describe, expect, it } from 'vitest';
import { UserRole } from '../users/enums/user-role.enum.js';
import { InMemoryUserRepository } from '../users/testing/in-memory-user.repository.js';
import { seedSuperAdmin } from './seed-admin-logic.js';

const hashPassword = async (plain: string) => `hashed:${plain}`;

describe('seedSuperAdmin', () => {
  it('creates a super_admin when the email is free', async () => {
    const users = new InMemoryUserRepository();

    const result = await seedSuperAdmin(
      users,
      {
        email: '  Admin@Pets.App ',
        password: 'password123',
        name: 'Root Admin',
      },
      hashPassword,
    );

    expect(result).toEqual({
      status: 'created',
      email: 'admin@pets.app',
      userId: expect.any(String),
    });

    const row = await users.findByEmail('admin@pets.app');
    expect(row).not.toBeNull();
    expect(row!.name).toBe('Root Admin');
    expect(row!.role).toBe(UserRole.SUPER_ADMIN);
    expect(row!.roles).toEqual([UserRole.SUPER_ADMIN]);
    expect(row!.password).toBe('hashed:password123');
  });

  it('is idempotent when the email already exists', async () => {
    const users = new InMemoryUserRepository();
    await users.create({
      email: 'admin@pets.app',
      password: 'hashed:original',
      name: 'Existing',
      role: UserRole.MEMBER,
    });

    const result = await seedSuperAdmin(
      users,
      {
        email: 'admin@pets.app',
        password: 'password123',
        name: 'Root Admin',
      },
      hashPassword,
    );

    expect(result.status).toBe('already_exists');
    if (result.status !== 'already_exists') return;

    const row = await users.findByEmail('admin@pets.app');
    expect(row!.password).toBe('hashed:original');
    expect(row!.role).toBe(UserRole.MEMBER);
    expect(row!.name).toBe('Existing');
    expect(result.userId).toBe(row!.id);
  });

  it('rejects a short password', async () => {
    const users = new InMemoryUserRepository();
    await expect(
      seedSuperAdmin(
        users,
        { email: 'a@b.c', password: 'short', name: 'A' },
        hashPassword,
      ),
    ).rejects.toThrow(/at least 8/i);
  });

  it('rejects blank email or name', async () => {
    const users = new InMemoryUserRepository();
    await expect(
      seedSuperAdmin(
        users,
        { email: '   ', password: 'password123', name: 'A' },
        hashPassword,
      ),
    ).rejects.toThrow(/ADMIN_EMAIL|email/i);
    await expect(
      seedSuperAdmin(
        users,
        { email: 'a@b.c', password: 'password123', name: '  ' },
        hashPassword,
      ),
    ).rejects.toThrow(/ADMIN_NAME|name/i);
  });
});
