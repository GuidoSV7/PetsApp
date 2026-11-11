import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PetsAppApiError, listAdminUsers } from "@/app/_lib/petsapp-api";
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

function installFakeWindow(pathname: string): { assigned: string[] } {
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
  return { assigned };
}

function removeFakeWindow() {
  delete (globalThis as { window?: unknown }).window;
}

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

describe("petsapp-api fetch wrapper (S8/S1)", () => {
  beforeEach(() => {
    removeFakeWindow();
    installFakeWindow("/");
    vi.stubGlobal("fetch", fetchMock);
    savePetsAppSession(session);
    fetchMock.mockReset();
    savePetsAppSession(session);
  });

  afterEach(() => {
    removeFakeWindow();
    vi.unstubAllGlobals();
    clearSession();
  });

  it("clears the session and redirects to / on a 401", async () => {
    const { assigned } = installFakeWindow("/account");
    savePetsAppSession(session);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "expired" }), { status: 401 }),
    );
    await expect(listAdminUsers(session.token)).rejects.toMatchObject({
      codigoEstado: 401,
    });
    expect(getPetsAppSession()).toBeNull();
    expect(assigned).toEqual(["/"]);
  });

  it("sends the Authorization header only when an in-memory token exists", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response("[]", { status: 200 })));
    await listAdminUsers("tok-1");
    expect(
      new Headers(fetchMock.mock.calls[0]![1]?.headers).get("authorization"),
    ).toBe("Bearer tok-1");

    savePetsAppSession({ ...session, token: "" });
    await listAdminUsers("");
    expect(
      new Headers(fetchMock.mock.calls[1]![1]?.headers).get("authorization"),
    ).toBeNull();
  });

  it("throws PetsAppApiError with the upstream message for other errors", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "boom" }), { status: 500 }),
    );
    const error = await listAdminUsers("tok").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PetsAppApiError);
    expect((error as PetsAppApiError).message).toBe("boom");
    expect(getPetsAppSession()).not.toBeNull();
  });
});
