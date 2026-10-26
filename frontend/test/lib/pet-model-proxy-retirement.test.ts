import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as route from "@/app/petsapp-api/[...path]/route";
import { legacyToken } from "../fixtures/legacy-admin-session";

const { upstream } = vi.hoisted(() => ({ upstream: vi.fn() }));
vi.mock("undici", () => ({ Agent: class {}, fetch: upstream }));
vi.mock("@/lib/petsapp-api-origin", () => ({
  internalApiOrigin: () => "http://isolated.invalid",
  shouldSkipTlsVerification: () => false,
  buildApiProxyDestination: (origin: string, segments: string[], query: string) =>
    `${origin}/${segments.join("/")}${query}`,
}));
afterEach(() => vi.clearAllMocks());

describe("model URLs through the preserved catch-all", () => {
  it("forwards legacy model requests and preserves upstream rejection without bootstrap authorization", async () => {
    for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
      const segments = method === "GET" ? ["pet", "model", "file"] : ["admin", "pet-model"];
      upstream.mockResolvedValue(new Response("upstream denial", {
        status: 403,
        headers: { "content-type": "text/plain" },
      }));
      const request = new NextRequest(`http://local.invalid/petsapp-api/${segments.join("/")}?t=1`, {
        method,
        headers: { authorization: `Bearer ${legacyToken}` },
        ...(method === "GET" ? {} : { body: "sentinel payload" }),
      });
      const response = await route[method](request, { params: Promise.resolve({ path: segments }) });
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("upstream denial");
      expect(response.headers.get("content-type")).toBe("text/plain");
      const [url, init] = upstream.mock.lastCall!;
      expect(url).toBe(`http://isolated.invalid/${segments.join("/")}?t=1`);
      expect(init.method).toBe(method);
      expect(init.headers.get("authorization") === `Bearer ${legacyToken}`).toBe(true);
      if (method !== "GET") expect(init.body.toString()).toBe("sentinel payload");
    }
    expect(upstream).toHaveBeenCalledTimes(4);
  });
});
