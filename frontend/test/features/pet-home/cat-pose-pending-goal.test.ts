import { describe, expect, it } from "vitest";
import { CatPoseSimulation, type CatPoseFrame } from "@/features/pet-home/cat-pose-simulation";
import { CAT_JOINT_IDS, CAT_POSES, compileCatPose } from "@/features/pet-home/cat-pose-data";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";

const snapshot = (sim: CatPoseSimulation) => structuredClone(sim.sample(1));
const standingTicks = CAT_POSE_EDGES.find(e => e.from === "seated" && e.to === "standing")!.durationTicks;
function enteringStanding() {
  const sim = new CatPoseSimulation({ seed: 13 });
  sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
  for (let i = 0; i < standingTicks; i++) sim.step();
  return sim;
}
function expectStableStanding(frame: CatPoseFrame) {
  const standing = compileCatPose(CAT_POSES.standing);
  expect(frame.pose).toBe("standing");
  expect(frame.transitionFrom).toBe(null); expect(frame.transitionTo).toBe(null);
  expect([...frame.rootOffset]).toEqual([...standing.rootOffset]);
  for (const [i, id] of CAT_JOINT_IDS.entries()) {
    expect([...frame.base.slice(i * 4, i * 4 + 4)]).toEqual([...standing.rotations[id]]);
  }
  expect(frame.supportMask).toBe(15);
  expect(frame.sleeping).toBe(false); expect(frame.plateVisible).toBe(false);
}

describe("new intent does not rename the old route's unfinished goal (S4/S7/S8)", () => {
  it.each(["pose", "care"] as const)("preserves actual endpoint and defers the %s reaction until its own legal route arrives", kind => {
    const sim = enteringStanding(), requestTick = sim.tick + 1;
    const desired = kind === "pose" ? "side" : "curled";
    sim.enqueue(kind === "pose" ? { tick: requestTick, kind: "pose", pose: "side" }
      : { tick: requestTick, kind: "care", action: "sleep", sequence: 2 });
    sim.step(); expectStableStanding(snapshot(sim));
    let redirected = false;
    for (let wait = 0; wait <= 18; wait++) {
      const frame = snapshot(sim);
      if (frame.transitionTo !== null) {
        expect(frame.transitionFrom).toBe("standing"); expect(frame.transitionTo).toBe("sphinx");
        expect(sim.tick - requestTick).toBeLessThanOrEqual(18); redirected = true; break;
      }
      expectStableStanding(frame); sim.step();
    }
    expect(redirected).toBe(true);
    let arrived = false;
    for (let i = 0; i < 240; i++) {
      sim.step(); const frame = snapshot(sim);
      if (frame.sleeping) { expect(frame.pose).toBe(desired); expect(frame.transitionTo).toBe(null); }
      if (frame.pose === desired && frame.transitionTo === null) {
        expect(frame.sleeping).toBe(kind === "care"); arrived = true; break;
      }
    }
    expect(arrived).toBe(true);
  });
  it("does not replay an older pending intent over a newer route started while idle", () => {
    const sim = enteringStanding();
    sim.enqueue({ tick: sim.tick + 1, kind: "pose", pose: "side" }); sim.step();
    sim.enqueue({ tick: sim.tick + 1, kind: "pose", pose: "loaf" });
    let arrived = false;
    for (let i = 0; i < 240; i++) {
      sim.step(); const frame = snapshot(sim);
      if (frame.pose === "loaf" && frame.transitionTo === null) { arrived = true; break; }
    }
    expect(arrived).toBe(true);
    for (let i = 0; i < 30; i++) sim.step();
    expect(sim.sample(1).pose).toBe("loaf"); expect(sim.sample(1).transitionTo).toBe(null);
  });
  it("preserves reduced motion's immediate cut to the newest pending intent", () => {
    const sim = enteringStanding();
    // Finish neither the old route nor the new one before requesting the cut.
    const requestTick = sim.tick + 1;
    sim.enqueue({ tick: requestTick, kind: "care", action: "sleep", sequence: 2 });
    sim.enqueue({ tick: requestTick, kind: "reducedMotion", value: true });
    sim.step(); const current = snapshot(sim);
    expect(current.pose).toBe("curled"); expect(current.transitionTo).toBe(null);
    expect(current.sleeping).toBe(true); expect(current.bodyBreath).toBe(1); expect(current.bounce).toBe(0);
    for (const alpha of [0, .25, .5, .75, 1]) expect(sim.sample(alpha)).toEqual(current);
  });
});
