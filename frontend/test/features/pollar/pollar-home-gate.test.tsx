/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WalletType } from "@pollar/core";

const {
  state,
  login,
  logout,
  onAuthStateChange,
  getUserProfile,
} = vi.hoisted(() => {
  const login = vi.fn();
  const logout = vi.fn();
  const onAuthStateChange = vi.fn(() => () => undefined);
  const getUserProfile = vi.fn(
    (): {
      mail: string;
      first_name: string;
      last_name: string;
      avatar: string;
      providers: {
        email: null;
        google: { id: string } | null;
        github: null;
        wallet: null;
      };
    } | null => null,
  );
  const state = {
    isAuthenticated: false,
    wallet: null as { address: string } | null,
    login,
    logout,
    getClient: () => ({
      onAuthStateChange,
      getUserProfile,
    }),
  };
  return { state, login, logout, onAuthStateChange, getUserProfile };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/features/pet-home/components/PetHomeStage", () => ({
  PetHomeStage: () => (
    <section aria-label="Escenario de Michi">stage</section>
  ),
}));

vi.mock("@/components/ui/BrandMark", () => ({
  default: () => <span>mark</span>,
}));

vi.mock("@/features/pollar/pollar-config", () => ({
  isPollarConfigured: () => true,
  pollarPublishableKey: () => "pub_testnet_test",
  pollarNetwork: () => "testnet" as const,
}));

vi.mock("@pollar/react", () => ({
  usePollar: () => state,
  PollarProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import HomePage from "@/app/_components/home/HomePage";

describe("HomePage Pollar gate", () => {
  beforeEach(() => {
    login.mockReset();
    logout.mockReset();
    onAuthStateChange.mockReset();
    onAuthStateChange.mockImplementation(() => () => undefined);
    getUserProfile.mockReset();
    getUserProfile.mockReturnValue(null);
    state.isAuthenticated = false;
    state.wallet = null;
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the Pollar modal with Google and Freighter when signed out", async () => {
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Iniciar sesión")).toBeTruthy(),
    );
    expect(
      screen.getByRole("button", { name: /Continuar con Google/i }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Freighter/i })).toBeTruthy();
    expect(screen.queryByLabelText("Escenario de Michi")).toBeNull();
  });

  it("calls Pollar login for Google and Freighter", async () => {
    render(<HomePage />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Continuar con Google/i }),
      ).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Continuar con Google/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Freighter/i }));
    expect(login).toHaveBeenCalledWith({ provider: "google" });
    expect(login).toHaveBeenCalledWith({ provider: WalletType.FREIGHTER });
  });

  it("shows the pet stage when Pollar is authenticated", async () => {
    state.isAuthenticated = true;
    state.wallet = { address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ" };
    getUserProfile.mockReturnValue({
      mail: "ada@test.app",
      first_name: "Ada",
      last_name: "Lovelace",
      avatar: "",
      providers: {
        email: null,
        google: { id: "1" },
        github: null,
        wallet: null,
      },
    });

    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Escenario de Michi")).toBeTruthy(),
    );
    expect(screen.queryByLabelText("Iniciar sesión")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Cerrar sesión de Ada Lovelace/i }),
    ).toBeTruthy();
  });

  it("logs out via Pollar", async () => {
    state.isAuthenticated = true;
    state.wallet = { address: "GABC" };
    getUserProfile.mockReturnValue({
      mail: "a@test.app",
      first_name: "Ada",
      last_name: "",
      avatar: "",
      providers: {
        email: null,
        google: null,
        github: null,
        wallet: null,
      },
    });

    render(<HomePage />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Cerrar sesión de Ada/i }),
      ).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Cerrar sesión de Ada/i }),
    );
    expect(logout).toHaveBeenCalled();
  });
});
