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

  it("persiste y recupera token y usuario merchant", () => {
    savePetsAppSession({
      token: "jwt-abc",
      user: {
        id: "u1",
        fullName: "Demo",
        email: "Merchant@Test.App",
        role: "merchant",
        country: "Bolivia",
        walletAddress: "wallet1",
      },
    });

    const sesion = getPetsAppSession();
    expect(sesion?.token).toBe("jwt-abc");
    expect(sesion?.user.email).toBe("Merchant@Test.App");
    expect(getSessionToken()).toBe("jwt-abc");
    expect(getSession()).toEqual({
      email: "merchant@test.app",
      role: "merchant",
    });
  });

  it("devuelve null si el JSON en localStorage es inválido", () => {
    localStorage.setItem("petsapp_session_v1", "{not-json");
    expect(getPetsAppSession()).toBeNull();
  });

  it("lee sesión legacy y migra al guardar", () => {
    localStorage.setItem(
      "petsapp_sesion_v1",
      JSON.stringify({
        token: "legacy",
        user: {
          id: "1",
          fullName: "Legacy",
          email: "legacy@test.app",
          role: "admin",
          country: "BO",
          walletAddress: null,
        },
      }),
    );
    expect(getPetsAppSession()?.token).toBe("legacy");
    savePetsAppSession(getPetsAppSession()!);
    expect(localStorage.getItem("petsapp_session_v1")).toBeTruthy();
    expect(localStorage.getItem("petsapp_sesion_v1")).toBeNull();
  });

  it("clearSession elimina la clave", () => {
    savePetsAppSession({
      token: "t",
      user: {
        id: "1",
        fullName: "A",
        email: "a@test.app",
        role: "admin",
        country: "BO",
        walletAddress: null,
      },
    });
    clearSession();
    expect(getPetsAppSession()).toBeNull();
  });
});
