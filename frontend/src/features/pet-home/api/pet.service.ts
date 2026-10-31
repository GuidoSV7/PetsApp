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

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** Inspect only: private bootstrap must never manufacture a guest. */
export function readGuestKey(): string | null {
  if (typeof window === "undefined") return null;
  const key = window.localStorage.getItem(GUEST_STORAGE_KEY);
  return key && isUuid(key) ? key : null;
}

export function retireGuestKey(key: string | null) {
  if (key && readGuestKey() === key) window.localStorage.removeItem(GUEST_STORAGE_KEY);
}

export type PetRequestTarget = { private: true; signal: AbortSignal };
function requestConfig(target?: PetRequestTarget) {
  return target ? { signal: target.signal } : { headers: guestHeaders() };
}
function petPath(path: string, target?: PetRequestTarget) {
  return `${target ? "/account/pet" : "/pet"}/${path}`;
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

export async function fetchPetState(target?: PetRequestTarget): Promise<PetStateResponse> {
  const { data } = await api.get<RawPetStateResponse>(petPath("state", target), requestConfig(target));
  return normalizePetState(data);
}

export async function applyPetAction(
  action: CareActionName,
  target?: PetRequestTarget,
): Promise<PetStateResponse> {
  const { data } = await api.post<RawPetStateResponse>(
    petPath(`actions/${action}`, target),
    {},
    requestConfig(target),
  );
  return normalizePetMutation(data);
}

export async function applyPetCoat(
  coat: PetCoatInput,
  target?: PetRequestTarget,
): Promise<PetStateResponse> {
  const payload: PetCoatInput = {
    primary: coat.primary,
    secondary: coat.secondary,
    accent: coat.accent,
  };
  if (Object.hasOwn(coat, "pattern")) payload.pattern = coat.pattern;
  const { data } = await api.post<RawPetStateResponse>(petPath("coat", target), payload, requestConfig(target));
  return normalizePetMutation(data);
}

export async function renamePet(name: string, target?: PetRequestTarget): Promise<PetStateResponse> {
  const { data } = await api.post<RawPetStateResponse>(
    petPath("name", target),
    { name },
    requestConfig(target),
  );
  return normalizePetMutation(data);
}
