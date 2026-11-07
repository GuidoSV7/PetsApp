import { describe, expect, it } from "vitest";
import { CatPoseSimulation, type CatPoseFrame } from "@/features/pet-home/cat-pose-simulation";
import { CAT_JOINT_IDS, CAT_POSES, compileCatPose } from "@/features/pet-home/cat-pose-data";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";
import { CAT_POSE_LIBRARY, type CatPoseLibrary } from "@/features/pet-home/cat-pose-tracks";

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
  it.each(["repeat", "redirect"] as const)("completes the interrupted leg before a %s destination publishes", kind => {
    const sim = new CatPoseSimulation({ seed: 13 });
    sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
    for (let i = 0; i < 20; i++) sim.step();
    const requestTick = sim.tick + 1;
    sim.enqueue(kind === "repeat" ? { tick: requestTick, kind: "care", action: "feed", sequence: 2 }
      : { tick: requestTick, kind: "pose", pose: "loaf" });
    // Owner decision A (S7): a new destination never publishes over an unsampled/incomplete
    // authored arc. The unfinished seated -> standing leg is completed first, at its authored
    // endpoint, and the pending arc (when there is one) publishes from that landed base.
    let previous = copy(sim), landed: CatPoseFrame | null = null, published: CatPoseFrame | null = null;
    for (let wait = 0; wait <= 10 && published === null; wait++) {
      sim.step(); const current = copy(sim);
      expect(current.bridging, `tick ${current.tick}`).toBe(false);
      if (landed === null) {
        if (previous.transitionTo !== null && current.transitionTo === null) {
          // Landed on the authored endpoint itself: sampled, not a fictitious completion.
          expect(current.pose).toBe("standing");
          expect(current.transitionProgress).toBe(1);
          const standing = compileCatPose(CAT_POSES.standing);
          expect([...current.rootOffset]).toEqual([...standing.rootOffset]);
          for (const [i, id] of CAT_JOINT_IDS.entries()) {
            expect(Array.from(current.base.slice(i * 4, i * 4 + 4)), `tick ${current.tick}: ${id}`).toEqual([...standing.rotations[id]]);
          }
          for (const alpha of [0, .25, .5, .75]) expectGeometryTime(sim, previous, current, alpha, 1);
          expect(sim.sample(1)).toEqual(current);
          landed = current;
        } else expect(current.transitionTo).toBe("standing");
      } else if (current.transitionTo !== null) {
        // The pending arc publishes one tick after landing, at progress 0, from the landed base.
        expect(current.tick).toBe(landed.tick + 1);
        expect(current.transitionProgress).toBe(0);
        expect([...current.base]).toEqual([...landed.base]);
        for (const alpha of [0, .25, .5, .75]) expectGeometryTime(sim, landed, current, alpha, 1);
        published = current;
      }
      previous = current;
    }
    expect(landed).not.toBe(null);
    expect(landed!.tick - requestTick, `landed ${landed!.tick - requestTick} ticks after the request`).toBeLessThanOrEqual(9);
    if (kind === "redirect") {
      expect(published).not.toBe(null);
      expect(published!.tick - requestTick, `next arc in effect ${published!.tick - requestTick} ticks after the request`).toBeLessThanOrEqual(10);
    } else {
      // Repeating the current destination lands and finishes there: no further arc is published.
      expect(sim.sample(1).pose).toBe("standing");
      expect(sim.sample(1).transitionTo).toBe(null);
    }
  });
  it("completes the interrupted leg at its authored endpoint instead of an eighteen-tick bridge", () => {
    const sim = new CatPoseSimulation({ seed: 13 });
    sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
    for (let i = 0; i < 20; i++) sim.step();
    const requestTick = sim.tick + 1;
    sim.enqueue({ tick: requestTick, kind: "care", action: "feed", sequence: 2 });
    // The same-goal interruption used to blend into a stable standing over eighteen bridge ticks. It
    // now finishes the authored leg: every interrupted tick stays on the same authored track, the
    // endpoint is reached within nine ticks, and no bridge age is ever published.
    let previous = copy(sim), landing: CatPoseFrame | null = null;
    for (let i = 0; i < 12 && landing === null; i++) {
      sim.step();
      const current = copy(sim);
      expect(current.bridging, `tick ${current.tick}`).toBe(false);
      if (current.transitionTo === null) { landing = current; break; }
      expect(current.transitionFrom).toBe("seated"); expect(current.transitionTo).toBe("standing");
      expect(current.transitionProgress, `tick ${current.tick}`).toBeGreaterThan(previous.transitionProgress);
      previous = current;
    }
    expect(landing).not.toBe(null);
    expect(landing!.tick - requestTick, `landed ${landing!.tick - requestTick} ticks after the request`).toBeLessThanOrEqual(9);
    expect(landing!.transitionProgress).toBe(1); expect(landing!.pose).toBe("standing");
    const standing = compileCatPose(CAT_POSES.standing);
    expect([...landing!.rootOffset]).toEqual([...standing.rootOffset]);
    for (const [i, id] of CAT_JOINT_IDS.entries()) expect(Array.from(landing!.base.slice(i * 4, i * 4 + 4))).toEqual([...standing.rotations[id]]);
    for (const alpha of [0, .25, .5, .75]) expectGeometryTime(sim, previous, landing!, alpha, 1);
    expect(sim.sample(1)).toEqual(landing);
    for (let i = 0; i < 24; i++) {
      sim.step();
      expect(sim.sample(1).transitionTo).toBe(null); expect(sim.sample(1).bridging).toBe(false);
    }
    expect(sim.sample(1).pose).toBe("standing");
  });
  it("keeps the eighteen-tick bridge when the route has no authored track", () => {
    // The bridgeOnly fallback is the only remaining eighteen-tick bridge: a route with no authored
    // leg (a single-node route) still crosses to its stable destination. A mid-leg interruption no
    // longer reaches it, because the interrupted authored leg is landed first.
    const library: CatPoseLibrary = { ...CAT_POSE_LIBRARY,
      routes: { ...CAT_POSE_LIBRARY.routes,
        seated: { ...CAT_POSE_LIBRARY.routes.seated, standing: ["standing"] as const } } };
    const sim = new CatPoseSimulation({ seed: 13, library });
    sim.enqueue({ tick: 1, kind: "pose", pose: "standing" });
    const previous = until(sim, frame => frame.transitionTo === "standing" && frame.transitionProgress === 17 / 18);
    expect(previous.bridging).toBe(true);
    sim.step(); const current = copy(sim);
    expect(current.pose).toBe("standing"); expect(current.transitionTo).toBe(null);
    expect(current.transitionProgress).toBe(1); expect(current.bridging).toBe(false);
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
