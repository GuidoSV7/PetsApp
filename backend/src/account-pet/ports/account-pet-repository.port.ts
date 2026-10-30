import type { CareAction, PetCoatInput } from '../../pet/pet-rules.js';
import type { PetStateRow } from '../../pet/ports/pet-repository.port.js';

export const ACCOUNT_PET_REPOSITORY = Symbol('ACCOUNT_PET_REPOSITORY');
export type PetChoice = 'keep_account' | 'keep_guest';
export type AccountPetState = Omit<PetStateRow, 'guestKey'>;
export type ClaimConfirmed = {
  status: 'confirmed'; operationId?: string; petId: string; coins: number;
};
export type ClaimPending = {
  status: 'pending'; operationId: string; accountPetId: string; guestPetId: string;
  petId?: never; coins?: never;
};
export type ClaimResult = ClaimConfirmed | ClaimPending;
export type PetMutation =
  | { kind: 'care'; action: CareAction }
  | { kind: 'coat'; coat: PetCoatInput }
  | { kind: 'rename'; name: string };

/** T4 maps these semantic errors to HTTP; persistence exposes no routes. */
export class AccountPetError extends Error {
  constructor(readonly code:
    | 'USER_UNAVAILABLE' | 'PET_UNAVAILABLE' | 'PET_NOT_INITIALIZED'
    | 'PET_OPERATION_UNAVAILABLE' | 'PET_OPERATION_DECISION_MISMATCH'
    | 'PET_CONFLICT_STALE' | 'INVALID_PET_MUTATION' | 'INVALID_SUPPORT_REQUEST',
  ) { super(code); }
}

/** Owner ID comes from the authenticated server context, never a request body. */
export interface AccountPetRepository {
  bootstrap(userId: string, existingGuestKey?: string): Promise<ClaimResult>;
  resolve(userId: string, operationId: string, choice: PetChoice): Promise<ClaimConfirmed>;
  operationStatus(userId: string, operationId: string): Promise<ClaimResult>;
  readCurrent(userId: string): Promise<AccountPetState | null>;
  mutateCurrent(userId: string, mutation: PetMutation): Promise<AccountPetState>;
}

/** Internal support only. Not part of the account/self-service port. */
export type RestoreArchivedPet = {
  userId: string; petId: string; operationId: string; actor: string; reason: string;
};
export interface AccountPetRecovery {
  restoreArchived(request: RestoreArchivedPet): Promise<ClaimConfirmed>;
}
