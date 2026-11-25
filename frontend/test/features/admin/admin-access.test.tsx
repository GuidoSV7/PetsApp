/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  clearSession,
  getPetsAppSession,
  getSessionToken,
  savePetsAppSession,
  type PetsAppSessionData,
} from "@/stores/auth-session";
import { legacySession, sessionKeys } from "../../fixtures/legacy-admin-session";

const { router, signOutPetsAppUser, fetchAuthProfile } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  signOutPetsAppUser: vi.fn().mockResolvedValue(undefined),
  fetchAuthProfile: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/admin" }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/BrandMark", () => ({ default: () => <span>mark</span> }));
vi.mock("@/features/auth/api/auth.service", () => ({ signOutPetsAppUser, fetchAuthProfile }));
import AdminLayout from "@/app/admin/AdminLayout";

function renderGate() { render(<AdminLayout><div>Protected admin content</div></AdminLayout>); }

function adminSession(role: "admin" | "super_admin" | "member" = "admin"): PetsAppSessionData {
  return {
    token: "real-nest-token",
    user: {
      id: "real-user",
      name: "Real",
      email: "real@example.test",
      role,
      roles: [role],
      country: null,
    },
  };
}

describe("actual AdminLayout session gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearSession();
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    fetchAuthProfile.mockImplementation(async () => {
      const s = getPetsAppSession();
      if (!s) throw new Error("no session");
      return s.user;
    });
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    clearSession();
  });

  it.each(sessionKeys)("S4/S5 old session in %s cannot render children or provide a bearer", (key) => {
    localStorage.setItem(key, JSON.stringify(legacySession));
    const before = sessionKeys.map((entry) => localStorage.getItem(entry));
    renderGate();
    expect.soft(screen.queryByText("Protected admin content") === null, "protected children absent").toBe(true);
    expect.soft(JSON.stringify(router.replace.mock.calls) === JSON.stringify([["/"]]), "existing absent-session redirect").toBe(true);
    expect.soft(getPetsAppSession() === null, "shared getter invalid").toBe(true);
    expect.soft(getSessionToken() === null, "no bearer").toBe(true);
    expect.soft(JSON.stringify(sessionKeys.map((entry) => localStorage.getItem(entry))) === JSON.stringify(before), "stored bytes unchanged").toBe(true);
  });

  it("S5 preserves absent-session redirect", () => {
    renderGate();
    expect(screen.queryByText("Protected admin content")).toBeNull();
    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/");
  });

  it.each(["admin", "super_admin", "member"] as const)("S5/S6 preserves real %s gate", async (role) => {
    const session = adminSession(role);
    savePetsAppSession(session);
    renderGate();
    if (role === "member") {
      expect(screen.queryByText("Protected admin content")).toBeNull();
      expect(router.replace).toHaveBeenCalledExactlyOnceWith("/account");
    } else {
      await waitFor(() => {
        expect(screen.queryByText("Protected admin content")).not.toBeNull();
      });
      expect(screen.getByRole("navigation", { name: "Secciones de administración" })).toBeTruthy();
      expect(router.replace).not.toHaveBeenCalled();
      expect(fetchAuthProfile).toHaveBeenCalled();
    }
    expect(getPetsAppSession()).toEqual(session);
  });

  it("#23 storage clear in another tab kicks the admin gate out", async () => {
    savePetsAppSession(adminSession("admin"));
    renderGate();
    await waitFor(() => {
      expect(screen.queryByText("Protected admin content")).not.toBeNull();
    });
    clearSession();
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: "petsapp_session_v1", newValue: null }));
    });
    await waitFor(() => {
      expect(screen.queryByText("Protected admin content")).toBeNull();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("#29 profile role demotion clears session and redirects out", async () => {
    savePetsAppSession(adminSession("admin"));
    fetchAuthProfile.mockResolvedValue({
      id: "real-user",
      name: "Real",
      email: "real@example.test",
      role: "member",
      roles: ["member"],
      country: null,
    });
    renderGate();
    await waitFor(() => {
      expect(signOutPetsAppUser).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/account");
    });
    expect(getPetsAppSession()).toBeNull();
    expect(screen.queryByText("Protected admin content")).toBeNull();
  });
});
