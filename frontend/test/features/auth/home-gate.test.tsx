/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/features/pet-home/components/PetHomeStage", () => ({
  PetHomeStage: () => (
    <section aria-label="Escenario de Michi">stage</section>
  ),
}));

vi.mock("@/features/auth/components/GoogleSignInButton", () => ({
  GoogleSignInButton: () => (
    <button type="button">Continuar con Google</button>
  ),
}));

vi.mock("@/features/auth/components/AuthDemoModal", () => ({
  default: () => null,
}));

vi.mock("@/features/auth/api/auth.service", () => ({
  signInWithGoogle: vi.fn(),
  signOutPetsAppUser: vi.fn(),
}));

vi.mock("@/components/ui/BrandMark", () => ({
  default: () => <span>mark</span>,
}));

import HomePage from "@/app/_components/home/HomePage";
import {
  clearSession,
  savePetsAppSession,
} from "@/stores/auth-session";

describe("HomePage auth gate", () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the login gate without a session and hides the pet stage", async () => {
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Iniciar sesión")).toBeTruthy(),
    );
    expect(screen.getByText(/Iniciá sesión para ver y cuidar/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Google/i })).toBeTruthy();
    expect(screen.queryByLabelText("Escenario de Michi")).toBeNull();
  });

  it("shows the pet stage when a session exists", async () => {
    savePetsAppSession({
      token: "jwt",
      user: {
        id: "1",
        name: "Ada",
        email: "a@test.app",
        role: "member",
        roles: ["member"],
        country: null,
      },
    });
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Escenario de Michi")).toBeTruthy(),
    );
    expect(screen.queryByLabelText("Iniciar sesión")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Cerrar sesión de Ada/i }),
    ).toBeTruthy();
  });
});
