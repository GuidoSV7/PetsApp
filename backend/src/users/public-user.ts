import type { UserRow } from '../db/types.js';

/**
 * Allowlist of the `users` columns a response may carry when it nests a user.
 * Every non-credential column; the password hash, and any column added to
 * `users` later, stays out until it is listed here on purpose.
 */
export const PUBLIC_USER_KEYS = [
  'id',
  'email',
  'name',
  'role',
  'roles',
  'isBlocked',
  'isActive',
  'profileImage',
  'country',
  'isVerified',
  'lastLogin',
  'createdAt',
  'updatedAt',
] as const;

export type PublicUser = Pick<UserRow, (typeof PUBLIC_USER_KEYS)[number]>;

/** The user as a response may show it: allowlisted columns only, never the hash. */
export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    roles: row.roles,
    isBlocked: row.isBlocked,
    isActive: row.isActive,
    profileImage: row.profileImage,
    country: row.country,
    isVerified: row.isVerified,
    lastLogin: row.lastLogin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const toPublicUserOrNull = (row: UserRow | null): PublicUser | null =>
  row ? toPublicUser(row) : null;
