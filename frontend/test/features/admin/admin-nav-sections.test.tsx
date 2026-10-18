/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { savePetsAppSession } from "@/stores/auth-session";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ replace, push }),
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

vi.mock("@/features/auth/api/auth.service", () => ({
  signOutPetsAppUser: vi.fn(async () => undefined),
}));

import AdminLayout from "@/app/admin/AdminLayout";
import PaginaAdmin from "@/app/admin/page";

describe("admin nav sections", () => {
  beforeEach(() => {
    replace.mockReset();
    push.mockReset();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
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

  it("lists Configuración and Diseño 3D in the sidebar", async () => {
    render(
      <AdminLayout>
        <div>child</div>
      </AdminLayout>,
    );
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Configuración/i })).toBeTruthy(),
    );
    const settings = screen.getByRole("link", { name: /Configuración/i });
    const design = screen.getByRole("link", { name: /Diseño 3D/i });
    expect(settings.getAttribute("href")).toBe("/admin/settings");
    expect(design.getAttribute("href")).toBe("/admin/design-3d");
  });

  it("dashboard cards link to the new sections", async () => {
    render(
      <AdminLayout>
        <PaginaAdmin />
      </AdminLayout>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /^Ir a configuración/i }),
      ).toBeTruthy(),
    );
    expect(
      screen
        .getByRole("link", { name: /^Ir a configuración/i })
        .getAttribute("href"),
    ).toBe("/admin/settings");
    expect(
      screen.getByRole("link", { name: /^Ir a diseño 3D/i }).getAttribute("href"),
    ).toBe("/admin/design-3d");
  });
});
