/** Pet need values from the API; labels kept for care copy / tests. */

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

/** Neutral “all good” needs for admin / preview when no live state is passed. */
export const PREVIEW_PET_NEEDS: PetNeeds = {
  hunger: 100,
  fun: 100,
  energy: 100,
  hygiene: 100,
};
