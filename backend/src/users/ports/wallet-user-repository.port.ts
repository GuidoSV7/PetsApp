import type { UserRow } from './user-repository.port.js';

export const WALLET_USER_REPOSITORY = Symbol('WALLET_USER_REPOSITORY');

export type WalletIdentity = { network: 'testnet'; address: string };
export type WalletSignup = WalletIdentity & { name: string };

/** Called only after server-side proof verification. No client-selected owner/role. */
export interface WalletUserRepository {
  create(data: WalletSignup): Promise<UserRow>;
  findByIdentity(identity: WalletIdentity): Promise<UserRow | null>;
}
