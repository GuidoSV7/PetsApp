// S1/S3/S14: public proof orchestration, real SDK challenge, stale-link boundary.
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { Keypair, Networks, TransactionBuilder, WebAuth } from "@stellar/stellar-sdk";
import { authenticateWithFreighter, type Challenge } from "@/features/stellar-auth/stellar-auth";
import type { WalletAdapter } from "@/features/stellar-auth/freighter";
import { clearSession, getPetsAppSession, savePetsAppSession } from "@/stores/auth-session";
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() })); vi.mock("@/lib/axios", () => ({ default: http }));
const values = new Map<string, string>(); const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
vi.stubGlobal("window", { localStorage: storage }); vi.stubGlobal("localStorage", storage); afterAll(() => vi.unstubAllGlobals());
const server = Keypair.random(), client = Keypair.random(); const config = { serverAccount: server.publicKey(), homeDomain: "independent.example", webAuthDomain: "auth.independent.example" };
const user = { id: "proof-owner", name: "Proof", email: "proof@example.test", role: "member" as const, roles: ["member" as const], country: null };
let challenge: Challenge; let adapter: WalletAdapter;
beforeEach(() => { clearSession(); http.get.mockReset(); http.post.mockReset(); const transaction = WebAuth.buildChallengeTx(server, client.publicKey(), config.homeDomain, 300, Networks.TESTNET, config.webAuthDomain); const tx = TransactionBuilder.fromXDR(transaction, Networks.TESTNET) as import("@stellar/stellar-sdk").Transaction; challenge = { challengeId: "independent", transaction, network_passphrase: Networks.TESTNET, expiresAt: new Date(Number(tx.timeBounds!.maxTime) * 1000).toISOString() }; adapter = { kind: "freighter", connect: vi.fn().mockResolvedValue(client.publicKey()), disconnect: vi.fn(), getAddress: vi.fn().mockResolvedValue(client.publicKey()), getNetwork: vi.fn().mockResolvedValue({ network: "TESTNET", networkPassphrase: Networks.TESTNET }), signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: transaction, signerAddress: client.publicKey() }) }; http.post.mockResolvedValue({ data: challenge }); });
it("rejects network-passphrase metadata tampering without signing or changing stored credentials", async () => {
 savePetsAppSession({ token: "old", user }); storage.setItem("petsapp_sesion_v1", "old-legacy"); const before = [...values]; challenge.network_passphrase = Networks.PUBLIC;
 await expect(authenticateWithFreighter({ adapter, config })).rejects.toThrow("Desafío Stellar inválido o vencido. Volvé a intentar."); expect([...values]).toEqual(before); expect(getPetsAppSession()?.user.id).toBe(user.id); expect(adapter.signTransaction).not.toHaveBeenCalled(); expect(http.get).not.toHaveBeenCalled(); expect(http.post.mock.calls.map(([p]) => p)).toEqual(["/auth/stellar/challenge"]);
});
it("ignores link verification completing after a different confirmed owner takes over", async () => {
 savePetsAppSession({ token: "original", user }); let finish!: (v: unknown) => void; http.post.mockImplementation(async (path: string) => path.endsWith("challenge") ? { data: challenge } : new Promise(resolve => { finish = resolve; }));
 const proof = authenticateWithFreighter({ purpose: "link", password: "fixture", adapter, config }); await vi.waitFor(() => expect(http.post).toHaveBeenCalledTimes(2)); const replacement = { token: "new", user: { ...user, id: "replacement" } }; savePetsAppSession(replacement); const before = [...values]; finish({ data: { identity: { network: "testnet", address: client.publicKey() } } });
 await expect(proof).rejects.toThrow("La sesión cambió. Volvé a intentar."); expect(getPetsAppSession()).toEqual(replacement); expect([...values]).toEqual(before); expect(http.get).not.toHaveBeenCalled(); expect(http.post.mock.calls.map(([p]) => p)).toEqual(["/account/stellar/challenge", "/account/stellar/verify"]);
});

it("uses a real client-signed body and removes both Bearers before the server-confirmed private profile", async () => {
 savePetsAppSession({ token: "previous-bearer", user }); storage.setItem("petsapp_sesion_v1", "previous-legacy");
 const tx = TransactionBuilder.fromXDR(challenge.transaction, Networks.TESTNET) as import("@stellar/stellar-sdk").Transaction; tx.sign(client); (adapter.signTransaction as ReturnType<typeof vi.fn>).mockResolvedValue({ signedTxXdr: tx.toXDR(), signerAddress: client.publicKey() });
 const walletUser = { ...user, email: null }; http.post.mockImplementation(async (path: string) => ({ data: path.endsWith("challenge") ? challenge : { user: walletUser } }));
 http.get.mockImplementation(async () => { expect(storage.getItem("petsapp_session_v1")).toBeNull(); expect(storage.getItem("petsapp_sesion_v1")).toBeNull(); return { data: walletUser }; });
 await authenticateWithFreighter({ adapter, config }); expect(getPetsAppSession()).toEqual({ method: "stellar", token: null, user: walletUser }); expect(http.get.mock.calls.map(([p]) => p)).toEqual(["/auth/profile"]); expect(storage.getItem("petsapp_session_v1")).toBeNull(); expect(storage.getItem("petsapp_sesion_v1")).toBeNull();
});
