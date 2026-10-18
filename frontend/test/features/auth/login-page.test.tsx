/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  HARDCODED_ADMIN_EMAIL,
  HARDCODED_ADMIN_PASSWORD,
} from "@/features/auth/hardcoded-admin";
import { clearSession, getPetsAppSession } from "@/stores/auth-session";

const replace = vi.fn();
const signInPetsAppUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/ui/BrandMark", () => ({
  default: () => <span>mark</span>,
}));

vi.mock("@/features/auth/api/auth.service", () => ({
  signInPetsAppUser: (...args: unknown[]) => signInPetsAppUser(...args),
}));

import LoginPage from "@/app/login/LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    replace.mockReset();
    signInPetsAppUser.mockReset();
    clearSession();
  });

  afterEach(() => {
    cleanup();
    clearSession();
  });

  it("rejects bad credentials", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Correo/i), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar al panel/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/incorrectos/i);
    });
    expect(getPetsAppSession()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    expect(signInPetsAppUser).not.toHaveBeenCalled();
  });

  it("prefers Nest JWT session when login succeeds", async () => {
    signInPetsAppUser.mockResolvedValue({
      token: "nest-jwt",
      user: {
        id: "admin-1",
        name: "Admin",
        email: HARDCODED_ADMIN_EMAIL,
        role: "super_admin",
        roles: ["super_admin", "admin"],
        country: null,
      },
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Correo/i), {
      target: { value: HARDCODED_ADMIN_EMAIL },
    });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: HARDCODED_ADMIN_PASSWORD },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar al panel/i }));
    await waitFor(() => {
      expect(getPetsAppSession()?.token).toBe("nest-jwt");
    });
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("falls back to local admin session when Nest login fails", async () => {
    signInPetsAppUser.mockRejectedValue(new Error("network"));
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Correo/i), {
      target: { value: HARDCODED_ADMIN_EMAIL },
    });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: HARDCODED_ADMIN_PASSWORD },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar al panel/i }));
    await waitFor(() => {
      expect(getPetsAppSession()?.token).toBe("hardcoded-admin-dev-token");
    });
    expect(replace).toHaveBeenCalledWith("/admin");
  });
});
