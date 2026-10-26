import { describe, expect, it } from "vitest";
import { Matrix4, Vector3 } from "three";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { getCoatPatternBoxes } from "@/features/pet-home/coat-patterns";
import { sampleCatIdleMotion, type CatIdleMotion } from "@/features/pet-home/cat-idle-motion";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { PREVIEW_PET_NEEDS, type PetNeeds } from "@/features/pet-home/pet-stats";
import { baseBoxes, box, burial, clipToBox, coplanarPairs, homeView, polygonArea, visibleSamples } from "./coat-pattern-geometry.helpers";

const patterns = ["tabby", "tuxedo", "calico", "pointed"] as const;
const normal = PREVIEW_PET_NEEDS;
const zero: PetNeeds = { hunger: 0, fun: 0, energy: 0, hygiene: 0 };
const view = homeView();
function earExtrema(needs: PetNeeds) {
  const cues = needVisualCues(needs), frames = new Map<string, CatIdleMotion>();
  for (let time = 0; time <= 120 && frames.size < 2; time += .025) {
    const motion = sampleCatIdleMotion(time, cues, { seed: 13, reducedMotion: false });
    for (const id of ["earL", "earR"] as const) if (motion[id]?.rotation?.[0] === .25 && !frames.has(id)) frames.set(id, motion);
  }
  expect([...frames.keys()].sort()).toEqual(["earL", "earR"]);
  return [...frames].map(([id, motion]) => ({ name: `${id}-tic`, needs, motion }));
}
function fixtures() {
  return [
    { name: "normal-rest", needs: normal, motion: {} },
    ...(["hunger", "fun", "energy", "hygiene"] as const).map(key => ({ name: `${key}-zero`, needs: { ...normal, [key]: 0 }, motion: {} })),
    { name: "all-zero-rest", needs: zero, motion: {} },
    ...[normal, zero].flatMap(needs => {
      const cues = needVisualCues(needs);
      return [...earExtrema(needs), ...[1, 3].map(n => ({
        name: `tail-extremum-${n}`, needs,
        motion: sampleCatIdleMotion(n * Math.PI / (4 * cues.idleSpeed), cues, { seed: 13, reducedMotion: false }),
      }))];
    }),
  ];
}

describe("S2/S3 complete coat geometry", () => {
  it.each(patterns)("embeds every %s box with strict full footprints and unchanged offsets", pattern => {
    const patches = getCoatPatternBoxes(pattern);
    expect(patches.length).toBeGreaterThan(0);
    for (const p of patches) {
      const anchor = CAT_ANATOMY.find(a => a.id === p.anchorId)!;
      expect(p.args).toEqual([p.size[0], p.size[1], .004]);
      expect(p.position.slice(0, 2)).toEqual(p.center);
      expect(p.position[2] - p.args[2] / 2 - anchor.args[2] / 2).toBeCloseTo(-.001, 12);
      expect(p.position[2] + p.args[2] / 2 - anchor.args[2] / 2).toBeCloseTo(.003, 12);
      const c = Math.abs(Math.cos(p.rotation[2])), s = Math.abs(Math.sin(p.rotation[2]));
      expect(Math.abs(p.center[0]) + c * p.args[0] / 2 + s * p.args[1] / 2, p.id).toBeLessThan(anchor.args[0] / 2 - 1e-6);
      expect(Math.abs(p.center[1]) + s * p.args[0] / 2 + c * p.args[1] / 2, p.id).toBeLessThan(anchor.args[1] / 2 - 1e-6);
    }
  });
  it("places both bib inner edges exactly on the chest edges without interior penetration", () => {
    const panels = getCoatPatternBoxes("tuxedo").filter(p => p.anchorId === "body");
    expect(panels).toHaveLength(2);
    const chest = CAT_ANATOMY.find(p => p.id === "chest")!;
    const [left, right] = panels;
    expect(left.center[0] + left.args[0] / 2).toBeCloseTo(-chest.args[0] / 2, 12);
    expect(right.center[0] - right.args[0] / 2).toBeCloseTo(chest.args[0] / 2, 12);
    expect(left.center[0] + left.args[0] / 2).toBeLessThanOrEqual(-.20 + 1e-12);
    expect(right.center[0] - right.args[0] / 2).toBeGreaterThanOrEqual(.20 - 1e-12);
  });
  it.each(patterns)("has no buried %s outward face against all 33 composed parts in every required fixture", pattern => {
    const patches = getCoatPatternBoxes(pattern);
    expect(patches.length).toBeGreaterThan(0);
    for (const fixture of fixtures()) {
      const bases = baseBoxes(fixture.needs, fixture.motion, view);
      expect(bases.size).toBe(33);
      for (const patch of patches) expect(burial(patch, bases), `${pattern}/${fixture.name}/${patch.id}`).toEqual([]);
    }
  });
  it("catches a blocker strictly between all four corners and the center", () => {
    const polygon = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => new Vector3(x, y, 0));
    const blocker = box(new Matrix4().makeTranslation(.23, .17, 0), [.05, .05, .1]);
    for (const p of [...polygon, new Vector3()]) {
      const local = p.clone().applyMatrix4(blocker.inverse);
      expect([0, 1, 2].some(i => Math.abs(local.getComponent(i)) > blocker.half[i])).toBe(true);
    }
    expect(polygonArea(clipToBox(polygon, blocker, 1e-7))).toBeGreaterThan(.009);
  });
  it.each(patterns)("permits only the explicit internal opposing bib contacts for %s", pattern => {
    const patches = getCoatPatternBoxes(pattern);
    expect(patches.length).toBeGreaterThan(0);
    for (const needs of [normal, zero]) {
      const result = coplanarPairs(patches, baseBoxes(needs, {}, view));
      expect(result.sameFacing).toEqual([]);
      expect(result.opposing).toHaveLength(pattern === "tuxedo" ? 2 : 0);
      for (const pair of result.opposing) {
        expect(pair.base).toBe("chest");
        expect(pair.patch).toMatch(/^tuxedo-body-[01]$/);
        expect(pair.patchAxis).toBe(0);
        expect(pair.patchSign).toBe(pair.patch.endsWith("0") ? 1 : -1);
        expect(pair.localArea).toBeCloseTo(.001005, 10);
      }
    }
  });
});

describe("S3b actual home-camera visibility", () => {
  it.each(patterns)("shows every essential %s patch at yaw0 with normal and all-zero needs", pattern => {
    const patches = getCoatPatternBoxes(pattern);
    expect(patches.length).toBeGreaterThan(0);
    for (const needs of [normal, zero]) {
      const bases = baseBoxes(needs, {}, view);
      for (const p of patches) expect(visibleSamples(p, bases, view.camera), `${p.id}/${JSON.stringify(needs)}`).toBeGreaterThanOrEqual(41);
    }
  });
  it("includes the required independent marking groups, not only the visible M or mask", () => {
    const tabby = getCoatPatternBoxes("tabby");
    expect(tabby.filter(p => p.anchorId === "head")).toHaveLength(8);
    expect(tabby.filter(p => p.anchorId === "body")).toHaveLength(0);
    for (const id of ["legFL", "legFR"]) expect(tabby.filter(p => p.anchorId === id)).toHaveLength(2);
    expect(getCoatPatternBoxes("calico").length).toBeGreaterThanOrEqual(3);
    for (const pattern of ["tuxedo", "pointed"] as const) {
      const patches = getCoatPatternBoxes(pattern);
      for (const anchor of ["legFL", "legFR"]) expect(patches.filter(p => p.anchorId === anchor)).toHaveLength(1);
      for (const anchor of ["pawFL", "pawFR"]) expect(patches.filter(p => p.anchorId === anchor)).toHaveLength(2);
      expect(patches.some(p => /tail|pawB/.test(p.anchorId))).toBe(false);
    }
    const pointed = getCoatPatternBoxes("pointed");
    expect(pointed.filter(p => p.anchorId === "head")).toHaveLength(4);
    for (const anchor of ["earL", "earR"]) expect(pointed.filter(p => p.anchorId === anchor && p.face === "+Z")).toHaveLength(1);
  });
});
