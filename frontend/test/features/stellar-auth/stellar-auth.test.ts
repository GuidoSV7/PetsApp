import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Account, Keypair, Networks, Operation, TransactionBuilder, WebAuth, xdr, type Transaction } from "@stellar/stellar-sdk";
import { authenticateWithFreighter, type Challenge } from "@/features/stellar-auth/stellar-auth";
import type { WalletAdapter } from "@/features/stellar-auth/freighter";
import { clearSession, getPetsAppSession, getSessionToken, savePetsAppSession } from "@/stores/auth-session";
const http = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: http }));
const server = Keypair.random(); const client = Keypair.random();
const config = { serverAccount: server.publicKey(), homeDomain: "pets.example", webAuthDomain: "auth.pets.example" };
const user = { id: "wallet-member", name: "Michi", email: null, role: "member" as const, roles: ["member" as const], country: null };
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
vi.stubGlobal("window", { localStorage: storage });
vi.stubGlobal("localStorage", storage);
afterAll(() => vi.unstubAllGlobals());
let challenge: Challenge; let adapter: WalletAdapter;
beforeEach(() => {
 vi.clearAllMocks(); clearSession();
 const transaction = WebAuth.buildChallengeTx(server, client.publicKey(), config.homeDomain, 300, Networks.TESTNET, config.webAuthDomain);
 const max = Math.floor(Date.now()/1000) + 300;
 challenge = { challengeId: "proof-id", transaction, network_passphrase: Networks.TESTNET, expiresAt: new Date(max*1000).toISOString() };
 adapter = { kind: "freighter", connect: vi.fn().mockResolvedValue(client.publicKey()), disconnect: vi.fn(), getAddress: vi.fn().mockResolvedValue(client.publicKey()), getNetwork: vi.fn().mockResolvedValue({ network: "TESTNET", networkPassphrase: Networks.TESTNET }), signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: transaction, signerAddress: client.publicKey() }) };
 http.post.mockImplementation(async (path: string) => ({ data: path.endsWith("challenge") ? challenge : path.startsWith("/account") ? { identity: { network: "testnet", address: client.publicKey() } } : { user } }));
 http.get.mockImplementation(async () => {
   expect(getSessionToken()).toBeNull();
   expect(localStorage.getItem("petsapp_session_v1")).toBeNull();
   expect(localStorage.getItem("petsapp_sesion_v1")).toBeNull();
   return { data: user };
 });
});
afterEach(() => { clearSession(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("public Freighter authentication orchestration", () => {
 it("reads real SDK envelope discriminants from .type and rejects fee-bump challenges before signing", async () => {
   const inner = TransactionBuilder.fromXDR(challenge.transaction, Networks.TESTNET) as Transaction;
   expect(xdr.TransactionEnvelope.fromXDR(challenge.transaction, "base64").type).toBe("envelopeTypeTx");
   const feePayer = Keypair.random();
   const feeBump = TransactionBuilder.buildFeeBumpTransaction(feePayer.publicKey(), "100", inner, Networks.TESTNET);
   feeBump.sign(feePayer);
   const feeBumpXdr = feeBump.toXDR();
   expect(xdr.TransactionEnvelope.fromXDR(feeBumpXdr, "base64").type).toBe("envelopeTypeTxFeeBump");
   const previous = { token: "existing-bearer", user: { ...user, id: "previous", email: "previous@example.test" } };
   savePetsAppSession(previous);
   localStorage.setItem("petsapp_sesion_v1", "existing-legacy-bearer");
   const storedBefore = [...values];
   challenge.transaction = feeBumpXdr;

   await expect(authenticateWithFreighter({ adapter, config })).rejects.toThrow("Desafío Stellar inválido o vencido. Volvé a intentar.");
   expect(http.post.mock.calls.map(([path]) => path)).toEqual(["/auth/stellar/challenge"]);
   expect(http.post.mock.calls[0][1]).toEqual({ address: client.publicKey() });
   expect(adapter.signTransaction).not.toHaveBeenCalled();
   expect(http.get).not.toHaveBeenCalled();
   expect(getPetsAppSession()).toEqual(previous);
   expect([...values]).toEqual(storedBefore);
 });

 it("proves through Nest then clears both old Bearers BEFORE profile and accepts the nullable server member", async () => {
   savePetsAppSession({ token: "old", user: { ...user, id: "previous", email: "old@example.test" } });
   localStorage.setItem("petsapp_sesion_v1", "legacy-old");
   await authenticateWithFreighter({ adapter, config });
   expect(http.post.mock.calls.map(([path]) => path)).toEqual(["/auth/stellar/challenge", "/auth/stellar/verify"]);
   expect(http.get.mock.calls.map(([path]) => path)).toEqual(["/auth/profile"]);
   expect(getPetsAppSession()).toEqual({ method: "stellar", token: null, user });
   expect(adapter.signTransaction).toHaveBeenCalledTimes(1);
   expect(http.post.mock.calls.every(([path]) => !path.includes("pet"))).toBe(true);
 });

 it.each(["server", "signature", "body", "sequence", "operation", "extra_data", "home", "web", "missing_web", "nonce", "client", "network", "expired", "future", "duration", "expiry_metadata"])("rejects %s BEFORE asking for a signature, preserving the previous owner", async (bad) => {
   const previous = { token: "previous", user: { ...user, id: "previous", email: "previous@example.test" } };
   savePetsAppSession(previous);
   const now = Math.floor(Date.now()/1000);
   const min = bad === "expired" ? now-301 : bad === "future" ? now+30 : now;
   const max = min + (bad === "duration" ? 301 : 300);
   const source = bad === "server" ? Keypair.random() : server;
   const tx = new TransactionBuilder(new Account(source.publicKey(), bad === "sequence" ? "0" : "-1"), { fee: "100", networkPassphrase: bad === "network" ? Networks.PUBLIC : Networks.TESTNET, timebounds: { minTime: min, maxTime: max } })
     .addOperation(bad === "operation" ? Operation.payment({ destination: client.publicKey(), asset: (await import("@stellar/stellar-sdk")).Asset.native(), amount: "1" }) : Operation.manageData({ source: bad === "client" ? Keypair.random().publicKey() : client.publicKey(), name: `${bad === "home" ? "attacker.example" : config.homeDomain} auth`, value: bad === "nonce" ? "bad" : "a".repeat(64) }));
   if (bad !== "missing_web") tx.addOperation(Operation.manageData({ source: source.publicKey(), name: "web_auth_domain", value: bad === "web" ? "attacker.example" : config.webAuthDomain }));
   if (bad === "extra_data") tx.addOperation(Operation.manageData({ source: source.publicKey(), name: "other", value: "extra" }));
   const built = tx.build();
   if (bad === "body") built.signatures.push(...(TransactionBuilder.fromXDR(challenge.transaction, Networks.TESTNET) as import("@stellar/stellar-sdk").Transaction).signatures);
   else built.sign(bad === "signature" ? Keypair.random() : source);
   challenge.transaction = built.toXDR();
   challenge.expiresAt = new Date((bad === "expiry_metadata" ? max+1 : max)*1000).toISOString();
   await expect(authenticateWithFreighter({ adapter, config })).rejects.toThrow();
   expect(adapter.signTransaction).not.toHaveBeenCalled();
   expect(http.post.mock.calls.map(([path]) => path)).toEqual(["/auth/stellar/challenge"]);
   expect(http.get).not.toHaveBeenCalled();
   expect(getPetsAppSession()).toEqual(previous);
 });

 it("fails closed on missing/invalid independently configured public roots", async () => {
   for (const roots of [{ ...config, serverAccount: "" }, { ...config, homeDomain: "https://wallet.example/path" }, { ...config, webAuthDomain: "" }]) {
     await expect(authenticateWithFreighter({ adapter, config: roots })).rejects.toThrow();
   }
   expect(adapter.connect).not.toHaveBeenCalled();
   expect(adapter.signTransaction).not.toHaveBeenCalled();
   expect(http.post).not.toHaveBeenCalled(); expect(http.get).not.toHaveBeenCalled();
   expect(getPetsAppSession()).toBeNull();
 });

 it.each(["network", "address", "signed_body", "cancelled"])("rejects wallet %s changes/cancellation without verify or a new owner", async (bad) => {
   if (bad === "network") (adapter.getNetwork as ReturnType<typeof vi.fn>).mockResolvedValue({ network: "PUBLIC", networkPassphrase: Networks.PUBLIC });
   if (bad === "address") (adapter.getAddress as ReturnType<typeof vi.fn>).mockResolvedValue(Keypair.random().publicKey());
   if (bad === "signed_body") (adapter.signTransaction as ReturnType<typeof vi.fn>).mockResolvedValue({ signedTxXdr: WebAuth.buildChallengeTx(server, client.publicKey(), config.homeDomain, 300, Networks.TESTNET, config.webAuthDomain), signerAddress: client.publicKey() });
   if (bad === "cancelled") (adapter.signTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Firma cancelada"));
   await expect(authenticateWithFreighter({ adapter, config })).rejects.toThrow();
   expect(http.post.mock.calls.filter(([path]) => path.endsWith("verify"))).toHaveLength(0);
   expect(http.get).not.toHaveBeenCalled(); expect(getPetsAppSession()).toBeNull();
 });

 it("discards a challenge that completes after logout", async () => {
   let resolve!: (value: unknown) => void;
   http.post.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
   const request = authenticateWithFreighter({ adapter, config });
   await vi.waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
   clearSession(); resolve({ data: challenge });
   await expect(request).rejects.toThrow();
   expect(adapter.signTransaction).not.toHaveBeenCalled(); expect(http.get).not.toHaveBeenCalled();
   expect(getPetsAppSession()).toBeNull();
 });

 it("aborts in-flight proof HTTP when logout changes the owner", async () => {
   let resolve!: (value: unknown) => void;
   http.post.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
   const request = authenticateWithFreighter({ adapter, config });
   await vi.waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
   const signal = http.post.mock.calls[0][2]?.signal as AbortSignal | undefined;
   clearSession(); resolve({ data: challenge });
   await expect(request).rejects.toThrow();
   expect(signal?.aborted).toBe(true); expect(http.get).not.toHaveBeenCalled();
 });

 it.each([-1, 0])("handles the exact expiry boundary at maxTime%ims", async (offset) => {
   vi.spyOn(Date, "now").mockReturnValue(Date.parse(challenge.expiresAt)+offset);
   if (offset < 0) { await authenticateWithFreighter({ adapter, config }); expect(getPetsAppSession()?.user.id).toBe(user.id); }
   else {
     await expect(authenticateWithFreighter({ adapter, config })).rejects.toThrow();
     expect(adapter.signTransaction).not.toHaveBeenCalled(); expect(http.get).not.toHaveBeenCalled(); expect(getPetsAppSession()).toBeNull();
   }
 });

 it("uses link endpoints/password under the existing member session without replacing it", async () => {
   const session = { token: "email", user: { ...user, email: "member@example.test" } };
   savePetsAppSession(session);
   const result = await authenticateWithFreighter({ purpose: "link", password: "password-fixture", adapter, config });
   expect(result).toEqual({ identity: { network: "testnet", address: client.publicKey() } });
   expect(http.post.mock.calls.map(([path]) => path)).toEqual(["/account/stellar/challenge", "/account/stellar/verify"]);
   expect(http.post.mock.calls[0][1]).toEqual({ address: client.publicKey(), password: "password-fixture" });
   expect(Object.keys(http.post.mock.calls[1][1]).sort()).toEqual(["challengeId", "signedTxXdr", "signerAddress"]);
   expect(http.get).not.toHaveBeenCalled(); expect(getPetsAppSession()).toEqual(session);
 });

 it("retains backend recent-authentication rejection without signing or refreshing the session", async () => {
   const session = { token: "email", user: { ...user, email: "member@example.test" } };
   savePetsAppSession(session); http.post.mockRejectedValueOnce(new Error("Recent authentication required"));
   await expect(authenticateWithFreighter({ purpose: "link", password: "password-fixture", adapter, config })).rejects.toThrow("Recent authentication required");
   expect(adapter.signTransaction).not.toHaveBeenCalled(); expect(http.get).not.toHaveBeenCalled(); expect(getPetsAppSession()).toEqual(session);
 });

 it("does not accept a profile completing after logout or a profile for another user", async () => {
   let resolve!: (value: unknown) => void;
   http.get.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
   const request = authenticateWithFreighter({ adapter, config });
   await vi.waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));
   clearSession(); resolve({ data: user }); await expect(request).rejects.toThrow();
   expect(getPetsAppSession()).toBeNull();
   http.get.mockResolvedValueOnce({ data: { ...user, id: "other" } });
   await expect(authenticateWithFreighter({ adapter, config })).rejects.toThrow(); expect(getPetsAppSession()).toBeNull();
 });
});
