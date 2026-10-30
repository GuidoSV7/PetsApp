import { sql } from 'drizzle-orm';
import type { DrizzleDb } from '../../database/database.module.js';
import { definedFields } from '../../database/update-patch.util.js';
import { userCoinBalances, users } from '../../db/schema.js';
import { assertKnownRole, replaceUserRoles, withRoles } from '../../roles/infrastructure/role-rows.js';
import { UserRole } from '../enums/user-role.enum.js';
import type { UserData, UserRow } from '../ports/user-repository.port.js';

/** Infrastructure-only transaction type; services depend on domain ports. */
export type UserTransaction = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

export const USER_COLUMNS = [
  'email', 'password', 'name', 'isBlocked', 'isActive', 'profileImage',
  'country', 'isVerified', 'lastLogin',
] as const;

/** One real outer commit, reusable by the SEP-10 infrastructure adapter. */
export function withUserTransaction<T>(db: DrizzleDb, work: (tx: UserTransaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    return work(tx);
  });
}

/** Shared zero-balance initialization; never resets an existing canonical balance. */
export async function initializeUserCoinBalance(tx: UserTransaction, userId: string): Promise<void> {
  await tx.insert(userCoinBalances).values({ userId, balance: 0 }).onConflictDoNothing();
}

/** Preserves the ordinary repository's column whitelist and role catalog rules. */
export async function createUserInTransaction(tx: UserTransaction, data: UserData): Promise<UserRow> {
  const role = data.role ?? UserRole.MEMBER;
  assertKnownRole(role);
  const values = definedFields(data, USER_COLUMNS) as typeof users.$inferInsert;
  const [row] = await tx.insert(users).values(values).returning();
  const assigned = await replaceUserRoles(tx, row.id, [role]);
  return withRoles(row, assigned);
}
