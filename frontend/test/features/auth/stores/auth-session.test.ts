/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  savePetsAppSession,
  getPetsAppSession,
  clearSession,
  getSessionToken,
  getSession,
  landingPathForRole,
  isAdminRole,
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
    clearSession();
    expect(getPetsAppSession()).toBeNull();
  });

  it("routes admin roles to /admin and members to /account", () => {
    expect(landingPathForRole("admin")).toBe("/admin");
    expect(landingPathForRole("super_admin")).toBe("/admin");
    expect(landingPathForRole("member")).toBe("/account");
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("member")).toBe(false);
  });
});
