import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '../../database/database.module.js';
import { DRIZZLE } from '../../database/database.tokens.js';
import { petStates } from '../../db/schema.js';
import { normalizeCoatPattern } from '../pet-rules.js';
import type {
  PetRepository,
  PetStateRow,
  PetStateWrite,
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
    const [row] = await this.db
      .insert(petStates)
      .values({
        guestKey,
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
      })
      .returning();
    return toRow(row);
  }

  async update(guestKey: string, data: PetStateWrite): Promise<PetStateRow> {
    const [row] = await this.db
      .update(petStates)
      .set({
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
        updatedAt: new Date(),
      })
      .where(eq(petStates.guestKey, guestKey))
      .returning();
    if (!row) {
      throw new Error(`pet state missing for guest ${guestKey}`);
    }
    return toRow(row);
  }
}
