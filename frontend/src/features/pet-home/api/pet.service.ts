import api from "@/lib/axios";
import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";
import type { PetNeeds } from "@/features/pet-home/pet-stats";
import type { PetStatusKey } from "@/features/pet-home/pet-status";

const GUEST_STORAGE_KEY = "petsapp_pet_guest";
const GUEST_HEADER = "X-Pet-Guest-Key";

export type PetStateResponse = {
  coins: number;
  needs: PetNeeds;
  coat: PetCoatColors;
  statusKey: PetStatusKey | string;
  mood: string;
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

export async function fetchPetState(): Promise<PetStateResponse> {
  const { data } = await api.get<PetStateResponse>("/pet/state", {
    headers: guestHeaders(),
  });
  return data;
}

export async function applyPetAction(
  action: CareActionName,
): Promise<PetStateResponse> {
  const { data } = await api.post<PetStateResponse>(
    `/pet/actions/${action}`,
    {},
    { headers: guestHeaders() },
  );
  return data;
}

export async function applyPetCoat(
  coat: PetCoatColors,
): Promise<PetStateResponse> {
  const { data } = await api.post<PetStateResponse>("/pet/coat", coat, {
    headers: guestHeaders(),
  });
  return data;
}
