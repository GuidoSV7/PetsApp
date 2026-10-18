/** Local UI copy for the virtual pet stage. */

export const DEFAULT_PET_NAME = "Michi";

/** @deprecated Prefer DEFAULT_PET_NAME or the live API name. */
export const PET_NAME = DEFAULT_PET_NAME;

export const RENAME_COST = 5;

/** How long feedback speech (broke, fed, …) stays before returning to idle. */
export const SPEECH_DISMISS_MS = 3500;

export type PetStatusKey =
  | "idle"
  | "fed"
  | "petted"
  | "coated"
  | "broke"
  | "slept"
  | "bathed"
  | "renamed";

export function petStatusText(
  key: PetStatusKey,
  name: string = DEFAULT_PET_NAME,
): string {
  switch (key) {
    case "idle":
      return "¡Miau! ¿Jugamos un ratito?";
    case "fed":
      return `¡Ñam! ${name} está contento.`;
    case "petted":
      return `${name} ronronea contigo.`;
    case "coated":
      return `${name} ahora tiene el pelaje de tu foto.`;
    case "broke":
      return `Necesitás más monedas para eso.`;
    case "slept":
      return `${name} descansó y recuperó energía.`;
    case "bathed":
      return `${name} quedó limpio y fresco.`;
    case "renamed":
      return `¡Ahora se llama ${name}!`;
  }
}

/** Static copy using the default name (tests / fallbacks). */
export const PET_STATUS = {
  idle: petStatusText("idle"),
  fed: petStatusText("fed"),
  petted: petStatusText("petted"),
  coated: petStatusText("coated"),
  broke: petStatusText("broke"),
  slept: petStatusText("slept"),
  bathed: petStatusText("bathed"),
  renamed: petStatusText("renamed"),
} as const;

export function renameHint(renameCount: number): string {
  return renameCount > 0 ? `${RENAME_COST} monedas` : "Gratis";
}
