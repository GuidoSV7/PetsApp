import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { StellarChallengeDto } from './stellar-challenge.dto.js';

export class StellarLinkChallengeDto extends StellarChallengeDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password?: string;
}
