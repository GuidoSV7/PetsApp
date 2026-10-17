import { describe, expect, it } from 'vitest';
import type { UserRow } from '../db/types.js';
import { UserRole } from './enums/user-role.enum.js';
import { PUBLIC_USER_KEYS, toPublicUser } from './public-user.js';

const row = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
  password: '$2b$10$abcdefghijklmnopqrstuv',
  name: 'Ana',
  role: UserRole.MEMBER,
  roles: [UserRole.MEMBER],
  isBlocked: false,
  isActive: true,
  profileImage: null,
  country: 'AR',
  isVerified: true,
  lastLogin: new Date('2026-01-02T03:04:05.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('toPublicUser', () => {
  it('answers exactly the allowlisted keys and never the password hash', () => {
    const out = toPublicUser(row());

    expect(Object.keys(out).sort()).toEqual([...PUBLIC_USER_KEYS].sort());
    expect(out).not.toHaveProperty('password');
    expect(out).toMatchObject({ id: row().id, email: 'ana@example.com' });
  });

  it('drops a column that is not on the allowlist (a future secret)', () => {
    const withSecret = { ...row(), twoFactorSecret: 'JBSWY3DP' } as UserRow;

    const out = toPublicUser(withSecret);

    expect(out).not.toHaveProperty('twoFactorSecret');
    expect(Object.keys(out).sort()).toEqual([...PUBLIC_USER_KEYS].sort());
  });

  it('keeps null and Date values untouched', () => {
    const out = toPublicUser(row({ lastLogin: null, country: null }));

    expect(out.lastLogin).toBeNull();
    expect(out.country).toBeNull();
    expect(toPublicUser(row()).createdAt).toBeInstanceOf(Date);
  });
});
