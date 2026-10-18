import { describe, expect, it } from "vitest";
import {
  HARDCODED_ADMIN_TOKEN,
  buildHardcodedAdminSession,
  isHardcodedAdminBearer,
} from "@/features/auth/hardcoded-admin";

describe("isHardcodedAdminBearer", () => {
  it("matches the bootstrap session token", () => {
    expect(
      isHardcodedAdminBearer(`Bearer ${buildHardcodedAdminSession().token}`),
    ).toBe(true);
    expect(isHardcodedAdminBearer(`bearer ${HARDCODED_ADMIN_TOKEN}`)).toBe(
      true,
    );
    expect(isHardcodedAdminBearer("Bearer other")).toBe(false);
    expect(isHardcodedAdminBearer(null)).toBe(false);
  });
});
