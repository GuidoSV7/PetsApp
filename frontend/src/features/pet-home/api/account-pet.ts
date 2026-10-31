import api from "@/lib/axios";
import { isUuid } from "./pet.service";
import type { PetsAppSessionData } from "@/stores/auth-session";

export type PetChoice = "keep_account" | "keep_guest";
export type PetClaim = { ownerId: string; guestKey: string | null; operationId: string; choice?: PetChoice };
export type ClaimResult = { status: "pending"; operationId: string } | { status: "confirmed"; petId: string; coins: number; operationId?: string };
const claimKey = (owner: string) => `petsapp_pet_claim:${owner}`;
const privateKey = (owner: string) => `petsapp_pet_private:${owner}`;
const PRIVATE_DEVICE_KEY = "petsapp_pet_private_device";

/** Rollout selection only, never proof of ownership. Unknown storage fails closed. */
export function petMode(session: PetsAppSessionData | null): "guest" | "private" | "unavailable" {
  try {
    // After a private claim, a missing Nest cookie is not permission to invent a guest.
    if (!session) return localStorage.getItem(PRIVATE_DEVICE_KEY) ? "unavailable" : "guest";
    if (process.env.NEXT_PUBLIC_ACCOUNT_PET_ENABLED === "true") return "private";
    return session.method === "stellar" || !session.token || localStorage.getItem(privateKey(session.user.id)) || localStorage.getItem(claimKey(session.user.id)) ? "unavailable" : "guest";
  } catch { return "unavailable"; }
}
export function rememberPrivateOwner(owner: string) {
  localStorage.setItem(PRIVATE_DEVICE_KEY, "true");
  localStorage.setItem(privateKey(owner), "true");
}
export function savePetClaim(claim: PetClaim) { localStorage.setItem(claimKey(claim.ownerId), JSON.stringify(claim)); }
export function readPetClaim(owner: string): PetClaim | null {
  const raw = localStorage.getItem(claimKey(owner));
  if (!raw) return null;
  const claim = JSON.parse(raw) as PetClaim;
  if (claim.ownerId !== owner || !isUuid(claim.operationId) || (claim.guestKey !== null && !isUuid(claim.guestKey)) || (claim.choice !== undefined && claim.choice !== "keep_account" && claim.choice !== "keep_guest")) throw new Error("Invalid pending pet claim");
  return claim;
}
export function clearPetClaim(owner: string) { localStorage.removeItem(claimKey(owner)); }
export async function claimPet(body: { guestKey?: string } | { operationId: string; choice: PetChoice }, signal: AbortSignal): Promise<ClaimResult> {
  const { data } = await api.post<ClaimResult>("/account/pet/claim-guest", body, { signal });
  return data;
}
export async function petClaimStatus(operationId: string, signal: AbortSignal): Promise<ClaimResult> {
  const { data } = await api.get<ClaimResult>(`/account/pet/claims/${encodeURIComponent(operationId)}`, { signal });
  return data;
}
export function petFailure(error: unknown) {
  const failure = error as {
    codigoEstado?: number;
    cuerpo?: { message?: string; operationId?: string };
    response?: { status?: number; data?: { message?: string; operationId?: string } };
  } | null;
  // The shared axios interceptor normalizes HTTP errors before this consumer.
  const body = failure?.cuerpo ?? failure?.response?.data;
  return { status: failure?.codigoEstado ?? failure?.response?.status, code: body?.message, operationId: body?.operationId };
}
