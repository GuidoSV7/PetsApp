/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { createApiPetState, stubApplyAction } from "./pet-api-stub";
import type { CatCareEvent } from "@/features/pet-home/cat-pose-types";

const { get, post, viewer, purr } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), viewer: vi.fn(), purr: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { get, post } }));
vi.mock("next/dynamic", () => ({ default: () => function Viewer(props: { careEvent?: CatCareEvent; reactPulse: number; onPetInteract: () => void }) {
  viewer(props);
  return <button onClick={props.onPetInteract}>Pet cat</button>;
} }));
vi.mock("@/features/pet-home/pet-purr", () => ({ createPurrPlayer: () => ({ play: purr, stop: vi.fn() }) }));
const latest = () => viewer.mock.calls.at(-1)![0] as { careEvent?: CatCareEvent; reactPulse: number };
const ready = async () => waitFor(() => expect((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(false));
let saved = createApiPetState();
beforeEach(() => {
  vi.stubGlobal("React", React);
  saved = createApiPetState();
  get.mockReset().mockImplementation(async () => ({ data: structuredClone(saved) }));
  post.mockReset().mockImplementation(async (url: string) => {
    saved = stubApplyAction(saved, url.split("/").at(-1)!);
    return { data: structuredClone(saved) };
  });
  viewer.mockClear(); purr.mockClear();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("successful care event seam (S9/S10)", () => {
  it("emits once after each successful await/applyState, retaining pulses, coins and busy behavior", async () => {
    const coins = vi.fn();
    render(<PetHomeStage onCoinsChange={coins} />); await ready();
    expect(latest().careEvent).toBeUndefined();
    let complete!: (value: { data: typeof saved }) => void;
    post.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Alimentar" }));
    expect((screen.getByRole("button", { name: "Jugar" }) as HTMLButtonElement).disabled).toBe(true);
    expect(latest().careEvent).toBeUndefined();
    complete({ data: stubApplyAction(saved, "feed") }); await ready();
    expect(latest().careEvent).toEqual({ sequence: 1, action: "feed" });
    expect(coins).toHaveBeenCalledTimes(2);
    expect(screen.getByText("¡Ñam! Michi está contento.")).toBeTruthy();
    for (const [index, label, action] of [[2, "Jugar", "play"], [3, "Dormir", "sleep"], [4, "Bañar", "bathe"]] as const) {
      fireEvent.click(screen.getByRole("button", { name: label })); await ready();
      expect(latest().careEvent).toEqual({ sequence: index, action });
    }
    expect(post.mock.calls.map(([url]) => url)).toEqual(["/pet/actions/feed", "/pet/actions/play", "/pet/actions/sleep", "/pet/actions/bathe"]);
    expect(latest().reactPulse).toBe(1);
    expect(coins).toHaveBeenCalledTimes(5);
    const event = latest().careEvent;
    fireEvent.click(screen.getByRole("button", { name: "Pet cat" })); await ready();
    expect(latest().careEvent).toBe(event); // pet is not a care reaction
    expect(latest().reactPulse).toBe(2);
    expect(purr).toHaveBeenCalledOnce();
  });

  it.each(["network", "http", "broke"])("%s rejection emits nothing and preserves state/counters", async failure => {
    const before = structuredClone(saved), coins = vi.fn();
    render(<PetHomeStage onCoinsChange={coins} />); await ready();
    if (failure === "broke") post.mockResolvedValueOnce({ data: { ...saved, statusKey: "broke" } });
    else post.mockRejectedValueOnce(new Error(failure));
    fireEvent.click(screen.getByRole("button", { name: "Alimentar" })); await ready();
    expect(screen.getByRole("alert").textContent).toBe("No pudimos guardar la acción.");
    expect(latest().careEvent).toBeUndefined(); expect(latest().reactPulse).toBe(0);
    expect(saved).toEqual(before); expect(coins).toHaveBeenCalledExactlyOnceWith(before.coins);
    fireEvent.click(screen.getByRole("button", { name: "Alimentar" })); await ready();
    expect(latest().careEvent).toEqual({ sequence: 1, action: "feed" });
  });

  it("does not infer/replay care from the persisted response on remount", async () => {
    const view = render(<PetHomeStage />); await ready();
    fireEvent.click(screen.getByRole("button", { name: "Alimentar" })); await ready();
    expect(latest().careEvent).toEqual({ sequence: 1, action: "feed" });
    view.unmount(); render(<PetHomeStage />); await ready();
    expect(latest().careEvent).toBeUndefined();
    expect(post).toHaveBeenCalledOnce();
  });
});
