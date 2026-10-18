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
  applyCareAction,
} from "@/features/pet-home/pet-stats";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import { PET_NAME, PET_STATUS } from "@/features/pet-home/pet-status";
import type { PetStateResponse } from "@/features/pet-home/api/pet.service";

const playPurr = vi.fn();
const stopPurr = vi.fn();

let serverState: PetStateResponse;

function baseState(): PetStateResponse {
  return {
    coins: STARTING_COINS,
    needs: { ...INITIAL_PET_NEEDS },
    coat: { ...DEFAULT_GREY_COAT },
    statusKey: "idle",
    mood: "Feliz",
  };
}

vi.mock("@/features/pet-home/api/pet.service", () => ({
  fetchPetState: vi.fn(async () => structuredClone(serverState)),
  applyPetAction: vi.fn(async (action: string) => {
    if (action === "feed") {
      if (serverState.coins < COIN_COSTS.feed) {
        serverState = { ...serverState, statusKey: "broke" };
      } else {
        serverState = {
          ...serverState,
          coins: serverState.coins - COIN_COSTS.feed,
          needs: applyCareAction(serverState.needs, "feed"),
          statusKey: "fed",
        };
      }
    } else if (action === "play") {
      serverState = {
        ...serverState,
        coins: serverState.coins + COIN_REWARDS.pet,
        needs: applyCareAction(serverState.needs, "play"),
        statusKey: "petted",
      };
    } else if (action === "sleep") {
      serverState = {
        ...serverState,
        needs: applyCareAction(serverState.needs, "sleep"),
        statusKey: "slept",
      };
    } else if (action === "bathe") {
      serverState = {
        ...serverState,
        needs: applyCareAction(serverState.needs, "bathe"),
        statusKey: "bathed",
      };
    } else if (action === "pet") {
      serverState = {
        ...serverState,
        coins: serverState.coins + COIN_REWARDS.pet,
        needs: applyCareAction(serverState.needs, "pet"),
        statusKey: "petted",
      };
    }
    return structuredClone(serverState);
  }),
  applyPetCoat: vi.fn(async (coat: typeof DEFAULT_GREY_COAT) => {
    serverState = {
      ...serverState,
      coat: { ...coat },
      coins: serverState.coins + COIN_REWARDS.coat,
      statusKey: "coated",
    };
    return structuredClone(serverState);
  }),
  getOrCreateGuestKey: () => "11111111-1111-4111-8111-111111111111",
}));

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
  serverState = baseState();
  playPurr.mockClear();
  stopPurr.mockClear();
});

afterEach(() => {
  cleanup();
});

async function ready() {
  render(<PetHomeStage />);
  await waitFor(() => screen.getByRole("img", { name: PET_NAME }));
  await waitFor(() =>
    expect(screen.getByLabelText(`Monedas: ${STARTING_COINS}`)).toBeTruthy(),
  );
}

describe("PetHomeStage", () => {
  it("shows playful care chrome: cat, coins, needs, mood, actions", async () => {
    await ready();
    expect(screen.queryByText("PetsApp")).toBeNull();
    const stage = screen.getByLabelText(`Escenario de ${PET_NAME}`);
    expect(stage.getAttribute("data-layout")).toBe("compact");
    expect(stage.style.getPropertyValue("--pet-frame-max")).toBe("140px");
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
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Alimentar/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.fed)).toBeTruthy();
    });
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
    await ready();
    const feeds = Math.floor(STARTING_COINS / COIN_COSTS.feed);
    for (let i = 0; i < feeds; i++) {
      fireEvent.click(screen.getByRole("button", { name: /Alimentar/i }));
      await waitFor(() =>
        expect(screen.getByText(PET_STATUS.fed)).toBeTruthy(),
      );
    }
    const leftover = STARTING_COINS - feeds * COIN_COSTS.feed;
    expect(screen.getByLabelText(`Monedas: ${leftover}`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Alimentar/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.broke)).toBeTruthy();
    });
    expect(screen.getByLabelText(`Monedas: ${leftover}`)).toBeTruthy();
  });

  it("raises fun and earns coins when playing", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Jugar/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.petted)).toBeTruthy();
    });
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
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Dormir/i }));
    await waitFor(() => {
      expect(
        screen.getByText(
          `${Math.min(100, INITIAL_PET_NEEDS.energy + 20)}%`,
        ),
      ).toBeTruthy();
    });
  });

  it("raises hygiene when bathing", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Bañar/i }));
    await waitFor(() => {
      expect(
        screen.getByText(
          `${Math.min(100, INITIAL_PET_NEEDS.hygiene + 18)}%`,
        ),
      ).toBeTruthy();
    });
  });

  it("purrs and raises fun when the cat is tapped", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Tocar gato" }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.petted)).toBeTruthy();
    });
    expect(playPurr).toHaveBeenCalled();
    expect(
      screen.getByLabelText(
        `Monedas: ${STARTING_COINS + COIN_REWARDS.pet}`,
      ),
    ).toBeTruthy();
  });

  it("opens camera flow, applies coat, and earns coat coins", async () => {
    await ready();

    fireEvent.click(
      screen.getByRole("button", { name: /Colores de mi gato/i }),
    );
    expect(
      screen.getByRole("dialog", { name: "Colores de mi gato" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Capturar colores" }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.coated)).toBeTruthy();
    });
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
