import { IsBase64, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class StellarVerifyDto {
  @IsUUID('4')
  challengeId: string;

  @IsString()
  @IsBase64()
  @MaxLength(16384)
  signedTxXdr: string;

  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/, { message: 'signerAddress must be a Stellar G address' })
  signerAddress: string;
}
