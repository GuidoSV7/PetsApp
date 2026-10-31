import { expect, it, vi } from "vitest";
import { createFreighterAdapter, type FreighterApi } from "@/features/stellar-auth/freighter";
import { TESTNET_PASSPHRASE } from "@/features/stellar-auth/config";
function provider() {
 return { isConnected: vi.fn().mockResolvedValue({ isConnected: true }), requestAccess: vi.fn().mockResolvedValue({ address: "public-address" }), getAddress: vi.fn().mockResolvedValue({ address: "public-address" }), getNetwork: vi.fn().mockResolvedValue({ network: "TESTNET", networkPassphrase: TESTNET_PASSPHRASE }), signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: "synthetic", signerAddress: "public-address" }) };
}
it("loads only on use, requests access, reads address/network and signs with the exact pinned API options", async () => {
 const api = provider(); const load = vi.fn().mockResolvedValue(api); const wallet = createFreighterAdapter(load);
 expect(load).not.toHaveBeenCalled(); expect(wallet.kind).toBe("freighter");
 expect(await wallet.connect()).toBe("public-address");
 expect(api.requestAccess).toHaveBeenCalledTimes(1);
 expect(await wallet.getAddress()).toBe("public-address");
 expect(await wallet.getNetwork()).toEqual({ network: "TESTNET", networkPassphrase: TESTNET_PASSPHRASE });
 await wallet.signTransaction("synthetic", "public-address");
 expect(api.signTransaction).toHaveBeenCalledExactlyOnceWith("synthetic", { address: "public-address", networkPassphrase: TESTNET_PASSPHRASE });
 wallet.disconnect(); expect(api.requestAccess).toHaveBeenCalledTimes(1);
});
it("normalizes thrown provider errors without exposing vendor internals", async () => {
 const api = provider(); api.requestAccess.mockRejectedValue(new Error("vendor-internal-detail"));
 const wallet = createFreighterAdapter(async () => api as unknown as FreighterApi);
 await expect(wallet.connect()).rejects.toMatchObject({ code: "FREIGHTER_PERMISSION", message: expect.stringContaining("Permiso de Freighter rechazado") });
 expect(api.signTransaction).not.toHaveBeenCalled();
});
it.each([
 ["missing", "FREIGHTER_MISSING", "Instalá Freighter"],
 ["permission", "FREIGHTER_PERMISSION", "Permiso de Freighter rechazado"],
 ["signature", "FREIGHTER_CANCELLED", "Firma cancelada"],
] as const)("normalizes %s without authenticating", async (kind, code, message) => {
 const api = provider();
 if (kind === "missing") api.isConnected.mockResolvedValue({ isConnected: false });
 if (kind === "permission") api.requestAccess.mockResolvedValue({ address: "", error: { code: -1 } } as never);
 if (kind === "signature") api.signTransaction.mockResolvedValue({ error: { code: -1 } } as never);
 const wallet = createFreighterAdapter(async () => api as unknown as FreighterApi);
 const request = kind === "signature" ? wallet.signTransaction("synthetic", "public-address") : wallet.connect();
 await expect(request).rejects.toMatchObject({ code, message: expect.stringContaining(message) });
 expect(api.signTransaction).toHaveBeenCalledTimes(kind === "signature" ? 1 : 0);
});
