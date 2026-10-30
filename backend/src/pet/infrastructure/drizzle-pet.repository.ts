import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import type { DrizzleDb } from '../../database/database.module.js';
import { DRIZZLE } from '../../database/database.tokens.js';
import { petStates, userPetOwnership } from '../../db/schema.js';
import { withUserTransaction, type UserTransaction } from '../../users/infrastructure/user-persistence.js';
import { normalizeCoatPattern } from '../pet-rules.js';
import { GuestPetUnavailableError, type PetRepository, type PetStateRow, type PetStateWrite } from '../ports/pet-repository.port.js';

type Row = typeof petStates.$inferSelect;

/** Shared stored-snapshot conversion, including legacy pattern normalization. */
export function toPetRow(row: Row): PetStateRow {
  return {
    id: row.id, guestKey: row.guestKey, coins: row.coins,
    needs: { hunger: row.hunger, fun: row.fun, energy: row.energy, hygiene: row.hygiene },
    coat: { primary: row.coatPrimary, secondary: row.coatSecondary, accent: row.coatAccent, pattern: normalizeCoatPattern(row.coatPattern) },
    statusKey: row.statusKey, name: row.name, renameCount: row.renameCount,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

export function petWriteValues(data: PetStateWrite) {
  return {
    coins: data.coins,
    hunger: data.needs.hunger, fun: data.needs.fun, energy: data.needs.energy, hygiene: data.needs.hygiene,
    coatPrimary: data.coat.primary, coatSecondary: data.coat.secondary, coatAccent: data.coat.accent, coatPattern: data.coat.pattern,
    statusKey: data.statusKey, name: data.name, renameCount: data.renameCount,
  };
}

export function createPetInTransaction(tx: UserTransaction, guestKey: string, data: PetStateWrite): Promise<Row>;
export function createPetInTransaction(tx: UserTransaction, guestKey: string, data: PetStateWrite, onConflict: 'ignore'): Promise<Row | undefined>;
export async function createPetInTransaction(tx: UserTransaction, guestKey: string, data: PetStateWrite, onConflict?: 'ignore'): Promise<Row | undefined> {
  const insert = tx.insert(petStates).values({ guestKey, ...petWriteValues(data) });
  const [row] = await (onConflict === 'ignore'
    ? insert.onConflictDoNothing({ target: petStates.guestKey })
    : insert).returning();
  return row;
}

/** Every adopter and writer takes these same stable row locks before ownership. */
export function lockPetRows(tx: UserTransaction, ids: string[]): Promise<Row[]> {
  return tx.select().from(petStates).where(inArray(petStates.id, ids)).orderBy(petStates.id).for('update');
}

async function assertGuest(tx: UserTransaction, row: Row): Promise<void> {
  const [owner] = await tx.select().from(userPetOwnership).where(eq(userPetOwnership.petId, row.id));
  if (owner) throw new GuestPetUnavailableError();
}

@Injectable()
export class DrizzlePetRepository implements PetRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  findByGuestKey(guestKey: string): Promise<PetStateRow | null> {
    return withUserTransaction(this.db, async (tx) => {
      const [row] = await tx.select().from(petStates).where(eq(petStates.guestKey, guestKey)).for('update');
      if (!row) return null;
      await assertGuest(tx, row);
      return toPetRow(row);
    });
  }

  create(guestKey: string, data: PetStateWrite): Promise<PetStateRow> {
    return withUserTransaction(this.db, async (tx) => {
      // A concurrent initializer/adopter may have been invisible to a preliminary
      // SELECT. Let uniqueness serialize first, then lock and inspect the winner.
      const inserted = await createPetInTransaction(tx, guestKey, data, 'ignore');
      if (inserted) return toPetRow(inserted);
      const [existing] = await tx.select().from(petStates).where(eq(petStates.guestKey, guestKey)).for('update');
      if (existing) await assertGuest(tx, existing);
      // Preserve the legacy raw unique violation for an unadopted duplicate.
      return toPetRow(await createPetInTransaction(tx, guestKey, data));
    });
  }

  update(guestKey: string, data: PetStateWrite): Promise<PetStateRow> {
    return withUserTransaction(this.db, async (tx) => {
      const [existing] = await tx.select().from(petStates).where(eq(petStates.guestKey, guestKey)).for('update');
      if (!existing) throw new Error(`pet state missing for guest ${guestKey}`);
      await assertGuest(tx, existing);
      const [row] = await tx.update(petStates).set({ ...petWriteValues(data), updatedAt: new Date() })
        .where(eq(petStates.id, existing.id)).returning();
      return toPetRow(row);
    });
  }
}
