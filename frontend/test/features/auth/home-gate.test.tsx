/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PetsAppApiError } from "@/lib/errors";

const { fetchAuthProfile, signOutPetsAppUser, signInWithGoogle } = vi.hoisted(() => ({
  fetchAuthProfile: vi.fn(),
  signOutPetsAppUser: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/features/pet-home/components/PetHomeStage", () => ({
  PetHomeStage: ({ onCoinsChange }: { onCoinsChange?: (coins: number) => void }) => {
    useEffect(() => {
      onCoinsChange?.(37);
    }, [onCoinsChange]);
    return <section aria-label="Escenario de Michi">stage</section>;
  },
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
  signInWithGoogle,
  signOutPetsAppUser,
  fetchAuthProfile,
}));

vi.mock("@/features/pollar/pollar-config", () => ({
  isPollarConfigured: () => false,
}));

vi.mock("@/components/ui/BrandMark", () => ({
  default: () => <span>mark</span>,
}));

import HomePage from "@/app/_components/home/HomePage";
import {
  clearSession,
  getPetsAppSession,
  savePetsAppSession,
} from "@/stores/auth-session";
import { LOGOUT_COOKIE_WARNING } from "@/features/auth/api/sign-out";

const member = {
  id: "1",
  name: "Ada",
  email: "a@test.app",
  role: "member" as const,
  roles: ["member" as const],
  country: null,
};

describe("HomePage auth gate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearSession();
    fetchAuthProfile.mockReset();
    signOutPetsAppUser.mockReset();
    signInWithGoogle.mockReset();
    fetchAuthProfile.mockResolvedValue(member);
    signOutPetsAppUser.mockResolvedValue(undefined);
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
    expect(screen.getByText(/Iniciá sesión con Google, Freighter/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Google/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Freighter/i })).toBeTruthy();
    expect(screen.queryByLabelText("Escenario de Michi")).toBeNull();
    expect(fetchAuthProfile).not.toHaveBeenCalled();
  });

  it("revalidates via fetchAuthProfile and shows the pet stage (#64)", async () => {
    savePetsAppSession({ token: "jwt", user: member });
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Escenario de Michi")).toBeTruthy(),
    );
    expect(fetchAuthProfile).toHaveBeenCalled();
    expect(screen.queryByLabelText("Iniciar sesión")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Cerrar sesión de Ada/i }),
    ).toBeTruthy();
  });

  it("clears session and shows the gate when profile returns 401 (#64)", async () => {
    savePetsAppSession({ token: "jwt", user: member });
    fetchAuthProfile.mockRejectedValue(
      new PetsAppApiError("Unauthorized", 401, null),
    );
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Iniciar sesión")).toBeTruthy(),
    );
    expect(getPetsAppSession()).toBeNull();
    expect(screen.queryByLabelText("Escenario de Michi")).toBeNull();
  });

  it("warns and offers retry when logout API fails (#82)", async () => {
    savePetsAppSession({ token: "jwt", user: member });
    signOutPetsAppUser.mockRejectedValue(new Error("network"));
    render(<HomePage />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Cerrar sesión de Ada/i }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Cerrar sesión de Ada/i }));
    await waitFor(() =>
      expect(screen.getByText(LOGOUT_COOKIE_WARNING)).toBeTruthy(),
    );
    expect(getPetsAppSession()).toBeNull();
    expect(
      screen.getByRole("button", { name: /Reintentar cierre de sesión/i }),
    ).toBeTruthy();

    signOutPetsAppUser.mockResolvedValue(undefined);
    fireEvent.click(
      screen.getByRole("button", { name: /Reintentar cierre de sesión/i }),
    );
    await waitFor(() =>
      expect(screen.queryByText(LOGOUT_COOKIE_WARNING)).toBeNull(),
    );
  });
});
