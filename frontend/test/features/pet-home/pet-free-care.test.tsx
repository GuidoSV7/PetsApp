/** @vitest-environment jsdom */
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomeHeader from "@/app/_components/home/HomeHeader";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { applyPetAction, applyPetCoat, fetchPetState, renamePet, type PetStateResponse } from "@/features/pet-home/api/pet.service";
import { PET_STATUS, RENAME_COST, renameHint } from "@/features/pet-home/pet-status";
import { createApiPetState, stubApplyAction, stubRename } from "./pet-api-stub";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { get, post } }));
vi.mock("next/dynamic", () => ({ default: () => function Cat() { return <div aria-label="Cat viewer" />; } }));
vi.mock("@/features/pet-home/pet-purr", () => ({ createPurrPlayer: () => ({ play: vi.fn(), stop: vi.fn() }) }));

let saved: PetStateResponse;
beforeEach(() => {
  get.mockReset();
  post.mockReset();
  localStorage.clear();
  saved = createApiPetState();
  get.mockImplementation(async () => ({ data: structuredClone(saved) }));
  post.mockImplementation(async (url: string, body: { name?: string }) => {
    saved = url === "/pet/name" ? stubRename(saved, body.name!) : stubApplyAction(saved, url.split("/").at(-1)!);
    return { data: structuredClone(saved) };
  });
});
afterEach(cleanup);

async function ready() {
  await waitFor(() => expect((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(false));
}

describe("free care frontend contract (S1/S4/S5/S7)", () => {
  it.each([0, 37])("hides the entire coin widget at balance %s while preserving brand and logout", (coins) => {
    const logout = vi.fn();
    render(<HomeHeader coins={coins} userName="Ada" onLogout={logout} />);
    expect(screen.getByText("PetsApp")).toBeTruthy();
    expect(screen.queryByLabelText(/monedas/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /agregar|comprar/i })).toBeNull();
    expect(screen.queryByText(String(coins))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión de Ada" }));
    expect(logout).toHaveBeenCalledOnce();
  });

  it("starts with zero coins without changing initial needs", () => {
    expect(createApiPetState()).toMatchObject({ coins: 0, needs: { hunger: 72, fun: 80, energy: 65, hygiene: 78 }, renameCount: 0 });
  });

  it("always describes renames as free and retains the cost helper at zero", () => {
    expect(RENAME_COST).toBe(0);
    for (const count of [0, 1, 3, 100]) expect(renameHint(count)).toBe("Gratis");
  });

  it("renames after the first rename at zero without changing needs or coins", async () => {
    saved = { ...saved, coins: 0, renameCount: 1 };
    const before = await fetchPetState();
    expect(await renamePet("Luna")).toEqual({ ...before, name: "Luna", renameCount: 2, statusKey: "renamed" });
  });

  it("feeds three times from zero, renames three times and reloads the saved state", async () => {
    saved = { ...saved, coins: 0, needs: { ...saved.needs, hunger: 10 } };
    const coins = vi.fn();
    const view = render(<PetHomeStage onCoinsChange={coins} />);
    await ready();
    for (const hunger of [28, 46, 64]) {
      fireEvent.click(screen.getByRole("button", { name: "Alimentar" }));
      await ready();
      expect(saved.needs.hunger).toBe(hunger);
      expect(saved.coins).toBe(0);
      expect(screen.getByText(PET_STATUS.fed)).toBeTruthy();
    }
    for (const name of ["Luna", "Nube", "Sol"]) {
      fireEvent.click(screen.getByRole("button", { name: /Editar nombre/ }));
      expect(screen.getByText("Gratis")).toBeTruthy();
      fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: name } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() => expect(screen.getByRole("button", { name: `Editar nombre: ${name}` })).toBeTruthy());
      await ready();
      expect(saved.coins).toBe(0);
    }
    expect(saved.renameCount).toBe(3);
    expect(coins.mock.calls.every(([balance]) => balance === 0)).toBe(true);
    expect(screen.queryByText(PET_STATUS.broke)).toBeNull();
    view.unmount();
    render(<PetHomeStage />);
    await ready();
    expect(screen.getByRole("button", { name: "Editar nombre: Sol" })).toBeTruthy();
    expect((await fetchPetState()).needs.hunger).toBe(64);
  });

  it.each(["play", "sleep", "bathe", "pet"] as const)("preserves %s effects and nonzero balance", async (action) => {
    saved.coins = 37;
    const needs = {
      play: { hunger: 72, fun: 96, energy: 61, hygiene: 78 },
      sleep: { hunger: 72, fun: 80, energy: 85, hygiene: 78 },
      bathe: { hunger: 72, fun: 80, energy: 65, hygiene: 96 },
      pet: { hunger: 72, fun: 88, energy: 65, hygiene: 78 },
    };
    expect(await applyPetAction(action)).toEqual({ ...createApiPetState(), coins: 37, needs: needs[action], statusKey: { play: "petted", sleep: "slept", bathe: "bathed", pet: "petted" }[action] });
  });

  it("normalizes legacy GET broke to idle without altering the response object or writing", async () => {
    saved = { ...saved, coins: 37, statusKey: "broke" };
    const original = structuredClone(saved);
    get.mockResolvedValue({ data: saved });
    expect(await fetchPetState()).toEqual({ ...original, statusKey: "idle" });
    expect(saved).toEqual(original);
    expect(post).not.toHaveBeenCalled();
    render(<PetHomeStage />);
    await ready();
    expect(screen.getByText(PET_STATUS.idle)).toBeTruthy();
    expect(screen.queryByText(PET_STATUS.broke)).toBeNull();
  });

  it.each([
    ["feed", () => applyPetAction("feed")],
    ["rename", () => renamePet("Luna")],
    ["coat", () => applyPetCoat(saved.coat)],
  ] as const)("rejects legacy POST broke for %s instead of reporting success", async (_operation, call) => {
    saved.coins = 0;
    const before = await fetchPetState();
    post.mockResolvedValue({ data: { ...saved, statusKey: "broke" } });
    await expect(call()).rejects.toThrow("Pet action rejected");
    expect(await fetchPetState()).toEqual(before);
  });

  it.each(["feed", "rename"])("uses the existing error UI on legacy %s rejection and keeps the previous state", async (operation) => {
    saved.coins = 0;
    const before = structuredClone(saved);
    const coins = vi.fn();
    render(<PetHomeStage onCoinsChange={coins} />);
    await ready();
    post.mockResolvedValue({ data: { ...saved, statusKey: "broke" } });
    if (operation === "feed") fireEvent.click(screen.getByRole("button", { name: "Alimentar" }));
    else {
      fireEvent.click(screen.getByRole("button", { name: /Editar nombre/ }));
      fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Luna" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    }
    expect((await screen.findByRole("alert")).textContent).toBe(operation === "feed" ? "No pudimos guardar la acción." : "No pudimos guardar el nombre.");
    expect(screen.getByText(PET_STATUS.idle)).toBeTruthy();
    expect(screen.queryByText(PET_STATUS.broke)).toBeNull();
    expect(saved).toEqual(before);
    expect(coins).toHaveBeenCalledExactlyOnceWith(0);
    expect(screen.getByRole("button", { name: "Editar nombre: Michi" })).toBeTruthy();
  });
});
