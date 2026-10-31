/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/features/pollar/pollar-config", () => ({
  isPollarConfigured: () => false,
}));

import { FreighterSignInButton } from "@/features/auth/components/FreighterSignInButton";

describe("FreighterSignInButton", () => {
  afterEach(() => {
    cleanup(); vi.unstubAllEnvs();
  });

  it("shows Freighter as Próximamente when public trust roots are absent", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_AUTH_SERVER_ACCOUNT", "");
    render(<FreighterSignInButton />);
    const button = screen.getByRole("button", { name: /Freighter/i });
    expect(button).toBeTruthy();
    expect(button).toHaveProperty("disabled", true);
    expect(screen.getByText(/Próximamente/i)).toBeTruthy();
  });

  it("enables our connect action with public trust roots even without Pollar", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_AUTH_SERVER_ACCOUNT", "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_HOME_DOMAIN", "pets.example");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_WEB_AUTH_DOMAIN", "auth.pets.example");
    const connect = vi.fn(); render(<FreighterSignInButton onConnect={connect} />);
    fireEvent.click(screen.getByRole("button", { name: "Conectar Freighter" }));
    expect(connect).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Próximamente")).toBeNull();
  });
});
