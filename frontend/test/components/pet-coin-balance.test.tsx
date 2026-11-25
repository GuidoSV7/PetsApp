/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CoinBalance } from "@/features/pet-home/components/CoinBalance";

afterEach(() => {
  cleanup();
});

describe("CoinBalance honesty (#50)", () => {
  it("omits the decorative + by default until top-up exists", () => {
    render(<CoinBalance balance={7} />);
    expect(screen.getByLabelText("Monedas: 7")).toBeTruthy();
    expect(screen.queryByText("+")).toBeNull();
  });

  it("still allows an explicit + when showAdd is true", () => {
    render(<CoinBalance balance={3} showAdd />);
    expect(screen.getByText("+")).toBeTruthy();
  });
});
