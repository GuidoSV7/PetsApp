import type { PetCoat, PetNeeds } from '../pet-rules.js';

export const PET_REPOSITORY = Symbol('PET_REPOSITORY');

export type PetStateRow = {
  id: string;
  guestKey: string;
  coins: number;
  needs: PetNeeds;
  coat: PetCoat;
  statusKey: string;
  name: string;
  renameCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PetStateWrite = {
  coins: number;
  needs: PetNeeds;
  coat: PetCoat;
  statusKey: string;
  name: string;
  renameCount: number;
};

/** The pet row is gone when an update expected it (mapped to 404 upstream). */
export class PetStateMissingError extends Error {
  constructor(guestKey: string) {
    super(`pet state missing for guest ${guestKey}`);
    this.name = 'PetStateMissingError';
  }
}

export type PetMutate = (current: PetStateRow) => PetStateWrite;

export interface PetRepository {
  findByGuestKey(guestKey: string): Promise<PetStateRow | null>;
  /**
   * Race-safe first write: inserts the row or, on a concurrent insert with the
   * same guest key, re-reads and answers the winner's row. Never throws for a
   * duplicate guest key.
   */
  create(guestKey: string, data: PetStateWrite): Promise<PetStateRow>;
  /**
   * Reads the row `FOR UPDATE` inside one transaction, computes the next
   * state with `mutate`, and writes it back. Concurrent mutations therefore
   * cannot lose updates. Throws `PetStateMissingError` when the row is gone.
   */
  mutateLocked(guestKey: string, mutate: PetMutate): Promise<PetStateRow>;
}
