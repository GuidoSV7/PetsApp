import { IsIn, IsUUID, ValidateIf } from 'class-validator';
import type { PetChoice } from '../ports/account-pet-repository.port.js';

export class ClaimGuestDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  guestKey?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  operationId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['keep_account', 'keep_guest'])
  choice?: PetChoice;
}
