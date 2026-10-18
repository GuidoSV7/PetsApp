/**
 * @vitest-environment jsdom
 */
import * as React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  COIN_COSTS,
  COIN_REWARDS,
  STARTING_COINS,
} from "@/features/pet-home/pet-coins";
import { PET_INTERACT_HINT } from "@/features/pet-home/pet-interaction";
import {
  INITIAL_PET_NEEDS,
  NEED_LABELS,
} from "@/features/pet-home/pet-stats";
import { PET_NAME, PET_STATUS } from "@/features/pet-home/pet-status";

const playPurr = vi.fn();
const stopPurr = vi.fn();

vi.mock("@/features/pet-home/pet-purr", () => ({
  createPurrPlayer: () => ({
    play: playPurr,
    stop: stopPurr,
  }),
}));

vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<React.ComponentType<{ colors: unknown }>>,
  ) => {
    function DynamicCat(props: { colors: unknown }) {
      const [Comp, setComp] = React.useState<React.ComponentType<{
        colors: unknown;
        onPetInteract?: () => void;
      }> | null>(null);
      React.useEffect(() => {
        void loader().then((C) => setComp(() => C));
      }, []);
      if (!Comp) {
        return <div role="status">Cargando…</div>;
      }
      return <Comp {...props} />;
    }
    return DynamicCat;
  },
}));

vi.mock("@/features/pet-home/components/Cat3DViewer", () => ({
  Cat3DViewer: ({
    colors,
    onPetInteract,
  }: {
    colors: { primary: string };
    onPetInteract?: () => void;
  }) => (
    <div>
      <div role="img" aria-label={PET_NAME} data-primary={colors.primary} />
      <button type="button" onClick={() => onPetInteract?.()}>
        Tocar gato
      </button>
    </div>
  ),
}));

vi.mock("@/features/pet-home/components/CameraCoatCapture", () => ({
  CameraCoatCapture: ({
    open,
    onClose,
    onColors,
  }: {
    open: boolean;
    onClose: () => void;
    onColors: (colors: {
      primary: string;
      secondary: string;
      accent: string;
    }) => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Colores de mi gato">
        <button
          type="button"
          onClick={() => {
            onColors({
              primary: "#8b5a2b",
              secondary: "#c4a574",
              accent: "#c9a0a8",
            });
            onClose();
          }}
        >
          Capturar colores
        </button>
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
      </div>
    ) : null,
}));

import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";

beforeEach(() => {
  playPurr.mockClear();
  stopPurr.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("PetHomeStage", () => {
  it("shows playful care chrome: cat, coins, needs, mood, actions", async () => {
    render(<PetHomeStage />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: PET_NAME })).toBeTruthy();
    });
    expect(screen.queryByText("PetsApp")).toBeNull();
    expect(
      screen.getByLabelText(`Monedas: ${STARTING_COINS}`),
    ).toBeTruthy();
    expect(screen.getByText(PET_STATUS.idle)).toBeTruthy();
    expect(screen.getByText(PET_INTERACT_HINT)).toBeTruthy();
    expect(screen.getByText(/Ánimo:/i)).toBeTruthy();
    expect(screen.getAllByText("Feliz").length).toBeGreaterThan(0);

    for (const label of Object.values(NEED_LABELS)) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText(`${INITIAL_PET_NEEDS.hunger}%`)).toBeTruthy();

    expect(screen.getByRole("button", { name: /Alimentar/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Jugar/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dormir/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bañar/i })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Colores de mi gato/i }),
    ).toBeTruthy();
  });

  it("spends coins and raises hunger when feeding", async () => {
    render(<PetHomeStage />);
    await waitFor(() => screen.getByRole("img", { name: PET_NAME }));
    fireEvent.click(screen.getByRole("button", { name: /Alimentar/i }));
    expect(screen.getByText(PET_STATUS.fed)).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Monedas: ${STARTING_COINS - COIN_COSTS.feed}`,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        `${Math.min(100, INITIAL_PET_NEEDS.hunger + 18)}%`,
      ),
    ).toBeTruthy();
  });

  it("blocks feeding when broke and keeps balance", async () => {
    render(<PetHomeStage />);
    await waitFor(() => screen.getByRole("img", { name: PET_NAME }));
    const feeds = Math.floor(STARTING_COINS / COIN_COSTS.feed);
    for (let i = 0; i < feeds; i++) {
      fireEvent.click(screen.getByRole("button", { name: /Alimentar/i }));
    }
    const leftover = STARTING_COINS - feeds * COIN_COSTS.feed;
    expect(screen.getByLabelText(`Monedas: ${leftover}`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Alimentar/i }));
    expect(screen.getByText(PET_STATUS.broke)).toBeTruthy();
    expect(screen.getByLabelText(`Monedas: ${leftover}`)).toBeTruthy();
  });

  it("raises fun and earns coins when playing", async () => {
    render(<PetHomeStage />);
    await waitFor(() => screen.getByRole("img", { name: PET_NAME }));
    fireEvent.click(screen.getByRole("button", { name: /Jugar/i }));
    expect(screen.getByText(PET_STATUS.petted)).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Monedas: ${STARTING_COINS + COIN_REWARDS.pet}`,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(`${Math.min(100, INITIAL_PET_NEEDS.fun + 16)}%`),
    ).toBeTruthy();
  });

  it("raises energy when sleeping", async () => {
    render(<PetHomeStage />);
    await waitFor(() => screen.getByRole("img", { name: PET_NAME }));
    fireEvent.click(screen.getByRole("button", { name: /Dormir/i }));
    expect(
      screen.getByText(
        `${Math.min(100, INITIAL_PET_NEEDS.energy + 20)}%`,
      ),
    ).toBeTruthy();
  });

  it("raises hygiene when bathing", async () => {
    render(<PetHomeStage />);
    await waitFor(() => screen.getByRole("img", { name: PET_NAME }));
    fireEvent.click(screen.getByRole("button", { name: /Bañar/i }));
    expect(
      screen.getByText(
        `${Math.min(100, INITIAL_PET_NEEDS.hygiene + 18)}%`,
      ),
    ).toBeTruthy();
  });

  it("purrs and raises fun when the cat is tapped", async () => {
    render(<PetHomeStage />);
    await waitFor(() => screen.getByRole("img", { name: PET_NAME }));
    fireEvent.click(screen.getByRole("button", { name: "Tocar gato" }));
    expect(screen.getByText(PET_STATUS.petted)).toBeTruthy();
    expect(playPurr).toHaveBeenCalled();
    expect(
      screen.getByLabelText(
        `Monedas: ${STARTING_COINS + COIN_REWARDS.pet}`,
      ),
    ).toBeTruthy();
  });

  it("opens camera flow, applies coat, and earns coat coins", async () => {
    render(<PetHomeStage />);
    await waitFor(() => screen.getByRole("img", { name: PET_NAME }));

    fireEvent.click(
      screen.getByRole("button", { name: /Colores de mi gato/i }),
    );
    expect(
      screen.getByRole("dialog", { name: "Colores de mi gato" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Capturar colores" }));
    expect(screen.getByText(PET_STATUS.coated)).toBeTruthy();
    expect(
      screen.getByRole("img", { name: PET_NAME }).getAttribute("data-primary"),
    ).toBe("#8b5a2b");
    expect(
      screen.getByLabelText(
        `Monedas: ${STARTING_COINS + COIN_REWARDS.coat}`,
      ),
    ).toBeTruthy();
  });
});
