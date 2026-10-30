import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { DrizzleDb } from '../../database/database.module.js';
import { DRIZZLE } from '../../database/database.tokens.js';
import { users, userStellarIdentities } from '../../db/schema.js';
import { loadRoleCodes, withRoles } from '../../roles/infrastructure/role-rows.js';
import type { WalletIdentity, WalletSignup, WalletUserRepository } from '../ports/wallet-user-repository.port.js';
import type { UserRow } from '../ports/user-repository.port.js';
import { createUserInTransaction, initializeUserCoinBalance, type UserTransaction, withUserTransaction } from './user-persistence.js';

/** T2 must call this within its challenge-consumption transaction, not create(). */
export async function createWalletUser(tx: UserTransaction, data: WalletSignup): Promise<UserRow> {
  const user = await createUserInTransaction(tx, { name: data.name, email: null, password: null });
  await tx.insert(userStellarIdentities).values({ userId: user.id, network: data.network, address: data.address });
  await initializeUserCoinBalance(tx, user.id);
  return user;
}

export async function findWalletUser(db: Pick<DrizzleDb, 'select' | 'insert' | 'delete'>, identity: WalletIdentity): Promise<UserRow | null> {
  const [found] = await db.select({ user: users }).from(userStellarIdentities)
    .innerJoin(users, eq(users.id, userStellarIdentities.userId))
    .where(and(eq(userStellarIdentities.network, identity.network), eq(userStellarIdentities.address, identity.address)));
  if (!found) return null;
  const codes = await loadRoleCodes(db, [found.user.id]);
  return withRoles(found.user, codes.get(found.user.id) ?? []);
}

/** T2 verifies session, recent auth, role and purpose before calling this helper. */
export async function linkWalletIdentity(tx: UserTransaction, userId: string, identity: WalletIdentity): Promise<UserRow> {
  const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
  if (!user) throw new Error('USER_NOT_FOUND');
  await tx.insert(userStellarIdentities).values({ userId, ...identity }).onConflictDoNothing();
  const linked = await findWalletUser(tx, identity);
  if (!linked || linked.id !== userId) throw new Error('STELLAR_IDENTITY_CONFLICT');
  // A conflicting second identity may have caused DO NOTHING: verify exact match.
  return linked;
}

@Injectable()
export class DrizzleWalletUserRepository implements WalletUserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}
  create(data: WalletSignup): Promise<UserRow> {
    return withUserTransaction(this.db, (tx) => createWalletUser(tx, data));
  }
  findByIdentity(identity: WalletIdentity): Promise<UserRow | null> {
    return findWalletUser(this.db, identity);
  }
}
