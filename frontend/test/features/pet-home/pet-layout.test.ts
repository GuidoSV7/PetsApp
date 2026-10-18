import { describe, it, expect } from "vitest";
import {
  CAT_MODEL_SCALE,
  PET_LAYOUT,
  PET_LAYOUT_MODE,
  petLayoutCssVars,
} from "@/features/pet-home/pet-layout";

describe("pet-layout", () => {
  it("is compact with a viewport-filling pet frame budget", () => {
    expect(PET_LAYOUT_MODE).toBe("compact");
    expect(PET_LAYOUT.petFrameMaxPx).toBeGreaterThanOrEqual(180);
    expect(PET_LAYOUT.petFrameMaxPx).toBeLessThanOrEqual(280);
    expect(PET_LAYOUT.stageGapPx).toBeLessThanOrEqual(10);
    expect(CAT_MODEL_SCALE).toBeLessThan(0.9);
  });

  it("maps tokens to CSS variables", () => {
    expect(petLayoutCssVars()).toEqual({
      "--pet-frame-max": "240px",
      "--stage-gap": "8px",
      "--care-min-height": "64px",
    });
  });
});
