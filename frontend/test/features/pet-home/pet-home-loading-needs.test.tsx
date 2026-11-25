/**
 * @vitest-environment jsdom
 */
/**
 * S5 (#17): while pet state is not ready, EMPTY_PET_NEEDS zeros must not
 * surface as crisis need visuals; the stage shows a loading status instead.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const { fetchPetState } = vi.hoisted(() => ({
  fetchPetState: vi.fn(),
}));

vi.mock("@/features/pet-home/api/pet.service", () => ({
  fetchPetState,
  applyPetAction: vi.fn(),
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
import { DEFAULT_PET_NAME } from "@/features/pet-home/pet-status";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

describe("S5 pet-home loading needs (#17)", () => {
  it("keeps crisis need flags false and shows stage loading while fetch is pending", async () => {
    let resolveFetch!: (value: unknown) => void;
    fetchPetState.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<PetHomeStage />);

    const stage = screen.getByLabelText(`Escenario de ${DEFAULT_PET_NAME}`);
    expect(stage.getAttribute("data-ready")).toBe("false");
    expect(stage.getAttribute("data-hunger-low")).toBe("false");
    expect(stage.getAttribute("data-fun-low")).toBe("false");
    expect(stage.getAttribute("data-energy-low")).toBe("false");
    expect(stage.getAttribute("data-hygiene-low")).toBe("false");
    expect(
      screen.getByRole("status", { name: new RegExp(`Cargando a ${DEFAULT_PET_NAME}`, "i") }),
    ).toBeTruthy();

    resolveFetch({
      coins: 5,
      needs: { hunger: 80, fun: 80, energy: 80, hygiene: 80 },
      coat: {
        primary: "#888888",
        secondary: "#aaaaaa",
        accent: "#cccccc",
        pattern: "solid",
      },
      statusKey: "idle",
      mood: "Feliz",
      name: DEFAULT_PET_NAME,
      renameCount: 0,
    });

    await waitFor(() => expect(stage.getAttribute("data-ready")).toBe("true"));
    expect(
      screen.queryByRole("status", {
        name: new RegExp(`Cargando a ${DEFAULT_PET_NAME}`, "i"),
      }),
    ).toBeNull();
  });
});
