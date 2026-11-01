import { describe, expect, it } from "vitest";
import { CatPoseSimulation, type CatPoseFrame } from "@/features/pet-home/cat-pose-simulation";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";

const copy = (sim: CatPoseSimulation) => structuredClone(sim.sample(1));
function until(sim: CatPoseSimulation, match: (frame: CatPoseFrame) => boolean) {
  for (let i = 0; i < 240; i++) { sim.step(); if (match(sim.sample(1))) return copy(sim); }
  throw new Error("Authored boundary was not reached");
}
function expectGeometryTime(sim: CatPoseSimulation, previous: CatPoseFrame, current: CatPoseFrame, alpha: number, endProgress: number) {
  const rendered = sim.sample(alpha);
  expect(rendered.transitionFrom).toBe(previous.transitionFrom);
  expect(rendered.transitionTo).toBe(previous.transitionTo);
  expect(rendered.pose).toBe(previous.pose);
  expect(rendered.transitionProgress).toBeCloseTo(previous.transitionProgress + (endProgress - previous.transitionProgress) * alpha, 12);
  expect(rendered.supportMask).toBe(previous.supportMask);
  expect(rendered.visibleMask & 15).toBe(previous.visibleMask & 15);
  expect(rendered.tick).toBe(sim.tick); // still the authoritative INTEGER tick
  for (let axis = 0; axis < 3; axis++) {
    expect(rendered.rootOffset[axis]).toBeCloseTo(previous.rootOffset[axis] + (current.rootOffset[axis] - previous.rootOffset[axis]) * alpha, 12);
  }
}

describe("contact metadata follows sampled geometry, not the next fixed tick (S1/S4/S7)", () => {
  it("interpolates phase progress within one edge without changing authoritative state", () => {
    const sim = new CatPoseSimulation({ seed: 13 });
    sim.enqueue({ tick: 1, kind: "pose", pose: "standing" });
    for (let i = 0; i < 20; i++) sim.step();
    const previous = copy(sim); sim.step(); const current = copy(sim);
    for (const alpha of [0, .25, .5, .75]) expectGeometryTime(sim, previous, current, alpha, current.transitionProgress);
    expect(sim.sample(1)).toEqual(current);
  });
  it("keeps the finishing edge until its endpoint is actually sampled", () => {
    const sim = new CatPoseSimulation({ seed: 13 });
    sim.enqueue({ tick: 1, kind: "pose", pose: "standing" });
    const ticks = CAT_POSE_EDGES.find(e => e.from === "seated" && e.to === "standing")!.durationTicks;
    const previous = until(sim, f => f.transitionTo === "standing" && f.transitionProgress === (ticks - 1) / ticks);
    sim.step(); const current = copy(sim);
    expect(current.transitionTo).toBe(null); expect(current.pose).toBe("standing");
    for (const alpha of [0, .25, .5, .75]) expectGeometryTime(sim, previous, current, alpha, 1);
    expect(sim.sample(1)).toEqual(current);
  });
  it("does not publish the next directed arc over the previous arc's geometry", () => {
    const sim = new CatPoseSimulation({ seed: 13 });
    sim.enqueue({ tick: 1, kind: "pose", pose: "side" });
    const ticks = CAT_POSE_EDGES.find(e => e.from === "seated" && e.to === "sphinx")!.durationTicks;
    const previous = until(sim, f => f.transitionTo === "sphinx" && f.transitionProgress === (ticks - 1) / ticks);
    sim.step(); const current = copy(sim);
    expect(current.transitionFrom).toBe("sphinx"); expect(current.transitionTo).toBe("side");
    for (const alpha of [0, .25, .5, .75]) expectGeometryTime(sim, previous, current, alpha, 1);
    expect(sim.sample(1)).toEqual(current);
  });
  it.each(["repeat", "redirect"] as const)("holds the old phase over a %s base snapshot, not a fictitious completion", kind => {
    const sim = new CatPoseSimulation({ seed: 13 });
    sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
    for (let i = 0; i < 20; i++) sim.step();
    sim.enqueue(kind === "repeat" ? { tick: 21, kind: "care", action: "feed", sequence: 2 }
      : { tick: 21, kind: "pose", pose: "loaf" });
    for (let wait = 0; wait <= 18; wait++) {
      const previous = copy(sim); sim.step(); const current = copy(sim);
      if (previous.transitionProgress > 0 && current.transitionProgress === 0) {
        expect([...current.base]).toEqual([...previous.base]);
        for (const alpha of [0, .25, .5, .75]) expectGeometryTime(sim, previous, current, alpha, previous.transitionProgress);
        expect(sim.sample(1)).toEqual(current); return;
      }
    }
    throw new Error("The supported redirect did not occur within 18 ticks");
  });
  it("interpolates a true eighteen-tick bridge completion to its own endpoint", () => {
    const sim = new CatPoseSimulation({ seed: 13 });
    sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
    for (let i = 0; i < 20; i++) sim.step();
    sim.enqueue({ tick: 21, kind: "care", action: "feed", sequence: 2 });
    const previous = until(sim, f => f.transitionTo === "standing" && f.transitionProgress === 17 / 18);
    sim.step(); const current = copy(sim);
    expect(current.pose).toBe("standing"); expect(current.transitionTo).toBe(null);
    for (const alpha of [0, .25, .5, .75]) expectGeometryTime(sim, previous, current, alpha, 1);
    expect(sim.sample(1)).toEqual(current);
  });
  it("preserves the existing reduced-motion stable cut at every render alpha", () => {
    const sim = new CatPoseSimulation({ seed: 13, reducedMotion: true });
    sim.enqueue({ tick: 1, kind: "pose", pose: "loaf" }); sim.step();
    const current = copy(sim);
    for (const alpha of [0, .25, .5, .75, 1]) {
      expect(sim.sample(alpha)).toEqual(current);
      expect(sim.sample(alpha).transitionTo).toBe(null);
    }
  });
});
