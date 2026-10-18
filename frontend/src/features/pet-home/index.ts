export { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
export {
  CAT_ANATOMY,
  CAT_MATERIAL_ROLES,
  getCatPart,
} from "@/features/pet-home/cat-anatomy";
export {
  coatColorsFromFile,
  loadImageDataFromFile,
} from "@/features/pet-home/coat-from-image";
export {
  DEFAULT_GREY_COAT,
  cropCenterImageData,
  extractCoatColors,
  type PetCoatColors,
} from "@/features/pet-home/extract-coat-colors";
export { coinsLabel } from "@/features/pet-home/pet-coins";
export {
  COAT_PRESETS,
  moodCaption,
  isCoatPresetId,
} from "@/features/pet-home/pet-customize";
export {
  CAT_MODEL_SCALE,
  PET_LAYOUT,
  PET_LAYOUT_MODE,
  petLayoutCssVars,
} from "@/features/pet-home/pet-layout";
export {
  EMPTY_PET_NEEDS,
  NEED_LABELS,
  PREVIEW_PET_NEEDS,
  type CareAction,
  type PetNeeds,
} from "@/features/pet-home/pet-stats";
export {
  NEED_LOW_THRESHOLD,
  describeNeedVisuals,
  needVisualCues,
} from "@/features/pet-home/need-visuals";
export {
  PET_INTERACT_HINT,
  petInteractStatusKey,
} from "@/features/pet-home/pet-interaction";
export { createPurrPlayer } from "@/features/pet-home/pet-purr";
export {
  DEFAULT_PET_NAME,
  PET_NAME,
  PET_STATUS,
  RENAME_COST,
  petStatusText,
  renameHint,
} from "@/features/pet-home/pet-status";
export {
  applyPetAction,
  applyPetCoat,
  fetchPetState,
  getOrCreateGuestKey,
  renamePet,
  type PetStateResponse,
} from "@/features/pet-home/api/pet.service";
