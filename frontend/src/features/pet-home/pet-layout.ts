/** Mobile-first density for fitting the care UI above the fold. */

import { CAT_ANATOMY } from "./cat-anatomy";

export const PET_LAYOUT_MODE = "compact" as const;

/** Full-bleed cozy room art used by other authenticated presentations. */
export const PET_ROOM_BG = "/imagenes/pet-room-bg.png";

export const PET_LAYOUT = {
  petFrameMaxPx: 280,
  stageGapPx: 10,
  careMinHeightPx: 72,
} as const;

export function petLayoutCssVars(
  layout: typeof PET_LAYOUT = PET_LAYOUT,
): Record<string, string> {
  return {
    "--pet-frame-max": `${layout.petFrameMaxPx}px`,
    "--stage-gap": `${layout.stageGapPx}px`,
    "--care-min-height": `${layout.careMinHeightPx}px`,
  };
}

/** Uniform scale so ears/head stay inside the canvas. */
export const CAT_MODEL_SCALE = 0.78;

/** Rig root offset owned by A2 (`Cat3DModel`/`CatPoseDriver` set the same Y). */
export const CAT_PLACEMENT_Y = -0.22;

/** Authored 4:5 home viewer frame (plan §1). CSS keeps the ratio; these are the
 * caps the responsive rules must honour, so one source describes the contract.
 */
export const PET_FRAME = {
  aspectWidth: 4,
  aspectHeight: 5,
  /** Desktop cap from the approved plan (480 × 600), grown to 520 for the room. */
  desktopMaxWidthPx: 520,
  /** Height cap so a short desktop window cannot stretch the frame. */
  desktopMaxHeightDvh: 66,
  desktopMaxHeightPx: 660,
  desktopBreakpointPx: 900,
  mobileMaxWidthPx: 440,
} as const;

/** A2 floor oracle, reproduced from the immutable anatomy at rest: the lowest
 * paw bottom. `cat-pose-bind.ts` measures the same value from `matrixWorld`.
 */
const PAW_REST_BOTTOM = Math.min(
  ...CAT_ANATOMY.filter((part) => part.id.startsWith("paw")).map(
    (part) => part.position[1] - part.args[1] / 2,
  ),
);

/** World Y of an authored anatomy part. Parts are authored around the rig root
 * (`Cat3DModel` places that group at `CAT_PLACEMENT_Y`), so a part's local Y is
 * *not* measured from the paw plane, which sits `PAW_REST_BOTTOM` below it.
 */
export function catPartWorldY(localY: number, modelScale: number = CAT_MODEL_SCALE): number {
  return CAT_PLACEMENT_Y + modelScale * localY;
}

/** World Y where every planted paw rests, for the rig at `modelScale`. */
export function catGroundY(modelScale: number = CAT_MODEL_SCALE): number {
  return catPartWorldY(PAW_REST_BOTTOM, modelScale);
}

/** Anti-z-fighting offset between the floor plane and the contact-shadow plane. */
export const ROOM_SHADOW_OFFSET = 0.008;
