/**
 * @vitest-environment jsdom
 * S10 / #70 — no admin chrome until fetchAuthProfile succeeds (or error + retry).
 */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  clearSession,
  savePetsAppSession,
  type PetsAppSessionData,
} from "@/stores/auth-session";

const { router, signOutPetsAppUser, fetchAuthProfile } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  signOutPetsAppUser: vi.fn().mockResolvedValue(undefined),
  fetchAuthProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/admin",
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/ui/BrandMark", () => ({ default: () => <span>mark</span> }));
vi.mock("@/features/auth/api/auth.service", () => ({
  signOutPetsAppUser,
  fetchAuthProfile,
}));

import AdminLayout from "@/app/admin/AdminLayout";

function adminSession(): PetsAppSessionData {
  return {
    token: "real-nest-token",
    user: {
      id: "real-user",
      name: "Real",
      email: "real@example.test",
      role: "admin",
      roles: ["admin"],
      country: null,
    },
  };
}

describe("AdminLayout profile gate (#70 / S10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearSession();
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    clearSession();
  });

  it("does not render admin chrome while fetchAuthProfile is pending", async () => {
    let resolveProfile!: (value: unknown) => void;
    fetchAuthProfile.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve;
        }),
    );
    savePetsAppSession(adminSession());
    render(
      <AdminLayout>
        <div>Protected admin content</div>
      </AdminLayout>,
    );

    expect(screen.getByText(/Comprobando sesión/i)).toBeTruthy();
    expect(screen.queryByText("Protected admin content")).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Secciones de administración" }),
    ).toBeNull();
    expect(
      document.querySelector('[data-purpose="admin-sidebar"]'),
    ).toBeNull();

    resolveProfile({
      id: "real-user",
      name: "Real",
      email: "real@example.test",
      role: "admin",
      roles: ["admin"],
      country: null,
    });

    await waitFor(() => {
      expect(screen.getByText("Protected admin content")).toBeTruthy();
    });
    expect(
      screen.getByRole("navigation", { name: "Secciones de administración" }),
    ).toBeTruthy();
  });

  it("shows Spanish error with Reintentar when profile fetch fails", async () => {
    fetchAuthProfile
      .mockRejectedValueOnce(new Error("Upstream unavailable"))
      .mockResolvedValueOnce({
        id: "real-user",
        name: "Real",
        email: "real@example.test",
        role: "admin",
        roles: ["admin"],
        country: null,
      });
    savePetsAppSession(adminSession());
    render(
      <AdminLayout>
        <div>Protected admin content</div>
      </AdminLayout>,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(screen.queryByText("Protected admin content")).toBeNull();
    expect(screen.getByRole("alert").textContent).toMatch(/sesión|administración/i);
    expect(screen.getByRole("alert").textContent).not.toMatch(/Upstream unavailable/i);

    fireEvent.click(screen.getByRole("button", { name: /Reintentar/i }));

    await waitFor(() => {
      expect(screen.getByText("Protected admin content")).toBeTruthy();
    });
    expect(fetchAuthProfile).toHaveBeenCalledTimes(2);
  });
});
