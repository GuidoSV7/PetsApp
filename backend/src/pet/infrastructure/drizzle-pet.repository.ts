import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '../../database/database.module.js';
import { DRIZZLE } from '../../database/database.tokens.js';
import { petStates } from '../../db/schema.js';
import { normalizeCoatPattern } from '../pet-rules.js';
import {
  PetStateMissingError,
  type PetMutate,
  type PetRepository,
  type PetStateRow,
  type PetStateWrite,
} from '../ports/pet-repository.port.js';

type Row = typeof petStates.$inferSelect;

function toRow(row: Row): PetStateRow {
  return {
    id: row.id,
    guestKey: row.guestKey,
    coins: row.coins,
    needs: {
      hunger: row.hunger,
      fun: row.fun,
      energy: row.energy,
      hygiene: row.hygiene,
    },
    coat: {
      primary: row.coatPrimary,
      secondary: row.coatSecondary,
      accent: row.coatAccent,
      pattern: normalizeCoatPattern(row.coatPattern),
    },
    statusKey: row.statusKey,
    name: row.name,
    renameCount: row.renameCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toColumns(data: PetStateWrite, updatedAt?: Date) {
  return {
    coins: data.coins,
    hunger: data.needs.hunger,
    fun: data.needs.fun,
    energy: data.needs.energy,
    hygiene: data.needs.hygiene,
    coatPrimary: data.coat.primary,
    coatSecondary: data.coat.secondary,
    coatAccent: data.coat.accent,
    coatPattern: data.coat.pattern,
    statusKey: data.statusKey,
    name: data.name,
    renameCount: data.renameCount,
    ...(updatedAt ? { updatedAt } : {}),
  };
}

@Injectable()
export class DrizzlePetRepository implements PetRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findByGuestKey(guestKey: string): Promise<PetStateRow | null> {
    const [row] = await this.db
      .select()
      .from(petStates)
      .where(eq(petStates.guestKey, guestKey))
      .limit(1);
    return row ? toRow(row) : null;
  }

  async create(guestKey: string, data: PetStateWrite): Promise<PetStateRow> {
    // Race-safe first write: a concurrent insert with the same guest key
    // conflicts, and this call answers the winner's row instead of failing.
    const [inserted] = await this.db
      .insert(petStates)
      .values({ guestKey, ...toColumns(data) })
      .onConflictDoNothing({ target: petStates.guestKey })
      .returning();
    if (inserted) return toRow(inserted);

    const row = await this.findByGuestKey(guestKey);
    if (!row) throw new PetStateMissingError(guestKey);
    return row;
  }

  async mutateLocked(
    guestKey: string,
    mutate: PetMutate,
  ): Promise<PetStateRow> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(petStates)
        .where(eq(petStates.guestKey, guestKey))
        .limit(1)
        .for('update');
      if (!current) throw new PetStateMissingError(guestKey);

      const [updated] = await tx
        .update(petStates)
        .set(toColumns(mutate(toRow(current)), new Date()))
        .where(eq(petStates.guestKey, guestKey))
        .returning();
      if (!updated) throw new PetStateMissingError(guestKey);
      return toRow(updated);
    });
  }
}
