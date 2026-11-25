/**
 * @vitest-environment jsdom
 */
/**
 * T3 — S3: visible keyboard-accessible "Acariciar" control next to the care
 * actions, running the same interaction path as tapping the cat.
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

const playPurr = vi.fn();
const stopPurr = vi.fn();
vi.mock("@/features/pet-home/pet-purr", () => ({
  createPurrPlayer: () => ({ play: playPurr, stop: stopPurr }),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div role="img" aria-label="Michi en su habitación" />,
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
  fetchPetState.mockResolvedValue(healthyState);
});
afterEach(() => cleanup());

describe("S3 keyboard path to pet the cat", () => {
  it("shows an Acariciar control next to the care actions once loaded", async () => {
    render(<PetHomeStage />);
    const acariciar = await screen.findByRole("button", { name: "Acariciar" });
    const alimentar = screen.getByRole("button", { name: "Alimentar" });
    // Care actions live in the same actions row: compare distance crudely via shared parent.
    expect(acariciar.closest("div")).toBe(alimentar.closest("div"));
    expect((acariciar as HTMLButtonElement).disabled).toBe(false);
  });

  it("Acariciar triggers the same pet interaction path with purring", async () => {
    applyPetAction.mockResolvedValue(healthyState);
    render(<PetHomeStage />);
    const acariciar = await screen.findByRole("button", { name: "Acariciar" });
    await waitFor(() => expect((acariciar as HTMLButtonElement).disabled).toBe(false));
    await act(async () => {
      fireEvent.click(acariciar);
    });
    expect(applyPetAction.mock.calls[0]?.[0]).toBe("pet");
    expect(playPurr).toHaveBeenCalledTimes(1);
  });
});

describe("S3 preserved 3D canvas semantics", () => {
  it("keeps the cat region exposed as an image with an aria-label", async () => {
    render(<PetHomeStage />);
    await screen.findByRole("button", { name: "Acariciar" });
    const img = screen.getByRole("img", { name: "Michi en su habitación" });
    expect(img).toBeTruthy();
  });
});
