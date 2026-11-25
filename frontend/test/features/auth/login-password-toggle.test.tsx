/**
 * @vitest-environment jsdom
 */
/**
 * T4 — S5 on /login: show/hide password toggle with aria-pressed and Spanish
 * labels; the server error banner (role=alert) is preserved.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { signInPetsAppUser, replace } = vi.hoisted(() => ({
  signInPetsAppUser: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/ui/BrandMark", () => ({ default: () => <span>mark</span> }));
vi.mock("@/features/auth/api/auth.service", () => ({ signInPetsAppUser }));

import LoginPage from "@/app/login/LoginPage";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("S5 /login password toggle", () => {
  it("starts hidden with label 'Mostrar contraseña' and aria-pressed=false", () => {
    render(<LoginPage />);
    const toggle = screen.getByRole("button", { name: "Mostrar contraseña" }) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).type).toBe("password");
  });

  it("reveals the password and flips aria-pressed + label", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect((screen.getByRole("button", { name: "Ocultar contraseña" }) as HTMLButtonElement).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).type).toBe("text");
  });

  it("hides it again on the second click", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect((screen.getByRole("button", { name: "Mostrar contraseña" }) as HTMLButtonElement).getAttribute("aria-pressed")).toBe("false");
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).type).toBe("password");
  });
});

describe("S5 preserved: server error stays a role=alert banner", () => {
  it("shows the Nest failure message unchanged", async () => {
    signInPetsAppUser.mockRejectedValue(new Error("Nest rejected credentials"));
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "admin@x.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secreto" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entrar al panel" }));
    });
    expect(screen.getByRole("alert").textContent).toBe("Nest rejected credentials");
    expect(replace).not.toHaveBeenCalled();
  });
});
