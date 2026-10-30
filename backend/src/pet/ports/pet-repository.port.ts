import type { PetCoat, PetNeeds } from '../pet-rules.js';

export const PET_REPOSITORY = Symbol('PET_REPOSITORY');

/** Adoption revokes both current and archived guest keys; never treat as missing. */
export class GuestPetUnavailableError extends Error {
  readonly code = 'GUEST_PET_UNAVAILABLE';
  constructor() { super('GUEST_PET_UNAVAILABLE'); }
}

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

export interface PetRepository {
  findByGuestKey(guestKey: string): Promise<PetStateRow | null>;
  create(guestKey: string, data: PetStateWrite): Promise<PetStateRow>;
  update(guestKey: string, data: PetStateWrite): Promise<PetStateRow>;
}
