/**
 * @vitest-environment jsdom
 */
import * as React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import {
  PET_NAME,
  PET_STATUS,
  SPEECH_DISMISS_MS,
} from "@/features/pet-home/pet-status";
import type { PetStateResponse } from "@/features/pet-home/api/pet.service";
import {
  API_FEED_COST,
  API_STARTING_COINS,
  API_RENAME_COST,
  createApiPetState,
  stubApplyAction,
  stubApplyCoat,
  stubRename,
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
  renamePet: vi.fn(async (name: string) => {
    serverState = stubRename(serverState, name);
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
  vi.useRealTimers();
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
    expect(screen.queryByText(/Nv\./i)).toBeNull();
    expect(screen.getByText(PET_STATUS.idle)).toBeTruthy();
    expect(screen.getByText(/Feliz y saludable/i)).toBeTruthy();
    expect(screen.queryByText(/Arrastrá/i)).toBeNull();
    expect(screen.queryByText("Hambre")).toBeNull();
    expect(screen.queryByText("Diversión")).toBeNull();
    expect(screen.queryByText("Energía")).toBeNull();
    expect(screen.queryByText("Higiene")).toBeNull();
    expect(screen.queryByText(/%$/)).toBeNull();
    expect(
      document.querySelector('[data-purpose="pet-profile-card"]'),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Personalizar$/i })).toBeTruthy();

    const stage = screen.getByLabelText(`Escenario de ${PET_NAME}`);
    expect(stage.getAttribute("data-hunger-low")).toBe("false");
    expect(stage.getAttribute("data-fun-low")).toBe("false");
    expect(stage.getAttribute("data-energy-low")).toBe("false");
    expect(stage.getAttribute("data-hygiene-low")).toBe("false");

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

  it("clears the broke speech after a few seconds", async () => {
    vi.useFakeTimers();
    serverState = {
      ...createApiPetState(),
      coins: 0,
      statusKey: "broke",
    };
    render(
      <PetHomeStage
        onCoinsChange={(coins) => {
          latestCoins = coins;
        }}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(PET_STATUS.broke)).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(SPEECH_DISMISS_MS);
    });
    expect(screen.getByText(PET_STATUS.idle)).toBeTruthy();
    expect(screen.queryByText(PET_STATUS.broke)).toBeNull();
  });

  it("raises fun without minting coins when playing", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Jugar/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.petted)).toBeTruthy();
    });
    expect(latestCoins).toBe(API_STARTING_COINS);
  });

  it("raises energy when sleeping", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Dormir/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.slept)).toBeTruthy();
    });
  });

  it("raises hygiene when bathing", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Bañar/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.bathed)).toBeTruthy();
    });
  });

  it("flags low needs on the stage for cat visuals", async () => {
    serverState = createApiPetState();
    serverState = {
      ...serverState,
      needs: { hunger: 10, fun: 10, energy: 10, hygiene: 10 },
    };
    render(
      <PetHomeStage
        onCoinsChange={(coins) => {
          latestCoins = coins;
        }}
      />,
    );
    await waitFor(() => screen.getByRole("img", { name: PET_NAME }));
    const stage = screen.getByLabelText(`Escenario de ${PET_NAME}`);
    expect(stage.getAttribute("data-hunger-low")).toBe("true");
    expect(stage.getAttribute("data-fun-low")).toBe("true");
    expect(stage.getAttribute("data-energy-low")).toBe("true");
    expect(stage.getAttribute("data-hygiene-low")).toBe("true");
  });

  it("purrs and raises fun when the cat is tapped", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Tocar gato" }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.petted)).toBeTruthy();
    });
    expect(playPurr).toHaveBeenCalled();
    expect(latestCoins).toBe(API_STARTING_COINS);
  });

  it("opens camera from Personalizar, applies coat via API", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /^Personalizar$/i }));
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
    expect(latestCoins).toBe(API_STARTING_COINS);
  });

  it("applies a coat preset via API", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /^Personalizar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Pelaje Naranja/i }));
    await waitFor(() => {
      expect(screen.getByText(PET_STATUS.coated)).toBeTruthy();
    });
    expect(
      screen.getByRole("img", { name: PET_NAME }).getAttribute("data-primary"),
    ).toBe("#e8a05a");
  });

  it("keeps personalize presets collapsed under the top toggle", async () => {
    await ready();
    expect(screen.queryByText(/Colores, accesorios/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Pelaje Naranja/i })).toBeNull();
    const toggle = screen.getByRole("button", { name: /^Personalizar$/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("renames for free once, then charges five coins", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Editar nombre/i }));
    expect(screen.getByText("Gratis")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Luna" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Guardar/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Editar nombre: Luna/i }),
      ).toBeTruthy();
    });
    expect(latestCoins).toBe(API_STARTING_COINS);
    expect(screen.getByText(/Ahora se llama Luna/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Editar nombre/i }));
    expect(screen.getByText(`${API_RENAME_COST} monedas`)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Nube" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Guardar/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Editar nombre: Nube/i }),
      ).toBeTruthy();
    });
    expect(latestCoins).toBe(API_STARTING_COINS - API_RENAME_COST);
  });
});
