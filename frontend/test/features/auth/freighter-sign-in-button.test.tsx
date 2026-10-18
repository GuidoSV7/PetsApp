/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/features/pollar/pollar-config", () => ({
  isPollarConfigured: () => false,
}));

import { FreighterSignInButton } from "@/features/auth/components/FreighterSignInButton";

describe("FreighterSignInButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows Freighter as Próximamente when Pollar is not configured", () => {
    render(<FreighterSignInButton />);
    const button = screen.getByRole("button", { name: /Freighter/i });
    expect(button).toBeTruthy();
    expect(button).toHaveProperty("disabled", true);
    expect(screen.getByText(/Próximamente/i)).toBeTruthy();
  });
});
