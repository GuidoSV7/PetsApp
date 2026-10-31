/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { hydrateNestSession, logoutNestSession } from "@/features/auth/session";
import { clearSession, getPetsAppSession, getSessionEpoch, savePetsAppSession } from "@/stores/auth-session";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), logout: vi.fn(), disconnect: vi.fn() }));
vi.mock("@/features/auth/api/auth.service", () => ({ fetchAuthProfile: mocks.profile, signOutPetsAppUser: mocks.logout }));
vi.mock("@/features/stellar-auth/freighter", () => ({ freighter: { disconnect: mocks.disconnect } }));
const user = { id: "wallet", name: "Michi", email: null, role: "member" as const, roles: ["member" as const], country: null };
beforeEach(() => { vi.clearAllMocks(); clearSession(); mocks.profile.mockResolvedValue(user); mocks.logout.mockResolvedValue(undefined); });
afterEach(() => { clearSession(); });
it("restores a nullable cookie session only from the server without trusting a local marker", async () => {
 localStorage.setItem("petsapp_session_v1", JSON.stringify({ token: null, method: "stellar", user: { ...user, id: "forged" } }));
 const result = await hydrateNestSession();
 expect(mocks.profile).toHaveBeenCalledTimes(1);
 expect(result).toEqual({ method: "stellar", token: null, user });
 expect(getPetsAppSession()).toEqual(result);
 expect(localStorage.getItem("petsapp_session_v1")).toBeNull();
});
it("preserves an existing email token and role after server confirmation", async () => {
 const email = { ...user, id: "email", email: "ada@example.test" };
 savePetsAppSession({ token: "email-token", user: email }); mocks.profile.mockResolvedValue(email);
 expect(await hydrateNestSession()).toEqual({ token: "email-token", user: email });
 expect(mocks.profile).toHaveBeenCalledTimes(1);
});
it("rejects an invalid cookie without an authenticated or guest fallback", async () => {
 mocks.profile.mockRejectedValue(new Error("Authentication required"));
 await expect(hydrateNestSession()).rejects.toThrow("Authentication required");
 expect(getPetsAppSession()).toBeNull();
});
it("clears local credentials, disconnects, and advances epoch even when Nest logout fails", async () => {
 savePetsAppSession({ token: "email-token", user: { ...user, email: "ada@example.test" } });
 mocks.logout.mockRejectedValue(new Error("offline")); const epoch = getSessionEpoch();
 await logoutNestSession();
 expect(mocks.logout).toHaveBeenCalledTimes(1); expect(mocks.disconnect).toHaveBeenCalledTimes(1);
 expect(getPetsAppSession()).toBeNull(); expect(getSessionEpoch()).toBeGreaterThan(epoch);
});
it("does not repopulate the old owner when a server profile completes after logout", async () => {
 let resolve!: (value: unknown) => void;
 mocks.profile.mockImplementation(() => new Promise((done) => { resolve = done; }));
 const result = hydrateNestSession();
 expect(mocks.profile).toHaveBeenCalledTimes(1);
 await logoutNestSession(); resolve(user);
 await expect(result).rejects.toThrow(); expect(getPetsAppSession()).toBeNull();
});
it("does not immediately rehydrate a leftover cookie after an offline logout/navigation", async () => {
 mocks.logout.mockRejectedValue(new Error("offline"));
 await logoutNestSession();
 await expect(hydrateNestSession()).rejects.toThrow();
 expect(mocks.profile).not.toHaveBeenCalled(); expect(getPetsAppSession()).toBeNull();
});
it.each(["admin", "super_admin"] as const)("does not restore a %s cookie as a wallet member", async (role) => {
 mocks.profile.mockResolvedValue({ ...user, role, roles: [role] });
 await expect(hydrateNestSession()).rejects.toThrow(); expect(getPetsAppSession()).toBeNull();
});
