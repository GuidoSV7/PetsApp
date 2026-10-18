import type { PetCoat, PetNeeds } from '../pet-rules.js';

export const PET_REPOSITORY = Symbol('PET_REPOSITORY');

export type PetStateRow = {
  id: string;
  guestKey: string;
  coins: number;
  needs: PetNeeds;
  coat: PetCoat;
  statusKey: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PetStateWrite = {
  coins: number;
  needs: PetNeeds;
  coat: PetCoat;
  statusKey: string;
};

export interface PetRepository {
  findByGuestKey(guestKey: string): Promise<PetStateRow | null>;
  create(guestKey: string, data: PetStateWrite): Promise<PetStateRow>;
  update(guestKey: string, data: PetStateWrite): Promise<PetStateRow>;
}
