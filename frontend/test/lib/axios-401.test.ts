import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/axios";
import {
  clearSession,
  getPetsAppSession,
  savePetsAppSession,
  type PetsAppSessionData,
} from "@/stores/auth-session";

const session: PetsAppSessionData = {
  token: "in-memory-token",
  user: {
    id: "u1",
    name: "Demo",
    email: "demo@test.app",
    role: "member",
    roles: ["member"],
    country: null,
  },
};

function installFakeWindow(pathname: string): { assigned: string[]; storage: Map<string, string> } {
  const assigned: string[] = [];
  const storage = new Map<string, string>();
  const local: Storage = {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
    getItem: (k) => (storage.has(k) ? storage.get(k)! : null),
    key: (i) => [...storage.keys()][i] ?? null,
    removeItem: (k) => storage.delete(k),
    setItem: (k, v) => storage.set(k, String(v)),
  };
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: local,
      location: {
        pathname,
        assign: (url: string) => {
          assigned.push(url);
        },
      },
    },
    configurable: true,
    writable: true,
  });
  return { assigned, storage };
}

function removeFakeWindow() {
  delete (globalThis as { window?: unknown }).window;
}

describe("axios 401 handling (S8)", () => {
  beforeEach(() => {
    removeFakeWindow();
    installFakeWindow("/admin/customers");
    savePetsAppSession(session);
  });

  afterEach(() => {
    removeFakeWindow();
    clearSession();
    vi.restoreAllMocks();
  });

  it("clears the session and redirects admin routes to /login on a 401", async () => {
    const { assigned } = installFakeWindow("/admin/customers");
    api.defaults.adapter = (config) =>
      Promise.reject({
        isAxiosError: true,
        config,
        response: { status: 401, data: { message: "expired" }, headers: {} },
      });
    await expect(api.get("/admin/users")).rejects.toMatchObject({
      codigoEstado: 401,
      message: "expired",
    });
    expect(getPetsAppSession()).toBeNull();
    expect(assigned).toEqual(["/login"]);
  });

  it("leaves non-401 errors alone", async () => {
    const { assigned } = installFakeWindow("/admin/customers");
    savePetsAppSession(session);
    api.defaults.adapter = (config) =>
      Promise.reject({
        isAxiosError: true,
        config,
        response: { status: 403, data: { message: "nope" }, headers: {} },
      });
    await expect(api.get("/admin/users")).rejects.toMatchObject({ codigoEstado: 403 });
    expect(getPetsAppSession()).not.toBeNull();
    expect(assigned).toEqual([]);
  });
});
