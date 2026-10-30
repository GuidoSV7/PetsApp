import type { UserRow } from '../../users/ports/user-repository.port.js';

export const STELLAR_AUTH_REPOSITORY = Symbol('STELLAR_AUTH_REPOSITORY');
export type StellarPurpose = 'login' | 'link';
export interface StellarChallenge {
  id: string;
  purpose: StellarPurpose;
  network: 'testnet';
  address: string;
  transactionHash: string;
  flowHash: string;
  userId: string | null;
  sessionHash: string | null;
  expiresAt: Date;
  failedAttempts: number;
  consumedAt: Date | null;
  createdAt: Date;
}
export interface StellarBinding {
  purpose: StellarPurpose;
  flowHash: string;
  userId: string | null;
  sessionHash: string | null;
  recentUntil?: number;
}
export type NewStellarChallenge = Omit<StellarChallenge, 'id' | 'createdAt' | 'failedAttempts' | 'consumedAt'>;
export interface StellarAuthRepository {
  issue(challenge: NewStellarChallenge, limits: { addressKey: string; ipKey: string }): Promise<StellarChallenge>;
  confirm(id: string, binding: StellarBinding, proof: (challenge: StellarChallenge) => Promise<void>): Promise<UserRow>;
  identity(userId: string): Promise<{ network: string; address: string } | null>;
}
