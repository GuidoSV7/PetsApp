import { afterEach, describe, expect, it } from "vitest";
import {
  buildApiProxyDestination,
  shouldSkipTlsVerification,
  internalApiOrigin,
  petsappPublicClientUrl,
} from "@/lib/petsapp-api-origin";

describe("petsappPublicClientUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PETSAPP_API_URL;
  });

  it("usa el proxy same-origin si no hay env", () => {
    expect(petsappPublicClientUrl()).toBe("/petsapp-api");
  });

  it("no manda el browser a un host traefik.me (certificado default)", () => {
    process.env.NEXT_PUBLIC_PETSAPP_API_URL =
      "https://app-hack-bluetooth-monitor-38vpk4-c29fd3-187-127-17-128.traefik.me";
    expect(petsappPublicClientUrl()).toBe("/petsapp-api");
  });

  it("respeta localhost para desarrollo", () => {
    process.env.NEXT_PUBLIC_PETSAPP_API_URL = "http://localhost:3001/";
    expect(petsappPublicClientUrl()).toBe("http://localhost:3001");
  });
});

describe("internalApiOrigin", () => {
  afterEach(() => {
    delete process.env.PETSAPP_API_INTERNAL_URL;
    delete process.env.NETLIFY;
    delete process.env.URL;
    delete process.env.SITE_NAME;
  });

  it("prioriza PETSAPP_API_INTERNAL_URL", () => {
    process.env.PETSAPP_API_INTERNAL_URL = "http://backend:3001/";
    expect(internalApiOrigin()).toBe("http://backend:3001");
  });

  it("en Netlify usa el HTTPS público del API", () => {
    process.env.NETLIFY = "true";
    expect(internalApiOrigin()).toContain("traefik.me");
    expect(internalApiOrigin().startsWith("https://")).toBe(true);
  });

  it("detecta Netlify por URL aunque NETLIFY no sea true", () => {
    process.env.URL = "https://petsappbol.netlify.app";
    expect(internalApiOrigin()).toContain("traefik.me");
  });
});

describe("buildApiProxyDestination", () => {
  it("concatena ruta y query", () => {
    expect(
      buildApiProxyDestination("https://api.example", ["auth", "login"], "?x=1"),
    ).toBe("https://api.example/auth/login?x=1");
  });
});

describe("shouldSkipTlsVerification", () => {
  it("omite TLS solo en https de traefik.me", () => {
    expect(
      shouldSkipTlsVerification(
        "https://app-hack-bluetooth-monitor-38vpk4-c29fd3-187-127-17-128.traefik.me/auth/login",
      ),
    ).toBe(true);
    expect(shouldSkipTlsVerification("http://127.0.0.1:3001/auth/login")).toBe(
      false,
    );
  });
});
