import api from "@/lib/axios";
import { normalizeCoatPattern, type PetCoatInput, type PetCoatState } from "@/features/pet-home/coat-patterns";
import type { PetNeeds } from "@/features/pet-home/pet-stats";
import type { PetStatusKey } from "@/features/pet-home/pet-status";

const GUEST_STORAGE_KEY = "petsapp_pet_guest";
const GUEST_HEADER = "X-Pet-Guest-Key";

export type PetStateResponse = {
  coins: number;
  needs: PetNeeds;
  coat: PetCoatState;
  statusKey: PetStatusKey | string;
  mood: string;
  name: string;
  renameCount: number;
};

export type CareActionName = "feed" | "play" | "sleep" | "bathe" | "pet";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** Stable anonymous id for the home pet save. */
export function getOrCreateGuestKey(): string {
  if (typeof window === "undefined") {
    return "00000000-0000-4000-8000-000000000000";
  }
  const existing = window.localStorage.getItem(GUEST_STORAGE_KEY);
  if (existing && isUuid(existing)) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(GUEST_STORAGE_KEY, id);
  return id;
}

function guestHeaders() {
  return { [GUEST_HEADER]: getOrCreateGuestKey() };
}

type RawPetStateResponse = Omit<PetStateResponse, "coat"> & {
  coat: Omit<PetCoatState, "pattern"> & { pattern?: unknown };
};

/** Normalize response data without mutating it; writes retain backend validation. */
function normalizePetState(state: RawPetStateResponse): PetStateResponse {
  return {
    ...state,
    statusKey: state.statusKey === "broke" ? "idle" : state.statusKey,
    coat: { ...state.coat, pattern: normalizeCoatPattern(state.coat.pattern) },
  };
}

/** A legacy backend can return HTTP 200 for rejected care; never present it as success. */
function normalizePetMutation(state: RawPetStateResponse): PetStateResponse {
  if (state.statusKey === "broke") throw new Error("Pet action rejected");
  return normalizePetState(state);
}

export async function fetchPetState(): Promise<PetStateResponse> {
  const { data } = await api.get<RawPetStateResponse>("/pet/state", {
    headers: guestHeaders(),
  });
  return normalizePetState(data);
}

export async function applyPetAction(
  action: CareActionName,
): Promise<PetStateResponse> {
  const { data } = await api.post<RawPetStateResponse>(
    `/pet/actions/${action}`,
    {},
    { headers: guestHeaders() },
  );
  return normalizePetMutation(data);
}

export async function applyPetCoat(
  coat: PetCoatInput,
): Promise<PetStateResponse> {
  const payload: PetCoatInput = {
    primary: coat.primary,
    secondary: coat.secondary,
    accent: coat.accent,
  };
  if (Object.hasOwn(coat, "pattern")) payload.pattern = coat.pattern;
  const { data } = await api.post<RawPetStateResponse>("/pet/coat", payload, {
    headers: guestHeaders(),
  });
  return normalizePetMutation(data);
}

export async function renamePet(name: string): Promise<PetStateResponse> {
  const { data } = await api.post<RawPetStateResponse>(
    "/pet/name",
    { name },
    { headers: guestHeaders() },
  );
  return normalizePetMutation(data);
}
