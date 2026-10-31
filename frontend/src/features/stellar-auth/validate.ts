import { StrKey, Transaction, TransactionBuilder, WebAuth } from "@stellar/stellar-sdk";
import { isStellarConfigured, TESTNET_PASSPHRASE, type StellarConfig } from "./config";
import type { Challenge } from "./stellar-auth";

export function validateRoots(config: StellarConfig) {
  if (!isStellarConfigured(config) || !StrKey.isValidEd25519PublicKey(config.serverAccount)) {
    throw new Error("Freighter no está configurado en este entorno.");
  }
}
export function validateAddress(address: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) throw new Error("Dirección Stellar no compatible.");
}

/** SDK verifies the server signature; our stricter allowed body has exactly two ops. */
export function validateChallenge(challenge: Challenge, address: string, config: StellarConfig): Uint8Array {
  try {
    if (!challenge.challengeId || challenge.network_passphrase !== TESTNET_PASSPHRASE) throw new Error();
    const parsed = WebAuth.readChallengeTx(challenge.transaction, config.serverAccount, TESTNET_PASSPHRASE, config.homeDomain, config.webAuthDomain);
    const tx = parsed.tx;
    const [auth, domain] = tx.operations;
    const min = Number(tx.timeBounds?.minTime) * 1000;
    const max = Number(tx.timeBounds?.maxTime) * 1000;
    const now = Date.now();
    if (tx.toEnvelope().type !== "envelopeTypeTx" || parsed.clientAccountID !== address || tx.sequence !== "0" ||
        tx.source !== config.serverAccount || parsed.memo !== null || tx.memo.type !== "none" || tx.signatures.length !== 1 ||
        tx.operations.length !== 2 || auth.type !== "manageData" || auth.source !== address || auth.name !== `${config.homeDomain} auth` ||
        !auth.value || !/^[A-Za-z0-9+/]{64}$/.test(new TextDecoder().decode(auth.value)) ||
        domain.type !== "manageData" || domain.source !== config.serverAccount || domain.name !== "web_auth_domain" ||
        !domain.value || new TextDecoder().decode(domain.value) !== config.webAuthDomain ||
        !Number.isFinite(min) || !Number.isFinite(max) || max - min !== 300_000 || now < min || now >= max ||
        Date.parse(challenge.expiresAt) !== max) throw new Error();
    return tx.hash();
  } catch {
    // SDK errors can contain transaction fields; never surface their raw text.
    throw new Error("Desafío Stellar inválido o vencido. Volvé a intentar.");
  }
}
export function validateSignedBody(signed: string, expectedHash: Uint8Array) {
  try {
    const tx = TransactionBuilder.fromXDR(signed, TESTNET_PASSPHRASE);
    if (!(tx instanceof Transaction) || tx.toEnvelope().type !== "envelopeTypeTx" || !tx.hash().every((byte, i) => byte === expectedHash[i])) throw new Error();
  } catch {
    throw new Error("Freighter devolvió una prueba diferente. Volvé a intentar.");
  }
}
