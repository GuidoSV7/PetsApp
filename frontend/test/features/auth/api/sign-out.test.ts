/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { signOutPetsAppUser } = vi.hoisted(() => ({
  signOutPetsAppUser: vi.fn(),
}));

vi.mock("@/features/auth/api/auth.service", () => ({
  signOutPetsAppUser,
}));

import {
  clearLogoutCookiePending,
  consumeLogoutCookiePending,
  markLogoutCookiePending,
  retrySignOutPetsAppCookie,
  signOutPetsAppAndClearLocal,
} from "@/features/auth/api/sign-out";
import { clearSession, savePetsAppSession, getPetsAppSession } from "@/stores/auth-session";

describe("signOutPetsAppAndClearLocal (#82)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearSession();
    signOutPetsAppUser.mockReset();
    savePetsAppSession({
      token: "t",
      user: {
        id: "1",
        name: "Ana",
        email: "a@test.app",
        role: "member",
        roles: ["member"],
        country: null,
      },
    });
  });

  it("clears local session when API logout succeeds", async () => {
    signOutPetsAppUser.mockResolvedValue(undefined);
    const result = await signOutPetsAppAndClearLocal();
    expect(result.cookieCleared).toBe(true);
    expect(getPetsAppSession()).toBeNull();
    expect(consumeLogoutCookiePending()).toBe(false);
  });

  it("still clears local session and marks pending when API logout fails", async () => {
    signOutPetsAppUser.mockRejectedValue(new Error("down"));
    const result = await signOutPetsAppAndClearLocal();
    expect(result.cookieCleared).toBe(false);
    expect(getPetsAppSession()).toBeNull();
    expect(consumeLogoutCookiePending()).toBe(true);
  });

  it("retry clears the pending flag on success", async () => {
    markLogoutCookiePending();
    signOutPetsAppUser.mockResolvedValue(undefined);
    expect(await retrySignOutPetsAppCookie()).toBe(true);
    expect(consumeLogoutCookiePending()).toBe(false);
  });

  it("consume is idempotent after clear", () => {
    markLogoutCookiePending();
    clearLogoutCookiePending();
    expect(consumeLogoutCookiePending()).toBe(false);
  });
});
