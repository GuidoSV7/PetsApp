/**
 * @vitest-environment jsdom
 */
/**
 * T2 — S11: a pet-load failure on the home shows a prominent retry button and
 * a role="alert" message, instead of silently disabled actions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { fetchPetState, applyPetAction } = vi.hoisted(() => ({
  fetchPetState: vi.fn(),
  applyPetAction: vi.fn(),
}));

vi.mock("@/features/pet-home/api/pet.service", () => ({
  fetchPetState,
  applyPetAction,
  renamePet: vi.fn(),
  applyPetCoat: vi.fn(),
  getOrCreateGuestKey: () => "11111111-1111-4111-8111-111111111111",
}));

vi.mock("@/features/pet-home/pet-purr", () => ({
  createPurrPlayer: () => ({ play: vi.fn(), stop: vi.fn() }),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div role="img" aria-label="placeholder" />,
}));

vi.mock("@/features/pet-home/components/CameraCoatCapture", () => ({
  CameraCoatCapture: () => null,
}));

import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";

const healthyState = {
  coins: 5,
  needs: { hunger: 80, fun: 80, energy: 80, hygiene: 80 },
  coat: { primary: "#888888", secondary: "#aaaaaa", accent: "#cccccc", pattern: "solid" },
  statusKey: "idle",
  mood: "Feliz",
  name: "Michi",
  renameCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

describe("S11 pet-load failure UX", () => {
  it("announces the failure with role=alert and offers a retry action", async () => {
    fetchPetState.mockRejectedValue(new Error("down"));
    render(<PetHomeStage />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toMatch(/Reintentá/);
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("prominent failure does not render as a silent disabled-only state", async () => {
    fetchPetState.mockRejectedValue(new Error("down"));
    render(<PetHomeStage />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    // The retry control stays reachable while actions are disabled.
    const retry = screen.getByRole("button", { name: "Reintentar" }) as HTMLButtonElement;
    expect(retry.disabled).toBe(false);
  });

  it("retry calls the API again and recovers the stage", async () => {
    fetchPetState.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(healthyState);
    render(<PetHomeStage />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    });
    expect(fetchPetState).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByRole("button", { name: "Alimentar" })).toBeTruthy());
    expect((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("preserves the silent-success path: no alert on a healthy load", async () => {
    fetchPetState.mockResolvedValue(healthyState);
    render(<PetHomeStage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Alimentar" })).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });
});

describe("preserved care action path", () => {
  it("still routes the feed action through the service", async () => {
    fetchPetState.mockResolvedValue(healthyState);
    applyPetAction.mockResolvedValue(healthyState);
    render(<PetHomeStage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Alimentar" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Alimentar" }));
    });
    expect(applyPetAction).toHaveBeenCalledWith("feed");
  });
});
