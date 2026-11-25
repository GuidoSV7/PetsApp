import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  getPetsAppSession,
  savePetsAppSession,
  type PetsAppSessionData,
} from "@/stores/auth-session";

async function freshHandler() {
  vi.resetModules();
  const mod = await import("@/lib/session-expiry");
  return mod.handleSessionExpired;
}

const session: PetsAppSessionData = {
  token: "in-memory-token",
  user: {
    id: "u1",
    name: "Demo",
    email: "demo@test.app",
    role: "admin",
    roles: ["admin"],
    country: null,
  },
};

/** Fake window: real Storage semantics + controllable location. */
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

describe("shared 401 session expiry handler (S8)", () => {
  beforeEach(() => {
    installFakeWindow("/");
    savePetsAppSession(session);
    expect(getPetsAppSession()?.token).toBe("in-memory-token");
  });

  afterEach(() => {
    removeFakeWindow();
    clearSession();
  });

  it("clears the persisted session and the in-memory token", async () => {
    const { assigned, storage } = installFakeWindow("/admin/customers");
    savePetsAppSession(session);
    (await freshHandler())();
    expect(getPetsAppSession()).toBeNull();
    expect([...storage.keys()]).toEqual([]);
    expect(assigned).toEqual(["/login"]);
  });

  it("redirects admin routes to /login", async () => {
    const { assigned } = installFakeWindow("/admin/settings");
    (await freshHandler())();
    expect(assigned).toEqual(["/login"]);
  });

  it("redirects other routes to /", async () => {
    const { assigned } = installFakeWindow("/account");
    (await freshHandler())();
    expect(assigned).toEqual(["/"]);
  });

  it("does not redirect when already at the target entry (loop guard)", async () => {
    const { assigned } = installFakeWindow("/");
    (await freshHandler())();
    expect(assigned).toEqual([]);
    expect(getPetsAppSession()).toBeNull();
  });

  it("redirects at most once", async () => {
    const { assigned } = installFakeWindow("/admin/customers");
    const handler = await freshHandler();
    handler();
    handler();
    expect(assigned).toEqual(["/login"]);
  });
});
