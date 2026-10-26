/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { getPetsAppSession, getSessionToken, savePetsAppSession, type PetsAppSessionData } from "@/stores/auth-session";
import { legacySession, sessionKeys } from "../../fixtures/legacy-admin-session";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/admin" }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/BrandMark", () => ({ default: () => <span>mark</span> }));
vi.mock("@/features/auth/api/auth.service", () => ({ signOutPetsAppUser: vi.fn().mockResolvedValue(undefined) }));
import AdminLayout from "@/app/admin/AdminLayout";

function renderGate() { render(<AdminLayout><div>Protected admin content</div></AdminLayout>); }

describe("actual AdminLayout session gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });
  afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

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

  it.each(["admin", "super_admin", "member"] as const)("S5/S6 preserves real %s gate", (role) => {
    const session: PetsAppSessionData = {
      token: "real-nest-token",
      user: { id: "real-user", name: "Real", email: "real@example.test", role, roles: [role], country: null },
    };
    savePetsAppSession(session);
    renderGate();
    if (role === "member") {
      expect(screen.queryByText("Protected admin content")).toBeNull();
      expect(router.replace).toHaveBeenCalledExactlyOnceWith("/account");
    } else {
      expect(screen.queryByText("Protected admin content")).not.toBeNull();
      expect(screen.getByRole("navigation", { name: "Secciones de administración" })).toBeTruthy();
      expect(router.replace).not.toHaveBeenCalled();
    }
    expect(getPetsAppSession()).toEqual(session);
  });
});
