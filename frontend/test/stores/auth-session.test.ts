/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearSession, getPetsAppSession, getSession, getSessionToken, savePetsAppSession, updateUserInSession, type PetsAppSessionData } from "@/stores/auth-session";

const user = { id: "wallet-user", name: "Michi", email: null, role: "member" as const, roles: ["member" as const], country: null };
const walletSession = { token: null, method: "stellar", user } as unknown as PetsAppSessionData;

describe("cookie-backed wallet session public helpers", () => {
  beforeEach(() => clearSession());
  afterEach(() => clearSession());

  it("accepts a wallet member with NULL email without fabricating an email or Bearer", () => {
    savePetsAppSession(walletSession);
    expect(getPetsAppSession()).toEqual(walletSession);
    expect(getSession()).toEqual({ email: null, role: "member" });
    expect(getSessionToken()).toBeNull();
    updateUserInSession({ ...user, name: "Actualizado" } as unknown as PetsAppSessionData["user"]);
    expect(getPetsAppSession()).toEqual({ ...walletSession, user: { ...user, name: "Actualizado" } });
    expect(getSessionToken()).toBeNull();
  });

  it("removes primary and legacy Bearer credentials on wallet success and persists no wallet token", () => {
    savePetsAppSession({ token: "old-bearer", user: { ...user, email: "old@example.test" } });
    localStorage.setItem("petsapp_sesion_v1", "old-legacy-bearer");
    savePetsAppSession(walletSession);
    expect(getSessionToken()).toBeNull();
    expect(localStorage.getItem("petsapp_session_v1")).toBeNull();
    expect(localStorage.getItem("petsapp_sesion_v1")).toBeNull();
    expect(getPetsAppSession()).toEqual(walletSession);
    clearSession();
    expect(getPetsAppSession()).toBeNull();
  });

  it.each(["admin", "super_admin"] as const)("does not expose a %s wallet session through the public readers", (role) => {
    savePetsAppSession({ ...walletSession, user: { ...user, role, roles: [role] } });
    expect(getPetsAppSession()).toBeNull();
    expect(getSession()).toBeNull();
    expect(getSessionToken()).toBeNull();
  });

  it("does not turn a persisted wallet marker/address into authentication", () => {
    for (const key of ["petsapp_session_v1", "petsapp_sesion_v1"]) {
      clearSession();
      const raw = JSON.stringify(walletSession);
      localStorage.setItem(key, raw);
      expect(getPetsAppSession()).toBeNull();
      expect(getSessionToken()).toBeNull();
      expect(localStorage.getItem(key)).toBe(raw);
    }
  });

  it("does not relax email-session NULL email validation", () => {
    savePetsAppSession({ token: "token", user } as unknown as PetsAppSessionData);
    expect(getPetsAppSession()).toBeNull();
    expect(getSession()).toBeNull();
    expect(getSessionToken()).toBeNull();
  });
});
