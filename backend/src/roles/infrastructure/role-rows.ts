import { eq, inArray } from 'drizzle-orm';
import { orderedRoles, primaryRole } from '../../auth/role-rank.js';
import type { DrizzleDb } from '../../database/database.module.js';
import type { UserRow } from '../../db/types.js';
import { roles, userRoles } from '../../db/schema.js';
import { UserRole } from '../../users/enums/user-role.enum.js';

type RoleDb = Pick<DrizzleDb, 'select' | 'insert' | 'delete'>;
type StoredUser = Omit<UserRow, 'role' | 'roles' | 'password'>;

/** Display names of the built-in roles, used when a row is first linked. */
export const ROLE_NAMES: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.SUPER_ADMIN]: 'Super administrator',
  [UserRole.MEMBER]: 'Member',
};

export function assertKnownRole(role: string): asserts role is UserRole {
  if (!Object.values(UserRole).includes(role as UserRole)) {
    throw new Error('Invalid role');
  }
}

/** Attaches `roles` (ordered) and `role` (primary) to a stored row. */
export function withRoles<T extends StoredUser>(
  row: T,
  codes: readonly UserRole[],
): T & { role: UserRole; roles: UserRole[] } {
  const assigned = orderedRoles(codes);
  return { ...row, roles: assigned, role: primaryRole(assigned) };
}

export async function replaceUserRoles(
  db: RoleDb,
  userId: string,
  codes: readonly UserRole[],
): Promise<UserRole[]> {
  const unique = orderedRoles(codes);
  await db
    .insert(roles)
    .values(unique.map((code) => ({ code, name: ROLE_NAMES[code] })))
    .onConflictDoNothing({ target: roles.code });
  const known = await db
    .select({ id: roles.id, code: roles.code })
    .from(roles)
    .where(inArray(roles.code, unique));
  if (known.length !== unique.length) throw new Error('Invalid role');
  await db.delete(userRoles).where(eq(userRoles.userId, userId));
  if (known.length > 0) {
    await db
      .insert(userRoles)
      .values(known.map((role) => ({ userId, roleId: role.id })));
  }
  return unique;
}

export async function loadRoleCodes(
  db: RoleDb,
  userIds: readonly string[],
): Promise<Map<string, UserRole[]>> {
  const grouped = new Map<string, UserRole[]>();
  if (userIds.length === 0) return grouped;
  const links = await db
    .select({ userId: userRoles.userId, code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(inArray(userRoles.userId, [...userIds]));
  for (const link of links) {
    const list = grouped.get(link.userId) ?? [];
    list.push(link.code as UserRole);
    grouped.set(link.userId, orderedRoles(list));
  }
  return grouped;
}
