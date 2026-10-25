import { describe, expect, it } from "vitest";
import { CAT_ANATOMY, getCatPart } from "@/features/pet-home/cat-anatomy";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import {
  NEED_LOW_THRESHOLD,
  applyNeedDirtToCoat,
  applyNeedVisualsToAnatomy,
  describeNeedVisuals,
  needVisualCues,
} from "@/features/pet-home/need-visuals";
import type { PetNeeds } from "@/features/pet-home/pet-stats";

const healthy: PetNeeds = {
  hunger: 80,
  fun: 80,
  energy: 80,
  hygiene: 80,
};

describe("needVisualCues", () => {
  it("marks needs low only below the threshold", () => {
    const ok = needVisualCues(healthy);
    expect(ok.hungerLow).toBe(false);
    expect(ok.funLow).toBe(false);
    expect(ok.energyLow).toBe(false);
    expect(ok.hygieneLow).toBe(false);
    expect(ok.bodySlim).toBe(1);
    expect(ok.dirtMix).toBe(0);

    const low = needVisualCues({
      hunger: NEED_LOW_THRESHOLD - 1,
      fun: NEED_LOW_THRESHOLD - 1,
      energy: NEED_LOW_THRESHOLD - 1,
      hygiene: NEED_LOW_THRESHOLD - 1,
    });
    expect(low.hungerLow).toBe(true);
    expect(low.funLow).toBe(true);
    expect(low.energyLow).toBe(true);
    expect(low.hygieneLow).toBe(true);
    expect(low.bodySlim).toBeLessThan(1);
    expect(low.earDroop).toBeGreaterThan(0);
    expect(low.headDroop).toBeLessThan(0);
    expect(low.idleAmp).toBeLessThan(1);
    expect(low.dirtMix).toBeGreaterThan(0);
  });

  it("slims body, droops ears/head, and dirties coat when applied", () => {
    const cues = needVisualCues({
      hunger: 10,
      fun: 10,
      energy: 10,
      hygiene: 10,
    });
    const parts = applyNeedVisualsToAnatomy(CAT_ANATOMY, cues);
    const body = parts.find((p) => p.id === "body")!;
    const baseBody = getCatPart("body")!;
    expect(body.scale![0]).toBeLessThan((baseBody.scale ?? [1, 1, 1])[0]);

    const ear = parts.find((p) => p.id === "earL")!;
    const baseEar = getCatPart("earL")!;
    expect((ear.rotation?.[0] ?? 0)).toBeGreaterThan(baseEar.rotation?.[0] ?? 0);

    const head = parts.find((p) => p.id === "head")!;
    const baseHead = getCatPart("head")!;
    expect(head.position[1]).toBeLessThan(baseHead.position[1]);

    const dirty = applyNeedDirtToCoat(DEFAULT_GREY_COAT, cues);
    expect(dirty.primary.toLowerCase()).not.toBe(
      DEFAULT_GREY_COAT.primary.toLowerCase(),
    );
    expect(describeNeedVisuals(cues)).toMatch(/hambre/i);
  });
});


describe("hierarchical need transform ownership", () => {
  const cues = needVisualCues({ hunger: 0, fun: 0, energy: 0, hygiene: 0 });
  it.each(["chest", "earInnerL", "earInnerR"])("does not transform child %s independently", (id) => {
    const base = getCatPart(id)!;
    const result = applyNeedVisualsToAnatomy(CAT_ANATOMY, cues).find((p) => p.id === id)!;
    expect(result).toEqual(base);
  });
  it("preserves the existing worst-needs cue formulas and parent effects", () => {
    expect(cues).toEqual({ hungerLow: true, funLow: true, energyLow: true, hygieneLow: true,
      bodySlim: 0.78, earDroop: 0.55, headDroop: -0.08, idleAmp: 0.25,
      idleSpeed: 1 - 0.55, pupilScale: 0.65, dirtMix: 0.55 });
    const result = applyNeedVisualsToAnatomy(CAT_ANATOMY, cues);
    for (const id of ["body", "head", "earL", "earR", "pupilL", "pupilR"]) {
      const base = getCatPart(id)!;
      const part = result.find((p) => p.id === id)!;
      if (id === "head") expect(part.position[1]).toBeCloseTo(base.position[1] - 0.08);
      else if (id.startsWith("ear")) {
        expect(part.rotation).toEqual([(base.rotation?.[0] ?? 0) + 0.55, base.rotation?.[1] ?? 0,
          (base.rotation?.[2] ?? 0) + (id === "earL" ? 1 : -1) * 0.55 * 0.25]);
      } else {
        const scale = base.scale ?? [1, 1, 1];
        expect(part.scale).toEqual(id === "body" ? [scale[0] * 0.78, scale[1], scale[2] * 0.78]
          : scale.map((v) => v * 0.65));
      }
    }
  });
});
