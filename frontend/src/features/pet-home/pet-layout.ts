/** Mobile-first density for fitting the care UI above the fold. */

export const PET_LAYOUT_MODE = "compact" as const;

export const PET_LAYOUT = {
  petFrameMaxPx: 240,
  stageGapPx: 8,
  careMinHeightPx: 64,
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
