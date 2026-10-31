import type freighterApi from "@stellar/freighter-api";
import { TESTNET_PASSPHRASE } from "./config";
export type FreighterApi = typeof freighterApi;
export type WalletAdapter = {
  readonly kind: "freighter";
  connect(): Promise<string>;
  disconnect(): void;
  getAddress(): Promise<string>;
  getNetwork(): Promise<{ network: string; networkPassphrase: string }>;
  signTransaction(transaction: string, address: string): Promise<{ signedTxXdr: string; signerAddress: string }>;
};
export class FreighterError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
const failures = {
  FREIGHTER_MISSING: "Instalá Freighter en un navegador compatible; en móvil podés usar email.",
  FREIGHTER_PERMISSION: "Permiso de Freighter rechazado. Podés reintentar.",
  FREIGHTER_NETWORK: "No pudimos leer la red de Freighter.",
  FREIGHTER_CANCELLED: "Firma cancelada. Podés reintentar.",
};
type Failure = keyof typeof failures;
function failure(code: Failure) { return new FreighterError(code, failures[code]); }
async function invoke<T>(code: Failure, action: () => Promise<T>): Promise<T> {
  try { return await action(); } catch { throw failure(code); }
}
async function loadFreighter(): Promise<FreighterApi> {
  if (typeof window === "undefined") throw failure("FREIGHTER_MISSING");
  const module = await import("@stellar/freighter-api");
  // The pinned package is UMD/CommonJS; support its actual default and named exports.
  return typeof module.requestAccess === "function" ? module : module.default;
}
export function createFreighterAdapter(load: () => Promise<FreighterApi> = loadFreighter): WalletAdapter {
  let provider: Promise<FreighterApi> | undefined;
  const api = () => provider ??= invoke("FREIGHTER_MISSING", load);
  return {
    kind: "freighter",
    disconnect() { provider = undefined; },
    async connect() {
      const sdk = await api();
      const connection = await invoke("FREIGHTER_MISSING", () => sdk.isConnected());
      if (!connection.isConnected || connection.error) throw failure("FREIGHTER_MISSING");
      const access = await invoke("FREIGHTER_PERMISSION", () => sdk.requestAccess());
      if (access.error || !access.address) throw failure("FREIGHTER_PERMISSION");
      return access.address;
    },
    async getAddress() {
      const sdk = await api();
      const result = await invoke("FREIGHTER_PERMISSION", () => sdk.getAddress());
      if (result.error || !result.address) throw failure("FREIGHTER_PERMISSION");
      return result.address;
    },
    async getNetwork() {
      const sdk = await api();
      const result = await invoke("FREIGHTER_NETWORK", () => sdk.getNetwork());
      if (result.error) throw failure("FREIGHTER_NETWORK");
      return { network: result.network, networkPassphrase: result.networkPassphrase };
    },
    async signTransaction(transaction, address) {
      const sdk = await api();
      const result = await invoke("FREIGHTER_CANCELLED", () => sdk.signTransaction(transaction, { address, networkPassphrase: TESTNET_PASSPHRASE }));
      if (result.error || !result.signedTxXdr) throw failure("FREIGHTER_CANCELLED");
      return { signedTxXdr: result.signedTxXdr, signerAddress: result.signerAddress };
    },
  };
}
export const freighter = createFreighterAdapter();
