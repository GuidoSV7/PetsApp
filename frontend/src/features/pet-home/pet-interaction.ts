import type { PetStatusKey } from "@/features/pet-home/pet-status";

/** Affordance shown under the 3D stage. */
export const PET_INTERACT_HINT =
  "Arrastrá para girar en 3D · Tocá para mimar";

/** Status key used when the user taps/pets the cat. */
export function petInteractStatusKey(): PetStatusKey {
  return "petted";
}
