import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextConfig } from "next";
import nextConfig from "@/../next.config";

type HeaderRule = NonNullable<NextConfig["headers"]> extends (...args: never[]) => infer R
  ? R extends Promise<infer T>
    ? T
    : never
  : never;

function expectType<T>(value: T): T {
  return value;
}

async function cabeceras(): Promise<Record<string, string>> {
  const reglas = expectType<HeaderRule>(await nextConfig.headers!());
  const planas = reglas.find((r) => r.source === "/:path*") ?? reglas[0]!;
  return Object.fromEntries(planas.headers.map((h) => [h.key, h.value]));
}

describe("security headers in next.config.ts (S3)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("applies the security headers to every route", async () => {
    const h = await cabeceras();
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toBe("camera=(self), microphone=(), geolocation=()");
  });

  it("ships a CSP that allows exactly what the app needs", async () => {
    const h = await cabeceras();
    const csp = h["Content-Security-Policy"];
    expect(csp).toBeDefined();
    for (const directiva of [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://accounts.google.com https://sdk.api.pollar.xyz https://albedo.link https://horizon.stellar.org https://horizon-testnet.stellar.org",
      "frame-src https://accounts.google.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect.soft(csp).toContain(directiva);
    }
    // The Google Identity Services script must be loadable.
    expect(csp).toContain("https://accounts.google.com");
  });

  it("does not allow unsafe-eval in production CSP", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const h = await cabeceras();
    expect(h["Content-Security-Policy"]).not.toContain("unsafe-eval");
  });

  it("sends HSTS in production only", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const h = await cabeceras();
    expect(h["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains",
    );
  });

  it("omits HSTS outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const h = await cabeceras();
    expect(h["Strict-Transport-Security"]).toBeUndefined();
  });
});
