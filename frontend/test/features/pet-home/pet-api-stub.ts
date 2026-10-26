/**
 * Test double for the Nest `/pet/*` API (mirrors backend/pet-rules).
 * Used only in UI tests — production talks to the real backend.
 */
import type { PetCoatInput, PetCoatState } from "@/features/pet-home/coat-patterns";
import type { PetNeeds } from "@/features/pet-home/pet-stats";
import type { PetStateResponse } from "@/features/pet-home/api/pet.service";

export const API_STARTING_COINS = 5;
export const API_FEED_COST = 5;
export const API_PET_REWARD = 0;
export const API_COAT_REWARD = 0;
export const API_RENAME_COST = 5;
export const API_DEFAULT_NAME = "Michi";

export const API_INITIAL_NEEDS: PetNeeds = {
  hunger: 72,
  fun: 80,
  energy: 65,
  hygiene: 78,
};

const DEFAULT_COAT: PetCoatState = {
  pattern: "solid",
  primary: "#8a8a8e",
  secondary: "#b4b4b8",
  accent: "#c9a0a8",
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function moodFromNeeds(needs: PetNeeds): string {
  const avg = Math.round(
    (needs.hunger + needs.fun + needs.energy + needs.hygiene) / 4,
  );
  if (avg < 40) return "Bajo";
  if (avg < 70) return "Bien";
  return "Feliz";
}

export function createApiPetState(): PetStateResponse {
  return {
    coins: API_STARTING_COINS,
    needs: { ...API_INITIAL_NEEDS },
    coat: { ...DEFAULT_COAT },
    statusKey: "idle",
    mood: "Feliz",
    name: API_DEFAULT_NAME,
    renameCount: 0,
  };
}

export function stubApplyAction(
  state: PetStateResponse,
  action: string,
): PetStateResponse {
  if (action === "feed") {
    if (state.coins < API_FEED_COST) {
      return { ...state, statusKey: "broke", mood: moodFromNeeds(state.needs) };
    }
    const needs = {
      ...state.needs,
      hunger: clamp(state.needs.hunger + 18),
    };
    return {
      ...state,
      coins: state.coins - API_FEED_COST,
      needs,
      statusKey: "fed",
      mood: moodFromNeeds(needs),
    };
  }
  if (action === "play") {
    const needs = {
      ...state.needs,
      fun: clamp(state.needs.fun + 16),
      energy: clamp(state.needs.energy - 4),
    };
    return {
      ...state,
      needs,
      statusKey: "petted",
      mood: moodFromNeeds(needs),
    };
  }
  if (action === "sleep") {
    const needs = {
      ...state.needs,
      energy: clamp(state.needs.energy + 20),
    };
    return {
      ...state,
      needs,
      statusKey: "slept",
      mood: moodFromNeeds(needs),
    };
  }
  if (action === "bathe") {
    const needs = {
      ...state.needs,
      hygiene: clamp(state.needs.hygiene + 18),
    };
    return {
      ...state,
      needs,
      statusKey: "bathed",
      mood: moodFromNeeds(needs),
    };
  }
  if (action === "pet") {
    const needs = {
      ...state.needs,
      fun: clamp(state.needs.fun + 8),
    };
    return {
      ...state,
      needs,
      statusKey: "petted",
      mood: moodFromNeeds(needs),
    };
  }
  return state;
}

export function stubApplyCoat(
  state: PetStateResponse,
  coat: PetCoatInput,
): PetStateResponse {
  return {
    ...state,
    coat: { ...state.coat, ...coat },
    statusKey: "coated",
    mood: moodFromNeeds(state.needs),
  };
}

export function stubRename(
  state: PetStateResponse,
  rawName: string,
): PetStateResponse {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name || name === state.name || name.length > 16) {
    return state;
  }
  const paid = state.renameCount > 0;
  if (paid && state.coins < API_RENAME_COST) {
    return { ...state, statusKey: "broke", mood: moodFromNeeds(state.needs) };
  }
  return {
    ...state,
    name,
    renameCount: state.renameCount + 1,
    coins: paid ? state.coins - API_RENAME_COST : state.coins,
    statusKey: "renamed",
    mood: moodFromNeeds(state.needs),
  };
}
