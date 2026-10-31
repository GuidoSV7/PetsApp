import api from "@/lib/axios";
import { fetchAuthProfile } from "@/features/auth/api/auth.service";
import { clearSession, getPetsAppSession, getSessionEpoch, invalidateSessionOwner, savePetsAppSession, subscribeSession, type SessionUser } from "@/stores/auth-session";
import { freighter, type WalletAdapter } from "./freighter";
import { getStellarConfig, TESTNET_PASSPHRASE, type StellarConfig } from "./config";
export type StellarIdentity = { network: "testnet"; address: string };
export type Challenge = { challengeId: string; transaction: string; network_passphrase: string; expiresAt: string };

export function isWalletMember(user: SessionUser): boolean {
  return Boolean(user?.id && typeof user.name === "string" && (user.email === null || typeof user.email === "string") &&
    user.role === "member" && Array.isArray(user.roles) && user.roles.length && user.roles.every((role) => role === "member"));
}
export async function fetchStellarIdentity() {
  const { data } = await api.get<{ identity: StellarIdentity | null }>("/account/stellar");
  return data;
}

export async function authenticateWithFreighter(options: { purpose?: "login" | "link"; password?: string; adapter?: WalletAdapter; config?: StellarConfig } = {}): Promise<void | { identity: StellarIdentity | null }> {
  let epoch = invalidateSessionOwner();
  const assertCurrent = () => { if (getSessionEpoch() !== epoch) throw new Error("La sesión cambió. Volvé a intentar."); };
  let controller = new AbortController();
  const unsubscribe = subscribeSession(() => { if (getSessionEpoch() !== epoch) controller.abort(); });
  const adapter = options.adapter ?? freighter;
  const purpose = options.purpose ?? "login";
  const config = options.config ?? getStellarConfig();
  try {
    const validation = await import("./validate");
    assertCurrent();
    validation.validateRoots(config);
    if (purpose === "link") {
      const session = getPetsAppSession();
      if (!session || !isWalletMember(session.user)) throw new Error("Ingresá con una cuenta de miembro para vincular Freighter.");
      if (session.user.email !== null && !options.password) throw new Error("Ingresá tu contraseña para vincular Freighter.");
    }
    const address = await adapter.connect();
    assertCurrent(); validation.validateAddress(address);
    const assertWallet = async () => {
      const network = await adapter.getNetwork(); assertCurrent();
      if (network.network !== "TESTNET" || network.networkPassphrase !== TESTNET_PASSPHRASE) throw new Error("Cambiá Freighter a testnet para continuar.");
      if (await adapter.getAddress() !== address) throw new Error("La cuenta de Freighter cambió. Volvé a conectar.");
      assertCurrent();
    };
    await assertWallet();
    const base = purpose === "link" ? "/account/stellar" : "/auth/stellar";
    const { data: challenge } = await api.post<Challenge>(`${base}/challenge`, { address, ...(purpose === "link" && options.password !== undefined ? { password: options.password } : {}) }, { signal: controller.signal });
    assertCurrent();
    const hash = validation.validateChallenge(challenge, address, config);
    await assertWallet();
    const signed = await adapter.signTransaction(challenge.transaction, address);
    assertCurrent(); await assertWallet();
    if (signed.signerAddress !== address) throw new Error("La cuenta firmante de Freighter cambió.");
    validation.validateSignedBody(signed.signedTxXdr, hash);
    validation.validateChallenge(challenge, address, config);
    const { data } = await api.post<{ user: SessionUser; identity: StellarIdentity | null }>(`${base}/verify`, { challengeId: challenge.challengeId, ...signed }, { signal: controller.signal });
    assertCurrent();
    if (purpose === "link") return { identity: data.identity };
    // Authorization outranks cookies: remove BOTH previous Bearer keys before profile.
    clearSession(); epoch = getSessionEpoch(); controller = new AbortController();
    const user = await fetchAuthProfile(controller.signal); assertCurrent();
    if (!isWalletMember(user) || user.id !== data.user?.id) throw new Error("La sesión Freighter no permite este acceso. Volvé a iniciar sesión.");
    savePetsAppSession({ token: null, method: "stellar", user });
  } catch (error) {
    adapter.disconnect();
    throw error;
  } finally {
    unsubscribe();
  }
}
