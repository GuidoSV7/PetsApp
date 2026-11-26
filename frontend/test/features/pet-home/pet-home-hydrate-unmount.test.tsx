/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

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

const healthyState = {
  coins: 5,
  needs: { hunger: 80, fun: 80, energy: 80, hygiene: 80 },
  coat: {
    primary: "#888888",
    secondary: "#aaaaaa",
    accent: "#cccccc",
    pattern: "solid" as const,
  },
  statusKey: "idle",
  mood: "Feliz",
  name: "Michi",
  renameCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("PetHomeStage hydrate race (#71 / S2)", () => {
  it("does not applyState/onCoinsChange after unmount while fetch is in flight", async () => {
    let resolveFetch!: (value: typeof healthyState) => void;
    fetchPetState.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const onCoinsChange = vi.fn();
    const { unmount } = render(<PetHomeStage onCoinsChange={onCoinsChange} />);

    expect(fetchPetState).toHaveBeenCalledTimes(1);
    unmount();

    await act(async () => {
      resolveFetch(healthyState);
      await Promise.resolve();
    });

    expect(onCoinsChange).not.toHaveBeenCalled();
  });

  it("does not setLoadError after unmount when hydrate fails", async () => {
    let rejectFetch!: (reason?: unknown) => void;
    fetchPetState.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectFetch = reject;
        }),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<PetHomeStage />);

    unmount();

    await act(async () => {
      rejectFetch(new Error("down"));
      await Promise.resolve();
    });

    // No React "update on unmounted component" noise from this hydrate path.
    const unmountedNoise = errorSpy.mock.calls.some((args) =>
      args.some(
        (a) =>
          typeof a === "string" &&
          /unmounted|Can't perform a React state update/i.test(a),
      ),
    );
    errorSpy.mockRestore();
    expect(unmountedNoise).toBe(false);
  });
});
