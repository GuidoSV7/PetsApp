/** Local UI copy for the virtual pet stage (no backend). */

export const PET_NAME = "Michi";

export const PET_STATUS = {
  idle: `${PET_NAME} te mira con curiosidad.`,
  fed: `¡Ñam! ${PET_NAME} está contento.`,
  petted: `${PET_NAME} ronronea contigo.`,
} as const;

export type PetStatusKey = keyof typeof PET_STATUS;
