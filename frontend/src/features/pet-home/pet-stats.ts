/** Display types and labels for pet need meters (values come from the pet API). */

export type PetNeeds = {
  hunger: number;
  fun: number;
  energy: number;
  hygiene: number;
};

export type CareAction = "feed" | "play" | "sleep" | "bathe" | "pet";

export const NEED_LABELS = {
  hunger: "Hambre",
  fun: "Diversión",
  energy: "Energía",
  hygiene: "Higiene",
} as const;

/** Empty meters shown only before the first successful API hydrate. */
export const EMPTY_PET_NEEDS: PetNeeds = {
  hunger: 0,
  fun: 0,
  energy: 0,
  hygiene: 0,
};
