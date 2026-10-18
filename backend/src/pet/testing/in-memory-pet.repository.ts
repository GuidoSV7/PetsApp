import { randomUUID } from 'node:crypto';
import type {
  PetRepository,
  PetStateRow,
  PetStateWrite,
} from '../ports/pet-repository.port.js';

export class InMemoryPetRepository implements PetRepository {
  private readonly byGuest = new Map<string, PetStateRow>();

  async findByGuestKey(guestKey: string): Promise<PetStateRow | null> {
    return this.byGuest.get(guestKey) ?? null;
  }

  async create(guestKey: string, data: PetStateWrite): Promise<PetStateRow> {
    const now = new Date();
    const row: PetStateRow = {
      id: randomUUID(),
      guestKey,
      coins: data.coins,
      needs: { ...data.needs },
      coat: { ...data.coat },
      statusKey: data.statusKey,
      createdAt: now,
      updatedAt: now,
    };
    this.byGuest.set(guestKey, row);
    return row;
  }

  async update(guestKey: string, data: PetStateWrite): Promise<PetStateRow> {
    const existing = this.byGuest.get(guestKey);
    if (!existing) {
      throw new Error(`pet state missing for guest ${guestKey}`);
    }
    const row: PetStateRow = {
      ...existing,
      coins: data.coins,
      needs: { ...data.needs },
      coat: { ...data.coat },
      statusKey: data.statusKey,
      updatedAt: new Date(),
    };
    this.byGuest.set(guestKey, row);
    return row;
  }
}
