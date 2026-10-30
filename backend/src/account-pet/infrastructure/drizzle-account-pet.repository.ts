import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DrizzleDb } from '../../database/database.module.js';
import { DRIZZLE } from '../../database/database.tokens.js';
import { petClaimOperations, petStates, userCoinBalances, userCoinEntries, userPetOwnership, users } from '../../db/schema.js';
import { createPetInTransaction, lockPetRows, petWriteValues, toPetRow } from '../../pet/infrastructure/drizzle-pet.repository.js';
import { applyCare, applyCoat, applyRename, initialSnapshot, isCareAction, isCoatPattern, isHexColor } from '../../pet/pet-rules.js';
import { initializeUserCoinBalance, withUserTransaction, type UserTransaction } from '../../users/infrastructure/user-persistence.js';
import {
  AccountPetError,
  type AccountPetRecovery,
  type AccountPetRepository,
  type AccountPetState,
  type ClaimConfirmed,
  type ClaimPending,
  type ClaimResult,
  type PetChoice,
  type PetMutation,
  type RestoreArchivedPet,
} from '../ports/account-pet-repository.port.js';

type StoredPet = typeof petStates.$inferSelect;
type Operation = typeof petClaimOperations.$inferSelect;

function pending(op: Operation): ClaimPending {
  if (!op.accountPetId || !op.guestPetId) throw new AccountPetError('PET_OPERATION_UNAVAILABLE');
  return { status: 'pending', operationId: op.id, accountPetId: op.accountPetId, guestPetId: op.guestPetId };
}

function privateState(pet: StoredPet, coins: number): AccountPetState {
  const { guestKey: _internalKey, ...state } = toPetRow(pet);
  return { ...state, coins };
}

/**
 * Lock order: user -> operation (when resolving) -> sorted pet UUIDs -> ownership.
 * Guest writes take the same pet lock before checking ownership. The locked user
 * serializes that user's current/credit/recovery changes, including empty sets.
 */
@Injectable()
export class DrizzleAccountPetRepository implements AccountPetRepository, AccountPetRecovery {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  bootstrap(userId: string, existingGuestKey?: string): Promise<ClaimResult> {
    return withUserTransaction(this.db, async (tx) => {
      await this.lockUser(tx, userId);
      const current = await this.currentOwnership(tx, userId);
      const [guest] = existingGuestKey
        ? await tx.select().from(petStates).where(eq(petStates.guestKey, existingGuestKey))
        : [];
      const pets = await lockPetRows(tx, [current?.petId, guest?.id].filter((id): id is string => !!id));
      const owners = await this.lockOwnership(tx, pets.map((pet) => pet.id));
      const lockedGuest = guest && pets.find((p) => p.id === guest.id);
      if (lockedGuest) {
        const owner = owners.find((row) => row.petId === lockedGuest.id);
        if (owner) {
          if (owner.userId !== userId || !current) throw new AccountPetError('PET_UNAVAILABLE');
          // Already in this user's custody: never adopt or credit it again.
          return this.currentResult(tx, userId, current.petId);
        }
      }
      if (current && lockedGuest) {
        const [existing] = await tx.select().from(petClaimOperations).where(and(
          eq(petClaimOperations.userId, userId), eq(petClaimOperations.status, 'pending'),
          eq(petClaimOperations.kind, 'claim'), eq(petClaimOperations.accountPetId, current.petId),
          eq(petClaimOperations.guestPetId, lockedGuest.id),
        ));
        if (existing) return pending(existing);
        const [op] = await tx.insert(petClaimOperations).values({ userId, accountPetId: current.petId, guestPetId: lockedGuest.id }).returning();
        return pending(op);
      }
      if (current) return this.currentResult(tx, userId, current.petId);
      await initializeUserCoinBalance(tx, userId);
      if (!lockedGuest) {
        const pet = await createPetInTransaction(tx, randomUUID(), initialSnapshot());
        await tx.insert(userPetOwnership).values({ userId, petId: pet.id, status: 'current' });
        return this.currentResult(tx, userId, pet.id);
      }
      const [op] = await tx.insert(petClaimOperations).values({ userId, guestPetId: lockedGuest.id }).returning();
      await tx.insert(userPetOwnership).values({ userId, petId: lockedGuest.id, status: 'current' });
      await this.creditLegacy(tx, userId, lockedGuest, op.id);
      return this.confirm(tx, op.id, userId, lockedGuest.id);
    });
  }

  resolve(userId: string, operationId: string, choice: PetChoice): Promise<ClaimConfirmed> {
    if (choice !== 'keep_account' && choice !== 'keep_guest') {
      return Promise.reject(new AccountPetError('PET_OPERATION_DECISION_MISMATCH'));
    }
    return withUserTransaction(this.db, async (tx) => {
      await this.lockUser(tx, userId);
      const op = await this.lockOperation(tx, userId, operationId);
      if (op.kind !== 'claim') throw new AccountPetError('PET_OPERATION_UNAVAILABLE');
      if (op.status === 'confirmed') {
        if (op.choice !== choice) throw new AccountPetError('PET_OPERATION_DECISION_MISMATCH');
        return this.confirmedResult(op);
      }
      const pets = await lockPetRows(tx, [op.accountPetId, op.guestPetId].filter((id): id is string => !!id));
      const owners = await this.lockOwnership(tx, pets.map((pet) => pet.id));
      const current = owners.find((owner) => owner.userId === userId && owner.status === 'current');
      const guest = pets.find((pet) => pet.id === op.guestPetId);
      const guestOwner = owners.find((owner) => owner.petId === op.guestPetId);
      if (!current || current.petId !== op.accountPetId || !guest || guestOwner) {
        throw new AccountPetError('PET_CONFLICT_STALE');
      }
      const keepAccount = choice === 'keep_account';
      if (!keepAccount) await this.archive(tx, current.petId, operationId, choice);
      await tx.insert(userPetOwnership).values({
        userId, petId: guest.id, status: keepAccount ? 'archived' : 'current',
        ...(keepAccount ? { archivedAt: new Date(), archiveReason: choice, archiveOperationId: operationId } : {}),
      });
      await this.creditLegacy(tx, userId, guest, operationId);
      return this.confirm(tx, operationId, userId, keepAccount ? current.petId : guest.id, choice);
    });
  }

  async operationStatus(userId: string, operationId: string): Promise<ClaimResult> {
    const [op] = await this.db.select().from(petClaimOperations).where(and(
      eq(petClaimOperations.id, operationId), eq(petClaimOperations.userId, userId), eq(petClaimOperations.kind, 'claim'),
    ));
    if (!op) throw new AccountPetError('PET_OPERATION_UNAVAILABLE');
    return op.status === 'confirmed' ? this.confirmedResult(op) : pending(op);
  }

  readCurrent(userId: string): Promise<AccountPetState | null> {
    return withUserTransaction(this.db, async (tx) => {
      await this.lockUser(tx, userId);
      const current = await this.currentOwnership(tx, userId);
      if (!current) return null;
      const [pet] = await lockPetRows(tx, [current.petId]);
      await this.requireCurrentOwner(tx, userId, pet.id);
      return privateState(pet, await this.balance(tx, userId));
    });
  }

  mutateCurrent(userId: string, mutation: PetMutation): Promise<AccountPetState> {
    return withUserTransaction(this.db, async (tx) => {
      await this.lockUser(tx, userId);
      const current = await this.currentOwnership(tx, userId);
      if (!current) throw new AccountPetError('PET_NOT_INITIALIZED');
      const [pet] = await lockPetRows(tx, [current.petId]);
      await this.requireCurrentOwner(tx, userId, pet.id);
      const coins = await this.balance(tx, userId);
      const state = privateState(pet, coins);
      let next;
      switch (mutation.kind) {
        case 'care': {
          if (!isCareAction(mutation.action)) throw new AccountPetError('INVALID_PET_MUTATION');
          next = applyCare(state, mutation.action).snapshot;
          break;
        }
        case 'coat': {
          const coat = mutation.coat;
          if (!isHexColor(coat.primary) || !isHexColor(coat.secondary) || !isHexColor(coat.accent)
            || (coat.pattern !== undefined && !isCoatPattern(coat.pattern))) {
            throw new AccountPetError('INVALID_PET_MUTATION');
          }
          next = applyCoat(state, { primary: coat.primary.toLowerCase(), secondary: coat.secondary.toLowerCase(), accent: coat.accent.toLowerCase(), pattern: coat.pattern });
          break;
        }
        case 'rename': {
          const result = applyRename(state, mutation.name);
          if (!result.ok) throw new AccountPetError('INVALID_PET_MUTATION');
          next = result.snapshot;
          break;
        }
        default: throw new AccountPetError('INVALID_PET_MUTATION');
      }
      // The canonical balance is never a whole-snapshot write target. Preserve
      // historical legacy coins too; only adoption is allowed to import them.
      const { coins: _coins, ...values } = petWriteValues(next);
      const [saved] = await tx.update(petStates).set({ ...values, updatedAt: new Date() }).where(eq(petStates.id, pet.id)).returning();
      return privateState(saved, coins);
    });
  }

  /** Future, individually authorized support action; never wired to HTTP. */
  restoreArchived(request: RestoreArchivedPet): Promise<ClaimConfirmed> {
    const { userId, petId, operationId, actor, reason } = request;
    if (!actor.trim() || !reason.trim()) return Promise.reject(new AccountPetError('INVALID_SUPPORT_REQUEST'));
    return withUserTransaction(this.db, async (tx) => {
      await this.lockUser(tx, userId);
      const [existing] = await tx.select().from(petClaimOperations).where(eq(petClaimOperations.id, operationId)).for('update');
      if (existing) {
        if (existing.kind !== 'restore' || existing.userId !== userId || existing.guestPetId !== petId
          || existing.supportActor !== actor || existing.reason !== reason) throw new AccountPetError('INVALID_SUPPORT_REQUEST');
        return this.confirmedResult(existing);
      }
      const current = await this.currentOwnership(tx, userId);
      const pets = await lockPetRows(tx, [current?.petId, petId].filter((id): id is string => !!id));
      const owners = await this.lockOwnership(tx, pets.map((pet) => pet.id));
      const target = owners.find((owner) => owner.petId === petId);
      if (!target || target.userId !== userId || target.status !== 'archived') throw new AccountPetError('PET_UNAVAILABLE');
      await tx.insert(petClaimOperations).values({ id: operationId, userId, kind: 'restore', accountPetId: current?.petId, guestPetId: petId, supportActor: actor, reason });
      if (current) await this.archive(tx, current.petId, operationId, reason);
      // Retain the original archive provenance on the restored ownership row.
      await tx.update(userPetOwnership).set({ status: 'current' }).where(eq(userPetOwnership.petId, petId));
      return this.confirm(tx, operationId, userId, petId);
    });
  }

  private async lockUser(tx: UserTransaction, userId: string): Promise<void> {
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
    if (!user) throw new AccountPetError('USER_UNAVAILABLE');
  }

  private async currentOwnership(tx: UserTransaction, userId: string) {
    const [current] = await tx.select().from(userPetOwnership).where(and(eq(userPetOwnership.userId, userId), eq(userPetOwnership.status, 'current')));
    return current;
  }

  private lockOwnership(tx: UserTransaction, petIds: string[]) {
    return tx.select().from(userPetOwnership).where(inArray(userPetOwnership.petId, petIds))
      .orderBy(userPetOwnership.petId).for('update');
  }

  private async requireCurrentOwner(tx: UserTransaction, userId: string, petId: string): Promise<void> {
    const [owner] = await this.lockOwnership(tx, [petId]);
    if (!owner || owner.userId !== userId || owner.status !== 'current') {
      throw new AccountPetError('PET_NOT_INITIALIZED');
    }
  }

  private async lockOperation(tx: UserTransaction, userId: string, operationId: string): Promise<Operation> {
    const [op] = await tx.select().from(petClaimOperations).where(and(eq(petClaimOperations.id, operationId), eq(petClaimOperations.userId, userId))).for('update');
    if (!op) throw new AccountPetError('PET_OPERATION_UNAVAILABLE');
    return op;
  }

  private async balance(tx: UserTransaction, userId: string): Promise<number> {
    const [row] = await tx.select().from(userCoinBalances).where(eq(userCoinBalances.userId, userId));
    if (!row) throw new Error('Canonical user balance missing');
    return row.balance;
  }

  private async currentResult(tx: UserTransaction, userId: string, petId: string): Promise<ClaimConfirmed> {
    return { status: 'confirmed', petId, coins: await this.balance(tx, userId) };
  }

  private async creditLegacy(tx: UserTransaction, userId: string, pet: StoredPet, operationId: string): Promise<void> {
    await initializeUserCoinBalance(tx, userId);
    const [entry] = await tx.insert(userCoinEntries).values({ userId, petId: pet.id, operationId, amount: pet.coins })
      .onConflictDoNothing({ target: userCoinEntries.petId }).returning();
    if (entry) await tx.update(userCoinBalances).set({ balance: sql`${userCoinBalances.balance} + ${entry.amount}` }).where(eq(userCoinBalances.userId, userId));
  }

  private async archive(tx: UserTransaction, petId: string, operationId: string, reason: string): Promise<void> {
    await tx.update(userPetOwnership).set({ status: 'archived', archivedAt: new Date(), archiveReason: reason, archiveOperationId: operationId }).where(eq(userPetOwnership.petId, petId));
  }

  private confirmedResult(op: Operation): ClaimConfirmed {
    if (!op.result) throw new AccountPetError('PET_OPERATION_UNAVAILABLE');
    return op.result;
  }

  private async confirm(tx: UserTransaction, operationId: string, userId: string, petId: string, choice?: PetChoice): Promise<ClaimConfirmed> {
    const result = { status: 'confirmed' as const, operationId, petId, coins: await this.balance(tx, userId) };
    await tx.update(petClaimOperations).set({ status: 'confirmed', confirmedAt: new Date(), result, ...(choice ? { choice } : {}) }).where(eq(petClaimOperations.id, operationId));
    return result;
  }
}
