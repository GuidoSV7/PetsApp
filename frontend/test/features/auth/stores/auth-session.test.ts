/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { legacySession, sessionKeys } from "../../../fixtures/legacy-admin-session";
import {
  savePetsAppSession,
  getPetsAppSession,
  clearSession,
  getSessionToken,
  getSession,
  landingPathForRole,
  isAdminRole,
  isSessionRole,
  updateUserInSession,
  type PetsAppSessionData,
} from "@/stores/auth-session";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: memory,
    configurable: true,
    writable: true,
  });

  if (typeof globalThis.window === "undefined") {
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
      writable: true,
    });
  } else {
    Object.defineProperty(globalThis.window, "localStorage", {
      value: memory,
      configurable: true,
      writable: true,
    });
  }
}

describe("auth-session store", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    localStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(sessionKeys)("S4 rejects old session in %s through every reader without changing bytes", (key) => {
    localStorage.setItem(key, JSON.stringify(legacySession));
    const before = sessionKeys.map((entry) => localStorage.getItem(entry));
    expect.soft(getPetsAppSession() === null, "old session invalid").toBe(true);
    expect.soft(getSessionToken() === null, "no bearer").toBe(true);
    expect.soft(getSession() === null, "no normalized session").toBe(true);
    expect.soft(JSON.stringify(sessionKeys.map((entry) => localStorage.getItem(entry))) === JSON.stringify(before), "both stored bytes unchanged").toBe(true);
  });

  it.each(["admin", "super_admin", "member"] as const)("S6 preserves public helpers for real %s in either key", (role) => {
    const session: PetsAppSessionData = {
      token: "real-token",
      user: { id: "real-user", name: "Real", email: "Mixed@Example.Test", role, roles: [role], country: "BO" },
    };
    for (const key of sessionKeys) {
      localStorage.clear();
      localStorage.setItem(key, JSON.stringify(session));
      expect(getPetsAppSession()).toEqual(session);
      expect(getSessionToken()).toBe(session.token);
      expect(getSession()).toEqual({ email: "mixed@example.test", role });
      const updated = { ...session.user, name: "Updated" };
      updateUserInSession(updated);
      expect(getPetsAppSession()).toEqual({ token: session.token, user: updated });
      expect(localStorage.getItem(sessionKeys[0])).toBe(JSON.stringify({ token: session.token, user: updated }));
      expect(localStorage.getItem(sessionKeys[1])).toBeNull();
    }
  });

  it("S6 preserves primary-key precedence and does not fall back on malformed primary data", () => {
    const session: PetsAppSessionData = {
      token: "primary-real-token",
      user: { id: "real", name: "Real", email: "real@example.test", role: "admin", roles: ["admin"], country: null },
    };
    localStorage.setItem(sessionKeys[1], JSON.stringify({ ...session, token: "alternate-real-token" }));
    localStorage.setItem(sessionKeys[0], JSON.stringify(session));
    expect(getPetsAppSession()).toEqual(session);
    localStorage.setItem(sessionKeys[0], "{invalid");
    const before = sessionKeys.map((key) => localStorage.getItem(key));
    expect(getPetsAppSession()).toBeNull();
    expect(getSessionToken()).toBeNull();
    expect(getSession()).toBeNull();
    updateUserInSession(session.user);
    expect(sessionKeys.map((key) => localStorage.getItem(key))).toEqual(before);
  });

  it("S6 preserves absent and malformed session outcomes", () => {
    expect(getPetsAppSession()).toBeNull();
    expect(getSessionToken()).toBeNull();
    expect(getSession()).toBeNull();
    for (const raw of ["null", "{}", JSON.stringify({ token: "t", user: { email: "real@example.test", role: "unknown" } }), JSON.stringify({ token: "", user: { email: "real@example.test", role: "admin" } })]) {
      localStorage.setItem(sessionKeys[0], raw);
      expect(getPetsAppSession()).toBeNull();
      expect(getSessionToken()).toBeNull();
      expect(getSession()).toBeNull();
      expect(localStorage.getItem(sessionKeys[0])).toBe(raw);
    }
  });

  it("S6 preserves unavailable-storage reader, save and update behavior", () => {
    const session: PetsAppSessionData = {
      token: "real-token",
      user: { id: "real", name: "Real", email: "real@example.test", role: "admin", roles: ["admin"], country: null },
    };
    vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    expect(getPetsAppSession()).toBeNull();
    expect(getSessionToken()).toBeNull();
    expect(getSession()).toBeNull();
    expect(() => savePetsAppSession(session)).not.toThrow();
    expect(() => updateUserInSession(session.user)).not.toThrow();
  });

  it("persists and recovers token and member user", () => {
    savePetsAppSession({
      token: "jwt-abc",
      user: {
        id: "u1",
        name: "Demo",
        email: "Member@Test.App",
        role: "member",
        roles: ["member"],
        country: "BO",
      },
    });

    const session = getPetsAppSession();
    expect(session?.token).toBe("jwt-abc");
    expect(session?.user.email).toBe("Member@Test.App");
    expect(session?.user.name).toBe("Demo");
    expect(getSessionToken()).toBe("jwt-abc");
    expect(getSession()).toEqual({
      email: "member@test.app",
      role: "member",
    });
  });

  it("returns null when localStorage JSON is invalid", () => {
    localStorage.setItem("petsapp_session_v1", "{not-json");
    expect(getPetsAppSession()).toBeNull();
  });

  it("reads legacy session key and migrates on save", () => {
    localStorage.setItem(
      "petsapp_sesion_v1",
      JSON.stringify({
        token: "legacy",
        user: {
          id: "1",
          name: "Legacy",
          email: "legacy@test.app",
          role: "admin",
          roles: ["admin"],
          country: "BO",
        },
      }),
    );
    expect(getPetsAppSession()?.token).toBe("legacy");
    savePetsAppSession(getPetsAppSession()!);
    expect(localStorage.getItem("petsapp_session_v1")).toBeTruthy();
    expect(localStorage.getItem("petsapp_sesion_v1")).toBeNull();
  });

  it("clearSession removes the key", () => {
    savePetsAppSession({
      token: "t",
      user: {
        id: "1",
        name: "A",
        email: "a@test.app",
        role: "admin",
        roles: ["admin"],
        country: "BO",
      },
    });
    localStorage.setItem(sessionKeys[1], "alternate");
    clearSession();
    expect(getPetsAppSession()).toBeNull();
    expect(sessionKeys.map((key) => localStorage.getItem(key))).toEqual([null, null]);
  });

  it("routes admin roles to /admin and members to home play", () => {
    expect(landingPathForRole("admin")).toBe("/admin");
    expect(landingPathForRole("super_admin")).toBe("/admin");
    expect(landingPathForRole("member")).toBe("/");
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("member")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    for (const role of ["admin", "super_admin", "member"]) expect(isSessionRole(role)).toBe(true);
    expect(isSessionRole("unknown")).toBe(false);
  });
});

