import { IsString, Matches } from 'class-validator';

export class StellarChallengeDto {
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, { message: 'address must be a Stellar G address' })
  address: string;
}
