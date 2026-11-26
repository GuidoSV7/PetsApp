/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomeHeader from "@/app/_components/home/HomeHeader";

afterEach(cleanup);

describe("HomeHeader CoinBalance (#62 / S1)", () => {
  it("omits the coin badge when coins is unknown (undefined)", () => {
    render(<HomeHeader userName="Ada" onLogout={vi.fn()} />);
    expect(screen.queryByLabelText(/monedas/i)).toBeNull();
  });

  it("shows Monedas: 0 when coins is explicitly zero", () => {
    render(<HomeHeader coins={0} userName="Ada" onLogout={vi.fn()} />);
    expect(screen.getByLabelText("Monedas: 0")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("shows the balance when coins is a positive number", () => {
    render(<HomeHeader coins={37} userName="Ada" onLogout={vi.fn()} />);
    expect(screen.getByLabelText("Monedas: 37")).toBeTruthy();
    expect(screen.getByText("37")).toBeTruthy();
  });

  it("keeps showAdd honesty — no decorative + until top-up exists", () => {
    render(<HomeHeader coins={7} userName="Ada" onLogout={vi.fn()} />);
    expect(screen.getByLabelText("Monedas: 7")).toBeTruthy();
    expect(screen.queryByText("+")).toBeNull();
  });
});
