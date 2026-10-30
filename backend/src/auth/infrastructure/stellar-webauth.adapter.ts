import { Injectable, UnauthorizedException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { StrKey, Transaction, TransactionBuilder, WebAuth } from '@stellar/stellar-sdk';
import { StellarAuthConfig } from '../../config/stellar-auth.config.js';
import type { StellarProof, StellarWebAuth } from '../ports/stellar-webauth.port.js';

@Injectable()
export class StellarWebAuthAdapter implements StellarWebAuth {
  constructor(private readonly config: StellarAuthConfig) {}
  build(address: string) {
    if (!StrKey.isValidEd25519PublicKey(address)) throw new BadRequestException('Unsupported Stellar address');
    const c = this.config.settings();
    const transaction = WebAuth.buildChallengeTx(c.signer, address, c.homeDomain, 300, c.passphrase, c.webAuthDomain);
    const tx = TransactionBuilder.fromXDR(transaction, c.passphrase) as Transaction;
    return { transaction, transactionHash: Buffer.from(tx.hash()).toString('hex'), expiresAt: new Date(Number(tx.timeBounds!.maxTime) * 1000) };
  }
  async verify(proof: StellarProof): Promise<void> {
    const c = this.config.settings();
    let tx: Transaction;
    try {
      const envelope = TransactionBuilder.fromXDR(proof.signedTxXdr, c.passphrase);
      if (!(envelope instanceof Transaction) || envelope.toEnvelope().type !== 'envelopeTypeTx') throw new Error('unsupported envelope');
    } catch {
      throw new BadRequestException('Unsupported Stellar XDR');
    }
    try {
      const parsed = WebAuth.readChallengeTx(proof.signedTxXdr, c.signer.publicKey(), c.passphrase, c.homeDomain, c.webAuthDomain);
      tx = parsed.tx;
      const now = Date.now();
      if (parsed.clientAccountID !== proof.address || Buffer.from(tx.hash()).toString('hex') !== proof.transactionHash ||
          !tx.timeBounds || now < Number(tx.timeBounds.minTime) * 1000 || now >= Number(tx.timeBounds.maxTime) * 1000 ||
          now >= proof.expiresAt.getTime() || Number(tx.timeBounds.maxTime) - Number(tx.timeBounds.minTime) !== 300) throw new Error('proof mismatch');
    } catch {
      throw new UnauthorizedException('Invalid Stellar proof');
    }
    let threshold: number;
    let signers: Array<{ key: string; weight: number; type: 'ed25519_public_key' }>;
    try {
      const response = await fetch(`${c.horizon}/accounts/${proof.address}`, { signal: AbortSignal.timeout(4000), redirect: 'error' });
      if (response.status === 404) {
        threshold = 1;
        signers = [{ key: proof.address, weight: 1, type: 'ed25519_public_key' }];
      } else {
        if (!response.ok) throw new Error('Horizon unavailable');
        const account = await response.json() as { thresholds?: { high_threshold?: unknown }; signers?: Array<{ key?: unknown; weight?: unknown; type?: unknown }> };
        const high = account.thresholds?.high_threshold;
        if (!Number.isInteger(high) || typeof high !== 'number' || high < 0 || high > 255 || !Array.isArray(account.signers)) throw new Error('Malformed authority');
        threshold = Math.max(1, high);
        signers = [];
        for (const signer of account.signers) {
          if (typeof signer.key !== 'string' || typeof signer.weight !== 'number' || !Number.isInteger(signer.weight) || signer.weight < 0 || signer.weight > 255) throw new Error('Malformed signer');
          if (signer.type === 'ed25519_public_key' && StrKey.isValidEd25519PublicKey(signer.key) && signer.key !== c.signer.publicKey() && signer.weight > 0) {
            signers.push({ key: signer.key, weight: signer.weight, type: 'ed25519_public_key' });
          }
        }
      }
    } catch {
      throw new ServiceUnavailableException('Stellar verification temporarily unavailable');
    }
    try {
      const verified = WebAuth.verifyChallengeTxThreshold(proof.signedTxXdr, c.signer.publicKey(), c.passphrase, threshold, signers, c.homeDomain, c.webAuthDomain);
      if (!verified.some(key => signers.some(s => s.key === key && s.weight > 0))) throw new Error('No effective client contribution');
    } catch {
      throw new UnauthorizedException('Invalid Stellar proof');
    }
  }
}
