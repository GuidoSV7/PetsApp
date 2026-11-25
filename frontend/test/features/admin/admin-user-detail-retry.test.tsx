/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { savePetsAppSession } from "@/stores/auth-session";
import { PetsAppApiError } from "@/lib/errors";

const getAdminUserById = vi.fn();
const showNotification = vi.fn();

vi.mock("next/navigation", () => ({
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

vi.mock("@/app/_lib/petsapp-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/_lib/petsapp-api")>(
    "@/app/_lib/petsapp-api",
  );
  return {
    ...actual,
    getAdminUserById: (...args: unknown[]) => getAdminUserById(...args),
    updateAdminUser: vi.fn(),
    toggleAdminUserBlock: vi.fn(),
  };
});

vi.mock("@/app/_components/NotificationsProvider", () => ({
  useNotification: () => ({ showNotification }),
}));

import AdminUserDetailView from "@/app/admin/_components/customers/AdminUserDetailView";

describe("AdminUserDetailView retry after load error", () => {
  beforeEach(() => {
    getAdminUserById.mockReset();
    showNotification.mockReset();
    window.localStorage.clear();
    savePetsAppSession({
      token: "tok",
      user: {
        id: "admin-1",
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

  it("shows Reintentar on load error and reloads on click (page)", async () => {
    getAdminUserById
      .mockRejectedValueOnce(new PetsAppApiError("falló la carga", 500))
      .mockResolvedValueOnce({
        id: "u1",
        userName: "Michi",
        email: "michi@pets.app",
        role: "member",
        country: "BO",
        isBlocked: false,
        isVerified: true,
      });

    render(<AdminUserDetailView idUsuario="u1" />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Reintentar/i })).toBeTruthy(),
    );
    expect(screen.getByRole("alert").textContent).toMatch(/falló la carga/i);

    const callsBeforeRetry = getAdminUserById.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Michi/i })).toBeTruthy(),
    );
    expect(getAdminUserById.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });

  it("shows Reintentar in modalMode after load error", async () => {
    getAdminUserById.mockRejectedValueOnce(
      new PetsAppApiError("sin conexión", 0),
    );

    render(<AdminUserDetailView idUsuario="u1" modalMode />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Reintentar/i })).toBeTruthy(),
    );
    expect(screen.queryByText(/Volver al listado/i)).toBeNull();
  });
});
