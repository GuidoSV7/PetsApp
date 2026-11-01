import { describe, expect, it } from "vitest";
import { Quaternion } from "three";
import { CAT_JOINT_IDS, CAT_POSE_IDS, CAT_POSES, compileCatPose } from "../../../src/features/pet-home/cat-pose-data";
import { CAT_POSE_EDGES, findCatPoseRoute, sampleCatPoseTransition } from "../../../src/features/pet-home/cat-pose-graph";
import type { CatPoseEdge, CatPoseId } from "../../../src/features/pet-home/cat-pose-types";
const edge = (from: CatPoseId, to: CatPoseId): CatPoseEdge => CAT_POSE_EDGES.find(e => e.from === from && e.to === to)
  ?? { from, to, durationTicks: 54, easing: "smootherstep", waypoints: [] };
const sample = (e: CatPoseEdge, t: number) => sampleCatPoseTransition(compileCatPose(CAT_POSES[e.from]), compileCatPose(CAT_POSES[e.to]), e, t);
const angle = (a: readonly number[], b: readonly number[]) => new Quaternion(...a as [number, number, number, number]).angleTo(new Quaternion(...b as [number, number, number, number])) * 180 / Math.PI;
describe("directed cat pose graph", () => {
  it("declares exactly the thirteen directed edges with approved integral timings", () => {
    expect(CAT_POSE_EDGES.map(e => [e.from, e.to, e.durationTicks])).toEqual([
      ["seated", "standing", 51], ["standing", "seated", 57], ["standing", "sphinx", 54],
      ["sphinx", "seated", 54], ["sphinx", "side", 51], ["side", "sphinx", 51],
      ["side", "curled", 57], ["curled", "side", 57], ["side", "bellyUp", 66],
      ["bellyUp", "side", 66], ["seated", "loaf", 45], ["loaf", "seated", 48], ["seated", "sphinx", 54],
    ]);
  });
  it("routes sleeping directly through sphinx and all floor-to-standing paths through seated", () => {
    expect(findCatPoseRoute("seated", "curled")).toEqual(["seated", "sphinx", "side", "curled"]);
    expect(findCatPoseRoute("standing", "side")).toEqual(["standing", "sphinx", "side"]);
    for (const from of ["loaf", "sphinx", "side", "curled", "bellyUp"] as const) {
      expect(findCatPoseRoute(from, "standing")).toContain("seated");
    }
    for (const from of CAT_POSE_IDS) for (const to of CAT_POSE_IDS) {
      const route = findCatPoseRoute(from, to);
      expect(route[0]).toBe(from); expect(route.at(-1)).toBe(to);
      expect(route).toEqual(findCatPoseRoute(from, to));
      for (let i = 1; i < route.length; i++) expect(CAT_POSE_EDGES.some(e => e.from === route[i - 1] && e.to === route[i])).toBe(true);
    }
  });
  it("samples eased quaternion stages and unwrapped heading without input mutation", () => {
    const from = { ...compileCatPose(CAT_POSES.seated), headingDeg: 350 };
    const to = { ...compileCatPose(CAT_POSES.standing), headingDeg: 370 };
    const e = edge("seated", "standing"), before = JSON.stringify([from, to, e]);
    expect(sampleCatPoseTransition(from, to, e, 0)).toEqual(from);
    expect(sampleCatPoseTransition(from, to, e, 1)).toEqual(to);
    const mid = sampleCatPoseTransition(from, to, e, .5);
    expect(mid.headingDeg).toBe(360);
    expect(mid).toEqual(sampleCatPoseTransition(from, to, e, .5));
    for (const q of Object.values(mid.rotations)) expect(Math.hypot(...q)).toBeCloseTo(1, 12);
    expect(JSON.stringify([from, to, e])).toBe(before);
    expect(mid.rootOffset).not.toBe(from.rootOffset);
  });
  it("lowers pelvis first, delays forelegs, and settles tail last on standing-to-seated", () => {
    const e = edge("standing", "seated"), start = sample(e, 0), early = sample(e, .25), late = sample(e, .8), end = sample(e, 1);
    expect(early.rootOffset[1]).toBeLessThan(start.rootOffset[1]);
    expect(early.rotations["joint-shoulderFL"]).toEqual(start.rotations["joint-shoulderFL"]);
    expect(late.rootOffset).toEqual(end.rootOffset);
    expect(late.rotations["joint-tailBase"]).toEqual(start.rotations["joint-tailBase"]);
    expect(angle(sample(e, .9).rotations["joint-tailBase"], end.rotations["joint-tailBase"])).toBeGreaterThan(0);
  });
  it("uses explicit roll landmarks and bounds every authored quaternion segment to 150 degrees", () => {
    expect(sample(edge("sphinx", "side"), .5).rotations["joint-root"][2]).toBeCloseTo(Math.sin(Math.PI / 8));
    expect(sample(edge("side", "bellyUp"), .5).rotations["joint-root"][2]).toBeCloseTo(Math.sin(3 * Math.PI / 8));
    for (const e of CAT_POSE_EDGES) {
      expect(sample(e, 0)).toEqual(compileCatPose(CAT_POSES[e.from]));
      expect(sample(e, 1)).toEqual(compileCatPose(CAT_POSES[e.to]));
      const times = [0, ...e.waypoints.map(w => w.at), 1];
      for (let i = 1; i < times.length; i++) for (const id of CAT_JOINT_IDS) {
        expect(angle(sample(e, times[i - 1]).rotations[id], sample(e, times[i]).rotations[id])).toBeLessThanOrEqual(150 + 1e-8);
      }
      for (let tick = 0; tick <= e.durationTicks; tick++) {
        const frame = sample(e, tick / e.durationTicks);
        for (const q of Object.values(frame.rotations)) expect(Math.hypot(...q)).toBeCloseTo(1, 12);
        expect(frame.visibleParts).not.toContain("jaw"); expect(frame.visibleParts).not.toContain("tongue");
      }
    }
  });
  it("requires explicit waypoints instead of silently shortcutting a long quaternion segment", () => {
    const from = compileCatPose(CAT_POSES.seated);
    const to = compileCatPose({ ...CAT_POSES.seated, rotationDeg: { ...CAT_POSES.seated.rotationDeg, "joint-root": [0, 0, 180] } });
    const e: CatPoseEdge = { from: "seated", to: "seated", durationTicks: 60, easing: "smoothstep", waypoints: [] };
    expect(() => sampleCatPoseTransition(from, to, e, .5)).toThrow(/150/);
  });
  it("honors intermediate quaternion roll direction rather than Euler wrapping", () => {
    const make = (z: number) => compileCatPose({ ...CAT_POSES.seated, rotationDeg: { ...CAT_POSES.seated.rotationDeg, "joint-root": [0, 0, z] } });
    const e: CatPoseEdge = { from: "seated", to: "seated", durationTicks: 60, easing: "smoothstep", waypoints: [
      { at: .25, rotationDeg: { "joint-root": [0, 0, 90] } },
      { at: .5, rotationDeg: { "joint-root": [0, 0, 0] } },
      { at: .75, rotationDeg: { "joint-root": [0, 0, -90] } },
    ] };
    expect(sampleCatPoseTransition(make(170), make(-170), e, .5).rotations["joint-root"]).toEqual([0, 0, 0, 1]);
  });
  it("interpolates heading linearly without wrapping or applying stage easing", () => {
    const from = { ...compileCatPose(CAT_POSES.seated), headingDeg: 350 };
    const to = { ...compileCatPose(CAT_POSES.standing), headingDeg: 370 };
    expect(sampleCatPoseTransition(from, to, edge("seated", "standing"), .25).headingDeg).toBe(355);
  });
  it("preserves same-pose route and seated sampling compatibility", () => {
    expect(findCatPoseRoute("seated", "seated")).toEqual(["seated"]);
    const pose = compileCatPose(CAT_POSES.seated);
    expect(sampleCatPoseTransition(pose, pose, { from: "seated", to: "seated", durationTicks: 1, easing: "smoothstep", waypoints: [] }, .4)).toEqual(pose);
  });
});
