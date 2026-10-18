import { describe, expect, it, vi } from "vitest";
import {
  HARDCODED_ADMIN_TOKEN,
  buildHardcodedAdminSession,
} from "@/features/auth/hardcoded-admin";
import { assertAdminBearer } from "@/lib/assert-admin-bearer";

describe("assertAdminBearer", () => {
  it("rejects missing Authorization without calling Nest", async () => {
    const fetchProfile = vi.fn();
    const result = await assertAdminBearer(null, { fetchProfile });
    expect(result).toEqual({
      ok: false,
      status: 401,
      message: "Authentication required",
    });
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it("accepts the hardcoded bootstrap admin bearer without Nest", async () => {
    const fetchProfile = vi.fn();
    const session = buildHardcodedAdminSession();
    const result = await assertAdminBearer(`Bearer ${session.token}`, {
      fetchProfile,
    });
    expect(result).toEqual({ ok: true });
    expect(session.token).toBe(HARDCODED_ADMIN_TOKEN);
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it("accepts a Nest admin profile", async () => {
    const fetchProfile = vi.fn(async () =>
      Response.json({
        role: "super_admin",
        roles: ["super_admin", "admin"],
      }),
    );
    const result = await assertAdminBearer("Bearer nest-jwt", { fetchProfile });
    expect(result).toEqual({ ok: true });
    expect(fetchProfile).toHaveBeenCalledOnce();
  });

  it("maps AbortSignal timeout to a fast 502", async () => {
    const fetchProfile = vi.fn(async ({ signal }) => {
      return await new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "TimeoutError";
          reject(err);
        });
      });
    });
    const result = await assertAdminBearer("Bearer nest-jwt", {
      fetchProfile,
      timeoutMs: 20,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.message).toMatch(/tiempo/i);
    }
  });
});
