/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  HARDCODED_ADMIN_EMAIL,
  HARDCODED_ADMIN_PASSWORD,
} from "@/features/auth/hardcoded-admin";
import { clearSession, getPetsAppSession } from "@/stores/auth-session";

const replace = vi.fn();

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

import LoginPage from "@/app/login/LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    replace.mockReset();
    clearSession();
  });

  afterEach(() => {
    cleanup();
    clearSession();
  });

  it("rejects bad credentials", () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Correo/i), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar al panel/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/incorrectos/i);
    expect(getPetsAppSession()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("saves admin session and goes to /admin", () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Correo/i), {
      target: { value: HARDCODED_ADMIN_EMAIL },
    });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: HARDCODED_ADMIN_PASSWORD },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar al panel/i }));
    expect(getPetsAppSession()?.user.role).toBe("super_admin");
    expect(replace).toHaveBeenCalledWith("/admin");
  });
});
