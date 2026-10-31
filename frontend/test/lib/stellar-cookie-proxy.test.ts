import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mock = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("undici", () => ({ fetch: mock.fetch, Agent: class {} }));
import { POST } from "@/app/petsapp-api/[...path]/route";
afterEach(() => vi.unstubAllEnvs());
it("preserves separate HttpOnly flow/session Set-Cookie headers through the existing same-origin proxy", async () => {
 vi.stubEnv("PETSAPP_API_INTERNAL_URL", "http://127.0.0.1:3107");
 const headers = new Headers();
 headers.append("set-cookie", "synthetic_flow=fixture; Path=/; HttpOnly; SameSite=Lax");
 headers.append("set-cookie", "synthetic_session=fixture; Path=/; HttpOnly; SameSite=Lax");
 mock.fetch.mockResolvedValue({ status: 200, headers, arrayBuffer: async () => new TextEncoder().encode('{"user":{}}').buffer });
 const response = await POST(new NextRequest("http://localhost:3108/petsapp-api/auth/stellar/verify", { method: "POST", body: "{}" }), { params: Promise.resolve({ path: ["auth", "stellar", "verify"] }) });
 expect(response.status).toBe(200);
 expect(response.headers.getSetCookie().length).toBe(2);
 expect(response.headers.getSetCookie().every((value) => value.includes("HttpOnly"))).toBe(true);
 expect(mock.fetch).toHaveBeenCalledTimes(1);
});
