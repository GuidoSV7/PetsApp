export const STELLAR_WEBAUTH = Symbol('STELLAR_WEBAUTH');
export interface StellarChallengeBody { transaction: string; transactionHash: string; expiresAt: Date }
export interface StellarProof { signedTxXdr: string; address: string; transactionHash: string; expiresAt: Date }
export interface StellarWebAuth {
  build(address: string): StellarChallengeBody;
  verify(proof: StellarProof): Promise<void>;
}
