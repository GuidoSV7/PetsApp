import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { upstream } = vi.hoisted(() => ({ upstream: vi.fn() }));
vi.mock("@/lib/petsapp-api-origin", () => ({
  internalApiOrigin: () => "http://internal.invalid",
}));

function adminRequest(cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  return new NextRequest("http://front.invalid/admin/customers", { headers });
}

async function freshProxy() {
  vi.resetModules();
  const mod = await import("@/proxy");
  return mod.default;
}

function profileBody(role: string) {
  return {
    id: "u1",
    name: "Admin",
    email: "admin@test.app",
    role,
    roles: [role],
    country: null,
  };
}

beforeEach(() => {
  upstream.mockReset();
  vi.stubGlobal("fetch", upstream);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("server-side /admin gate in src/proxy.ts (S2)", () => {
  it("bounds the profile lookup with an abort signal so a hung API cannot stall admin navigation", async () => {
    const proxy = await freshProxy();
    upstream.mockResolvedValue(
      new Response(JSON.stringify(profileBody("admin")), { status: 200 }),
    );
    await proxy(adminRequest("petsapp_session=cookie-jwt"));
    const [, init] = upstream.mock.lastCall!;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("redirects to /login when there is no session cookie", async () => {
    const proxy = await freshProxy();
    const res = await proxy(adminRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://front.invalid/login");
    expect(upstream).not.toHaveBeenCalled();
  });

  it("forwards the session cookie to the internal profile endpoint and lets admins through", async () => {
    const proxy = await freshProxy();
    upstream.mockResolvedValue(
      new Response(JSON.stringify(profileBody("admin")), { status: 200 }),
    );
    const res = await proxy(adminRequest("petsapp_session=cookie-jwt"));
    expect(upstream).toHaveBeenCalledTimes(1);
    const [url, init] = upstream.mock.lastCall!;
    expect(String(url)).toBe("http://internal.invalid/auth/profile");
    expect(new Headers(init?.headers).get("cookie")).toBe("petsapp_session=cookie-jwt");
    expect(res.status).toBe(200);
  });

  it("lets super_admin through", async () => {
    const proxy = await freshProxy();
    upstream.mockResolvedValue(
      new Response(JSON.stringify(profileBody("super_admin")), { status: 200 }),
    );
    const res = await proxy(adminRequest("petsapp_session=cookie-jwt"));
    expect(res.status).toBe(200);
  });

  it("redirects members to /account", async () => {
    const proxy = await freshProxy();
    upstream.mockResolvedValue(
      new Response(JSON.stringify(profileBody("member")), { status: 200 }),
    );
    const res = await proxy(adminRequest("petsapp_session=cookie-jwt"));
    expect(res.headers.get("location")).toBe("http://front.invalid/account");
  });

  it("redirects to /account when the profile endpoint rejects the cookie", async () => {
    const proxy = await freshProxy();
    upstream.mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const res = await proxy(adminRequest("petsapp_session=stale"));
    expect(res.headers.get("location")).toBe("http://front.invalid/account");
  });

  it("lets the request through when the internal API is unreachable (client gate as defense in depth)", async () => {
    const proxy = await freshProxy();
    upstream.mockRejectedValue(new Error("ECONNREFUSED"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await proxy(adminRequest("petsapp_session=cookie-jwt"));
    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("accepts the __Host- cookie name too", async () => {
    const proxy = await freshProxy();
    upstream.mockResolvedValue(
      new Response(JSON.stringify(profileBody("admin")), { status: 200 }),
    );
    const res = await proxy(adminRequest("__Host-petsapp_session=host-jwt"));
    const [, init] = upstream.mock.lastCall!;
    expect(new Headers(init?.headers).get("cookie")).toBe("__Host-petsapp_session=host-jwt");
    expect(res.status).toBe(200);
  });
});
