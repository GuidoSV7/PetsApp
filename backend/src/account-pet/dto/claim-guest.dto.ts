import { IsUUID, ValidateIf } from 'class-validator';

export class ClaimGuestDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  guestKey?: string;
}
