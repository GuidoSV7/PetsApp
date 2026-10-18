import { describe, expect, it } from "vitest";
import {
  HARDCODED_ADMIN_EMAIL,
  HARDCODED_ADMIN_PASSWORD,
  buildHardcodedAdminSession,
  isHardcodedAdminLogin,
} from "@/features/auth/hardcoded-admin";

describe("hardcoded admin login", () => {
  it("accepts the bootstrap credentials (case-insensitive email)", () => {
    expect(
      isHardcodedAdminLogin(HARDCODED_ADMIN_EMAIL, HARDCODED_ADMIN_PASSWORD),
    ).toBe(true);
    expect(
      isHardcodedAdminLogin("Admin@PetsApp.io", HARDCODED_ADMIN_PASSWORD),
    ).toBe(true);
    expect(
      isHardcodedAdminLogin(HARDCODED_ADMIN_EMAIL, "wrong-pass"),
    ).toBe(false);
  });

  it("builds a super_admin session for the panel gate", () => {
    const session = buildHardcodedAdminSession();
    expect(session.user.role).toBe("super_admin");
    expect(session.user.email).toBe(HARDCODED_ADMIN_EMAIL);
    expect(session.token.length).toBeGreaterThan(0);
  });
});
