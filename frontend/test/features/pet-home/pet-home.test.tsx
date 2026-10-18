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
import { PET_INTERACT_HINT } from "@/features/pet-home/pet-interaction";
import { NEED_LABELS } from "@/features/pet-home/pet-stats";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import { PET_NAME, PET_STATUS } from "@/features/pet-home/pet-status";
import type { PetStateResponse } from "@/features/pet-home/api/pet.service";
import {
  API_COAT_REWARD,
  API_FEED_COST,
  API_INITIAL_NEEDS,
  API_PET_REWARD,
  API_STARTING_COINS,
  createApiPetState,
  stubApplyAction,
  stubApplyCoat,
} from "./pet-api-stub";

const playPurr = vi.fn();
const stopPurr = vi.fn();

let serverState: PetStateResponse;
let latestCoins: number | null;

vi.mock("@/features/pet-home/api/pet.service", () => ({
  fetchPetState: vi.fn(async () => structuredClone(serverState)),
  applyPetAction: vi.fn(async (action: string) => {
    serverState = stubApplyAction(serverState, action);
    return structuredClone(serverState);
  }),
  applyPetCoat: vi.fn(async (coat: typeof DEFAULT_GREY_COAT) => {
    serverState = stubApplyCoat(serverState, coat);
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
  serverState = createApiPetState();
  latestCoins = null;
  playPurr.mockClear();
  stopPurr.mockClear();
});

afterEach(() => {
  cleanup();
});

async function ready() {
  render(
    <PetHomeStage
      onCoinsChange={(coins) => {
        latestCoins = coins;
      }}
    />,
  );
  await waitFor(() => screen.getByRole("img", { name: PET_NAME }));
  await waitFor(() => expect(latestCoins).toBe(API_STARTING_COINS));
  const stage = screen.getByLabelText(`Escenario de ${PET_NAME}`);
  expect(stage.getAttribute("data-ready")).toBe("true");
}

describe("PetHomeStage (API-backed)", () => {
  it("hydrates chrome from the pet API before enabling care", async () => {
    await ready();
    expect(screen.queryByText("PetsApp")).toBeNull();
    expect(screen.getByText("Nv. 1")).toBeTruthy();
    expect(screen.getByText(PET_STATUS.idle)).toBeTruthy();
    expect(screen.getByText(PET_INTERACT_HINT)).toBeTruthy();
    expect(screen.getByText(/Feliz y saludable/i)).toBeTruthy();
    expect(screen.getByText(`${API_INITIAL_NEEDS.hunger}%`)).toBeTruthy();

    for (const label of Object.values(NEED_LABELS)) {
      expect(screen.getByText(label)).toBeTruthy();
    }

    expect(
      (screen.getByRole("button", { name: /Alimentar/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("spends coins and raises hunger when feeding via API", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Alimentar/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.fed)).toBeTruthy();
    });
    expect(latestCoins).toBe(API_STARTING_COINS - API_FEED_COST);
    expect(
      screen.getByText(
        `${Math.min(100, API_INITIAL_NEEDS.hunger + 18)}%`,
      ),
    ).toBeTruthy();
  });

  it("blocks feeding when broke and keeps balance", async () => {
    await ready();
    const feeds = Math.floor(API_STARTING_COINS / API_FEED_COST);
    for (let i = 0; i < feeds; i++) {
      fireEvent.click(screen.getByRole("button", { name: /Alimentar/i }));
      await waitFor(() =>
        expect(screen.getByText(PET_STATUS.fed)).toBeTruthy(),
      );
    }
    const leftover = API_STARTING_COINS - feeds * API_FEED_COST;
    expect(latestCoins).toBe(leftover);
    fireEvent.click(screen.getByRole("button", { name: /Alimentar/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.broke)).toBeTruthy();
    });
    expect(latestCoins).toBe(leftover);
  });

  it("raises fun and earns coins when playing", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Jugar/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.petted)).toBeTruthy();
    });
    expect(latestCoins).toBe(API_STARTING_COINS + API_PET_REWARD);
    expect(
      screen.getByText(`${Math.min(100, API_INITIAL_NEEDS.fun + 16)}%`),
    ).toBeTruthy();
  });

  it("raises energy when sleeping", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Dormir/i }));
    await waitFor(() => {
      expect(
        screen.getByText(
          `${Math.min(100, API_INITIAL_NEEDS.energy + 20)}%`,
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
          `${Math.min(100, API_INITIAL_NEEDS.hygiene + 18)}%`,
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
    expect(latestCoins).toBe(API_STARTING_COINS + API_PET_REWARD);
  });

  it("opens camera from Personalizar, applies coat via API", async () => {
    await ready();

    fireEvent.click(
      screen.getByRole("button", { name: /Colores de mi gato/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Capturar colores" }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.coated)).toBeTruthy();
    });
    expect(
      screen.getByRole("img", { name: PET_NAME }).getAttribute("data-primary"),
    ).toBe("#8b5a2b");
    expect(latestCoins).toBe(API_STARTING_COINS + API_COAT_REWARD);
  });

  it("applies a coat preset via API", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Pelaje Naranja/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.coated)).toBeTruthy();
    });
    expect(
      screen.getByRole("img", { name: PET_NAME }).getAttribute("data-primary"),
    ).toBe("#e8a05a");
  });
});
