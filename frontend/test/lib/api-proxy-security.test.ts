import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as route from "@/app/petsapp-api/[...path]/route";

const { upstream } = vi.hoisted(() => ({ upstream: vi.fn() }));
vi.mock("undici", () => ({ Agent: class {}, fetch: upstream }));

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://front.invalid/petsapp-api/${path}`, { headers });
}

beforeEach(() => {
  upstream.mockReset();
  upstream.mockResolvedValue(new Response("ok", { status: 200 }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("proxy path validation (S6)", () => {
  it.each([
    ["segmento punto", ["."]],
    ["segmento ..", [".."]],
    [".. codificado", ["%2e%2e"]],
    ["barra codificada", ["auth%2Flogin"]],
    ["barra invertida codificada", ["auth%5Clogin"]],
    ["punto codificado", ["%2e"]],
    ["porcentaje inválido", ["%zz"]],
  ])("rechaza 400: %s", async (_nombre, segmentos) => {
    const res = await route.GET(request(segmentos.join("/")), {
      params: Promise.resolve({ path: segmentos }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "Invalid path" });
    expect(upstream).not.toHaveBeenCalled();
  });

  it("still forwards ordinary segments", async () => {
    const res = await route.GET(request("auth/login"), {
      params: Promise.resolve({ path: ["auth", "login"] }),
    });
    expect(res.status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});

describe("proxy outbound headers (S5)", () => {
  it("drops client-supplied hop-lies and sets its own x-forwarded-*", async () => {
    const res = await route.GET(
      request("auth/profile", {
        "x-forwarded-for": "6.6.6.6, 10.0.0.9",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "evil.example",
        "x-real-ip": "6.6.6.6",
        forwarded: "for=6.6.6.6",
        "cf-connecting-ip": "6.6.6.6",
        "x-custom": "keep-me",
      }),
      { params: Promise.resolve({ path: ["auth", "profile"] }) },
    );
    expect(res.status).toBe(200);
    const enviados = upstream.mock.lastCall![1]!.headers as Headers;
    expect(enviados.get("x-real-ip")).toBeNull();
    expect(enviados.get("forwarded")).toBeNull();
    expect(enviados.get("cf-connecting-ip")).toBeNull();
    // The trusted edge appends the real client IP last; the spoofed prefix dies.
    expect(enviados.get("x-forwarded-for")).toBe("10.0.0.9");
    expect(enviados.get("x-forwarded-proto")).toBe("http");
    expect(enviados.get("x-forwarded-host")).toBe("front.invalid");
    expect(enviados.get("x-custom")).toBe("keep-me");
  });

  it("marks the client as unknown when no edge forwarded an IP", async () => {
    await route.GET(request("auth/profile"), {
      params: Promise.resolve({ path: ["auth", "profile"] }),
    });
    const enviados = upstream.mock.lastCall![1]!.headers as Headers;
    expect(enviados.get("x-forwarded-for")).toBe("unknown");
  });
});

describe("proxy upstream failure (S7)", () => {
  it("answers a generic 502 and logs the detail server-side only", async () => {
    upstream.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1:3001"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await route.GET(request("auth/profile"), {
      params: Promise.resolve({ path: ["auth", "profile"] }),
    });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "Upstream unavailable" });
    expect(error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        message: expect.stringContaining("ECONNREFUSED"),
      }),
    );
  });
});
