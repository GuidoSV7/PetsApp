/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { savePetsAppSession } from "@/stores/auth-session";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/BrandMark", () => ({
  default: () => <span>mark</span>,
}));

vi.mock("@/features/auth/api/auth.service", () => ({
  signOutPetsAppUser: vi.fn(async () => undefined),
}));

import AdminLayout from "@/app/admin/AdminLayout";

describe("AdminLayout mobile sidebar drawer", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("720"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    window.localStorage.clear();
    savePetsAppSession({
      token: "t",
      user: {
        id: "1",
        name: "Admin",
        email: "admin@pets.app",
        role: "admin",
        roles: ["admin"],
        country: null,
      },
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("exposes menu toggle, nav sections, and logout controls", async () => {
    render(
      <AdminLayout>
        <div>contenido</div>
      </AdminLayout>,
    );

    await waitFor(() =>
      expect(
        document.querySelector('[data-purpose="admin-mobile-nav-toggle"]'),
      ).toBeTruthy(),
    );

    const menu = document.querySelector(
      '[data-purpose="admin-mobile-nav-toggle"]',
    ) as HTMLButtonElement;
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(menu.getAttribute("aria-controls")).toBe("admin-sidebar-nav");

    fireEvent.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    expect(
      document.querySelector('[data-purpose="admin-mobile-nav-backdrop"]'),
    ).toBeTruthy();

    expect(screen.getByRole("link", { name: /Panel/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Usuarios/i })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /Secciones/i })).toBeTruthy();
    expect(
      document.querySelector('[data-purpose="admin-logout-trigger"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-purpose="admin-logout-trigger-mobile"]'),
    ).toBeTruthy();
  });
});
