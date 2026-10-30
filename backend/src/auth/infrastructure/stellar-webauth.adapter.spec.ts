import { afterEach, describe, it, expect, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Keypair, Networks, Transaction, TransactionBuilder, WebAuth, xdr } from '@stellar/stellar-sdk';
import { StellarAuthConfig } from '../../config/stellar-auth.config.js';
import { StellarWebAuthAdapter } from './stellar-webauth.adapter.js';

const server = Keypair.random();
const client = Keypair.random();
const other = Keypair.random();
const config = new StellarAuthConfig(new ConfigService({ STELLAR_AUTH_ENABLED: 'true', STELLAR_AUTH_SIGNING_SECRET: server.secret(), STELLAR_AUTH_HMAC_SECRET: 'synthetic-hmac-test-key-32-characters', STELLAR_HOME_DOMAIN: 'pets.example', STELLAR_WEB_AUTH_DOMAIN: 'auth.pets.example' }));
const adapter = new StellarWebAuthAdapter(config);
const signed = (transaction: string, keys = [client], network = Networks.TESTNET) => {
  const tx = TransactionBuilder.fromXDR(transaction, network);
  tx.sign(...keys);
  return tx.toXDR();
};
const authority = (threshold = 1, signers = [{ key: client.publicKey(), weight: 1, type: 'ed25519_public_key' }]) => ({ thresholds: { high_threshold: threshold }, signers });
const horizon = (body: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(body, { status })));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('official Stellar SDK WebAuth adapter', () => {
  it('builds real sequence-zero, server-signed, five-minute SEP-10 and accepts an unfunded master only after a genuine 404', async () => {
    const challenge = adapter.build(client.publicKey());
    const { tx, clientAccountID } = WebAuth.readChallengeTx(challenge.transaction, server.publicKey(), Networks.TESTNET, 'pets.example', 'auth.pets.example');
    expect(clientAccountID).toBe(client.publicKey());
    expect(tx.sequence).toBe('0');
    expect(Number(tx.timeBounds!.maxTime) - Number(tx.timeBounds!.minTime)).toBe(300);
    expect(tx.operations).toHaveLength(2);
    expect(tx.operations[0]).toMatchObject({ type: 'manageData', name: 'pets.example auth', source: client.publicKey() });
    expect(Buffer.from((tx.operations[0] as { value: Uint8Array }).value).toString()).toHaveLength(64);
    horizon({ status: 404 }, 404);
    await expect(adapter.verify({ ...challenge, address: client.publicKey(), signedTxXdr: signed(challenge.transaction) })).resolves.toBeUndefined();
  });

  it('rejects missing/foreign client, false server, full-body alteration, wrong network, address, domains, operations and sequence', async () => {
    const challenge = adapter.build(client.publicKey());
    horizon({ status: 404 }, 404);
    const changed = (change: (tx: xdr.TransactionWire) => void) => {
      const envelope = (TransactionBuilder.fromXDR(challenge.transaction, Networks.TESTNET) as Transaction).toEnvelope().toXdrObject();
      if (envelope.type !== 2) throw new Error('Expected v1 transaction');
      change(envelope.v1.tx);
      envelope.v1.signatures = [];
      const tx = new Transaction(xdr.TransactionEnvelope.fromXdrObject(envelope), Networks.TESTNET); tx.sign(server, client); return tx.toXDR();
    };
    const cases = [
      ['server-only', challenge.transaction], ['foreign client', signed(challenge.transaction, [other])],
      ['false server', signed(WebAuth.buildChallengeTx(other, client.publicKey(), 'pets.example', 300, Networks.TESTNET, 'auth.pets.example'))],
      ['sequence', changed(tx => { tx.seqNum = 1n; })],
      ['operations', changed(tx => { tx.operations = tx.operations.slice(0, 1); })],
      ['whole body', changed(tx => { tx.fee = 201; })],
      ['home domain', signed(WebAuth.buildChallengeTx(server, client.publicKey(), 'foreign.example', 300, Networks.TESTNET, 'auth.pets.example'))],
      ['web domain', signed(WebAuth.buildChallengeTx(server, client.publicKey(), 'pets.example', 300, Networks.TESTNET, 'foreign.example'))],
      ['network', signed(challenge.transaction, [client], Networks.PUBLIC)],
      ['client address', signed(adapter.build(other.publicKey()).transaction, [other])],
    ];
    await expect(adapter.verify({ ...challenge, address: client.publicKey(), signedTxXdr: 'invalid' })).rejects.toMatchObject({ status: 400 });
    for (const [name, signedTxXdr] of cases) {
      await expect.soft(adapter.verify({ ...challenge, address: client.publicKey(), signedTxXdr: signedTxXdr! }), name).rejects.toMatchObject({ status: 401 });
    }
  });

  it('requires high-threshold weighted signers, excluding server and zero-weight master even at threshold zero', async () => {
    const challenge = adapter.build(client.publicKey());
    const proof = { ...challenge, address: client.publicKey(), signedTxXdr: signed(challenge.transaction) };
    horizon(authority(3, [{ key: client.publicKey(), weight: 1, type: 'ed25519_public_key' }, { key: other.publicKey(), weight: 2, type: 'ed25519_public_key' }]));
    await expect.soft(adapter.verify(proof)).rejects.toMatchObject({ status: 401 });
    await expect.soft(adapter.verify({ ...proof, signedTxXdr: signed(challenge.transaction, [client, other]) })).resolves.toBeUndefined();
    horizon(authority(0, [{ key: client.publicKey(), weight: 0, type: 'ed25519_public_key' }, { key: server.publicKey(), weight: 255, type: 'ed25519_public_key' }]));
    await expect.soft(adapter.verify(proof)).rejects.toMatchObject({ status: 401 });
    horizon(authority(2, [{ key: client.publicKey(), weight: 1, type: 'ed25519_public_key' }, { key: server.publicKey(), weight: 255, type: 'ed25519_public_key' }]));
    await expect.soft(adapter.verify(proof)).rejects.toMatchObject({ status: 401 });
  });

  it('uses server time at the boundary, not SDK clock leeway', async () => {
    const challenge = adapter.build(client.publicKey());
    horizon({ status: 404 }, 404);
    const proof = { ...challenge, address: client.publicKey(), signedTxXdr: signed(challenge.transaction) };
    vi.useFakeTimers(); vi.setSystemTime(challenge.expiresAt.getTime() - 1);
    await expect.soft(adapter.verify(proof)).resolves.toBeUndefined();
    vi.setSystemTime(challenge.expiresAt);
    await expect.soft(adapter.verify(proof)).rejects.toMatchObject({ status: 401 });
  });

  it('maps only genuine Horizon 404 to an unfunded account; all infrastructure failures are 503', async () => {
    const challenge = adapter.build(client.publicKey());
    const proof = { ...challenge, address: client.publicKey(), signedTxXdr: signed(challenge.transaction) };
    for (const status of [400, 401, 403, 429, 500, 503]) {
      horizon({}, status);
      await expect.soft(adapter.verify(proof), `HTTP ${status}`).rejects.toMatchObject({ status: 503 });
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('synthetic transport failure')));
    await expect.soft(adapter.verify(proof)).rejects.toMatchObject({ status: 503 });
    horizon({ unexpected: 'malformed account' });
    await expect.soft(adapter.verify(proof)).rejects.toMatchObject({ status: 503 });
  });
});
