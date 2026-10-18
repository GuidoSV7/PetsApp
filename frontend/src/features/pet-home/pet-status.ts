/** Local UI copy for the virtual pet stage (no backend). */

export const PET_NAME = "Michi";

export const PET_STATUS = {
  idle: `¡Miau! ¿Jugamos un ratito?`,
  fed: `¡Ñam! ${PET_NAME} está contento.`,
  petted: `${PET_NAME} ronronea contigo.`,
  coated: `${PET_NAME} ahora tiene el pelaje de tu foto.`,
  broke: `Necesitás más monedas para alimentar a ${PET_NAME}.`,
  slept: `${PET_NAME} descansó y recuperó energía.`,
  bathed: `${PET_NAME} quedó limpio y fresco.`,
} as const;

export type PetStatusKey = keyof typeof PET_STATUS;
