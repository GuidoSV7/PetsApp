import { Inject, Injectable, UnauthorizedException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DrizzleDb } from '../../database/database.module.js';
import { DRIZZLE } from '../../database/database.tokens.js';
import { pgErrorCode } from '../../database/pg-error.util.js';
import { stellarAuthAttempts, stellarAuthChallenges, userStellarIdentities, users } from '../../db/schema.js';
import { createWalletUser, findWalletUser, linkWalletIdentity } from '../../users/infrastructure/drizzle-wallet-user.repository.js';
import { withUserTransaction, type UserTransaction } from '../../users/infrastructure/user-persistence.js';
import { loadRoleCodes, withRoles } from '../../roles/infrastructure/role-rows.js';
import type { NewStellarChallenge, StellarAuthRepository, StellarBinding, StellarChallenge } from '../ports/stellar-auth-repository.port.js';
import { StellarRateLimitException } from '../stellar-rate-limit.js';
import { assertStellarMember } from '../stellar-session.js';

@Injectable()
export class DrizzleStellarAuthRepository implements StellarAuthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async issue(challenge: NewStellarChallenge, limits: { addressKey: string; ipKey: string }): Promise<StellarChallenge> {
    return this.transaction(async tx => {
      // Consistent lock ordering serializes volume windows across all instances.
      for (const key of [limits.addressKey, limits.ipKey, `flow:${challenge.flowHash}:${challenge.purpose}:${challenge.address}`].sort()) {
        await this.lock(tx, key);
      }
      const now = new Date();
      const counters: Array<{ key: string; count: number; expiresAt: Date }> = [];
      for (const [key, limit] of [[limits.addressKey, 5], [limits.ipKey, 30]] as const) {
        const [old] = await tx.select().from(stellarAuthAttempts).where(eq(stellarAuthAttempts.key, key)).for('update');
        const live = old && old.expiresAt > now;
        if (live && old.count >= limit) throw new StellarRateLimitException(Math.max(1, Math.ceil((old.expiresAt.getTime() - now.getTime()) / 1000)));
        counters.push({ key, count: live ? old.count + 1 : 1, expiresAt: live ? old.expiresAt : new Date(now.getTime() + 300_000) });
      }
      for (const counter of counters) {
        await tx.insert(stellarAuthAttempts).values({ ...counter, windowStartedAt: now }).onConflictDoUpdate({
          target: stellarAuthAttempts.key,
          set: { count: counter.count, expiresAt: counter.expiresAt },
        });
      }
      // Replacement is scoped to this browser, address and purpose only.
      await tx.update(stellarAuthChallenges).set({ consumedAt: now }).where(and(
        eq(stellarAuthChallenges.flowHash, challenge.flowHash), eq(stellarAuthChallenges.address, challenge.address),
        eq(stellarAuthChallenges.purpose, challenge.purpose), isNull(stellarAuthChallenges.consumedAt),
      ));
      const [row] = await tx.insert(stellarAuthChallenges).values(challenge).returning();
      // Short retention, bounded work. Only transient tables can be removed here.
      await tx.execute(sql`DELETE FROM stellar_auth_attempts WHERE key IN
        (SELECT key FROM stellar_auth_attempts WHERE expires_at < ${now} LIMIT 100 FOR UPDATE SKIP LOCKED)`);
      await tx.execute(sql`DELETE FROM stellar_auth_challenges WHERE id IN
        (SELECT id FROM stellar_auth_challenges WHERE expires_at < ${new Date(now.getTime() - 600_000)} LIMIT 100 FOR UPDATE SKIP LOCKED)`);
      return row as StellarChallenge;
    });
  }

  async identity(userId: string) {
    const [identity] = await this.db.select({ network: userStellarIdentities.network, address: userStellarIdentities.address }).from(userStellarIdentities).where(eq(userStellarIdentities.userId, userId));
    return identity ?? null;
  }

  async confirm(id: string, binding: StellarBinding, proof: (challenge: StellarChallenge) => Promise<void>) {
    const result = await this.transaction(async tx => {
      const [challenge] = await tx.select().from(stellarAuthChallenges).where(eq(stellarAuthChallenges.id, id)).for('update');
      if (!challenge || challenge.purpose !== binding.purpose || challenge.flowHash !== binding.flowHash ||
          challenge.userId !== binding.userId || challenge.sessionHash !== binding.sessionHash || challenge.network !== 'testnet') {
        throw new UnauthorizedException('Invalid Stellar flow');
      }
      if (challenge.consumedAt) throw new ConflictException('Stellar challenge consumed');
      const assertFresh = () => {
        if (challenge.expiresAt.getTime() <= Date.now() || challenge.failedAttempts >= 3 ||
          (binding.purpose === 'link' && (!binding.recentUntil || binding.recentUntil <= Date.now()))) {
          throw new UnauthorizedException('Invalid or expired Stellar challenge');
        }
      };
      assertFresh();
      try {
        await proof(challenge as StellarChallenge);
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) throw error;
        await tx.update(stellarAuthChallenges).set({ failedAttempts: challenge.failedAttempts + 1 }).where(eq(stellarAuthChallenges.id, id));
        return { error };
      }
      assertFresh();
      // Identity creation and challenge consumption share exactly one outer commit.
      await this.lock(tx, `identity:testnet:${challenge.address}`);
      const identity = { network: 'testnet' as const, address: challenge.address };
      let user;
      if (binding.purpose === 'link') {
        if (!binding.userId) throw new UnauthorizedException('Invalid Stellar flow');
        await this.currentMember(tx, binding.userId);
        user = await linkWalletIdentity(tx, binding.userId, identity);
      } else {
        user = await findWalletUser(tx, identity);
        if (user) user = await this.currentMember(tx, user.id);
        else user = await createWalletUser(tx, { ...identity, name: 'Freighter user' });
      }
      assertStellarMember(user);
      assertFresh();
      await tx.update(stellarAuthChallenges).set({ consumedAt: new Date() }).where(eq(stellarAuthChallenges.id, id));
      return { user };
    });
    if (result.error) throw result.error;
    return result.user!;
  }

  private async currentMember(tx: UserTransaction, userId: string) {
    const [row] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (!row) throw new UnauthorizedException('Invalid Stellar user');
    const roles = await loadRoleCodes(tx, [userId]);
    const user = withRoles(row, roles.get(userId) ?? []);
    assertStellarMember(user);
    return user;
  }

  private async lock(tx: UserTransaction, key: string): Promise<void> {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`stellar-auth:${key}`}, 0))`);
  }

  private async transaction<T>(work: (tx: UserTransaction) => Promise<T>): Promise<T> {
    try { return await withUserTransaction(this.db, work); }
    catch (error) {
      if (pgErrorCode(error) === '23505' || (error instanceof Error && error.message === 'STELLAR_IDENTITY_CONFLICT')) throw new ConflictException('Stellar identity already linked');
      if (pgErrorCode(error) === '55P03' || pgErrorCode(error) === '40P01') throw new ServiceUnavailableException('Stellar authentication temporarily unavailable');
      throw error;
    }
  }
}
