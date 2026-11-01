import { describe, expect, it } from "vitest";
import { solveTwoBoneSupport } from "@/features/pet-home/cat-support-ik";
import type { PoseVec3, SupportChainInput, SupportChainSolution } from "@/features/pet-home/cat-pose-types";

const base: SupportChainInput = {
  root: [0, 1, 0], target: [0, 0, 0], pole: [0, 1, 1],
  upperLength: .75, lowerLength: .75,
};
const distance = (a: PoseVec3, b: PoseVec3) => Math.hypot(...a.map((v, i) => v - b[i]));
function rigid(input: SupportChainInput, result: SupportChainSolution) {
  expect(distance(input.root, result.knee)).toBeCloseTo(input.upperLength, 10);
  expect(distance(result.knee, result.foot)).toBeCloseTo(input.lowerLength, 10);
  expect([...result.knee, ...result.foot, ...result.footQuaternion, result.error].every(Number.isFinite)).toBe(true);
  expect(result.error).toBeCloseTo(distance(result.foot, input.target), 12);
}
function frozen(input: SupportChainInput): SupportChainInput {
  return Object.freeze({ ...input, root: Object.freeze([...input.root]) as PoseVec3,
    target: Object.freeze([...input.target]) as PoseVec3, pole: Object.freeze([...input.pole]) as PoseVec3 });
}

describe("analytic two-bone planted support", () => {
  it("preserves the uncorrected rigid lengths at its already seated endpoint", () => {
    const input = { ...base, target: [0, -.5, 0] as const };
    const result = solveTwoBoneSupport(input);
    rigid(input, result);
    expect(result.foot).toEqual(input.target);
    expect(result.reachable).toBe(true);
    expect(result.error).toBe(0);
  });

  it("solves the law-of-cosines knee toward the explicit world pole", () => {
    const input = frozen(base);
    const result = solveTwoBoneSupport(input);
    rigid(input, result);
    expect(result.foot).toEqual(input.target);
    expect(result.knee[0]).toBeCloseTo(0, 12);
    expect(result.knee[1]).toBeCloseTo(.5, 12);
    expect(result.knee[2]).toBeCloseTo(Math.sqrt(.75 ** 2 - .5 ** 2), 12);
    expect(result.reachable).toBe(true);
    expect(result.error).toBe(0);
    expect(input).toEqual(base);
  });

  it.each([.4, .3])("pins the same world goal through moving roots and %s Hz respiration", (hz) => {
    const target: PoseVec3 = [-.2, 0, .3];
    for (let tick = 0; tick <= 600; tick++) {
      const t = tick / 60;
      const input = frozen({ ...base, target,
        root: [-.2 + .1 * Math.sin(t), 1 + .01 * Math.sin(2 * Math.PI * hz * t), .3 + .08 * Math.cos(t)],
      });
      const before = JSON.stringify(input);
      const result = solveTwoBoneSupport(input);
      rigid(input, result);
      expect(result.reachable).toBe(true);
      expect(distance(result.foot, target)).toBeLessThanOrEqual(.001);
      expect(result.error).toBeLessThanOrEqual(.001);
      expect(JSON.stringify(input)).toBe(before);
      expect(solveTwoBoneSupport(input)).toEqual(result);
    }
  });

  it("keeps rear feet world-flat independently of root, knee bend and target direction", () => {
    for (const target of [[0, 0, 0], [.6, .2, .3], [-.2, .7, -.4]] as const) {
      const input = { ...base, target };
      const result = solveTwoBoneSupport(input);
      expect(result.footQuaternion).toEqual([0, 0, 0, 1]);
      rigid(input, result);
      expect(result.reachable).toBe(true);
    }
  });

  it("mirrors left/right chains and reverses the bend when the pole reverses", () => {
    const left = solveTwoBoneSupport({ ...base, root: [-.4, 1, 0], target: [-.2, 0, .1], pole: [-1, 1, .8] });
    const right = solveTwoBoneSupport({ ...base, root: [.4, 1, 0], target: [.2, 0, .1], pole: [1, 1, .8] });
    expect(left.knee[0]).toBeLessThan(-.4);
    expect(right.knee).toEqual([-left.knee[0], left.knee[1], left.knee[2]]);
    const forward = solveTwoBoneSupport(base);
    const backward = solveTwoBoneSupport({ ...base, pole: [0, 1, -1] });
    expect(forward.knee[2]).toBeGreaterThan(0);
    expect(backward.knee).toEqual([forward.knee[0], forward.knee[1], -forward.knee[2]]);
  });

  it.each([
    { target: [0, -2, 0] as const, upperLength: .75, lowerLength: .75, error: 1.5 },
    { target: [0, .9, 0] as const, upperLength: .8, lowerLength: .3, error: .4 },
    { target: [0, -.3, 0] as const, upperLength: .75, lowerLength: .75, maxReach: 1, error: .3 },
  ])("reports actual requested-target error without stretching for $target", ({ error, ...changes }) => {
    const input = frozen({ ...base, ...changes, target: changes.target });
    const result = solveTwoBoneSupport(input);
    rigid(input, result);
    expect(result.reachable).toBe(false);
    expect(result.error).toBeCloseTo(error, 12);
    expect(result.foot).not.toEqual(input.target);
  });

  it("honors independent per-chain maximum reach and inclusive reach boundaries", () => {
    for (const maxReach of [1, 1.5, 2]) {
      const input = { ...base, maxReach, target: [0, -.2, 0] as const };
      const result = solveTwoBoneSupport(input);
      rigid(input, result);
      expect(result.reachable).toBe(maxReach >= 1.2);
      expect(distance(result.foot, input.root)).toBeCloseTo(Math.min(1.2, maxReach), 12);
    }
    for (const d of [.5, 1.1]) {
      const input = { ...base, root: [0, 0, 0] as const, target: [0, d, 0] as const, upperLength: .8, lowerLength: .3 };
      const result = solveTwoBoneSupport(input);
      rigid(input, result);
      expect(result.reachable).toBe(true);
      expect(result.error).toBe(0);
    }
  });

  it("has finite deterministic rigid fallback for coincident, near and collinear goals/poles", () => {
    for (const lowerLength of [.75, .25]) for (const d of [0, 1e-14, .5, 1.5, 2]) {
      for (const pole of [[0, 1, 0], [0, 4, 0], [0, 0, 0]] as const) {
        const input = frozen({ ...base, target: [0, 1 - d, 0], pole, lowerLength });
        const result = solveTwoBoneSupport(input);
        rigid(input, result);
        expect(result.reachable).toBe(d >= Math.abs(.75 - lowerLength) && d <= .75 + lowerLength);
        expect(solveTwoBoneSupport(input)).toEqual(result);
      }
    }
  });

  it.each([
    { upperLength: 0 }, { lowerLength: 0 }, { upperLength: -1 }, { lowerLength: NaN },
    { upperLength: Infinity }, { maxReach: 0 }, { maxReach: -1 }, { maxReach: Infinity },
    { maxReach: NaN }, { upperLength: 1, lowerLength: .25, maxReach: .5 },
    { root: [NaN, 0, 0] }, { target: [0, Infinity, 0] }, { pole: [0, 0, -Infinity] },
  ])("rejects invalid chain $index without mutating input", (changes) => {
    const input = frozen({ ...base, ...changes } as SupportChainInput);
    const before = { ...input, root: [...input.root], target: [...input.target], pole: [...input.pole] };
    expect(() => solveTwoBoneSupport(input)).toThrow(RangeError);
    expect(input).toEqual(before);
  });
});
