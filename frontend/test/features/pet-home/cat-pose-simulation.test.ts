import { describe, expect, it, vi } from "vitest";
import { Quaternion } from "three";
import { CatPoseSimulation, type CatPoseFrame } from "@/features/pet-home/cat-pose-simulation";
import { CAT_JOINT_IDS, CAT_POSE_IDS, CAT_POSES, compileCatPose } from "@/features/pet-home/cat-pose-data";
import { CAT_POSE_EDGES, sampleCatPoseTransition } from "@/features/pet-home/cat-pose-graph";
import { sampleCatIdleMotion } from "@/features/pet-home/cat-idle-motion";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import type { CatPoseId } from "@/features/pet-home/cat-pose-types";

const create = () => new CatPoseSimulation({ seed: 123 });
const step = (sim: CatPoseSimulation, count: number) => { for (let i = 0; i < count; i++) sim.step(); return sim.sample(1); };
function until(sim: CatPoseSimulation, predicate: (frame: CatPoseFrame) => boolean, limit = 600) {
  for (let i = 0; i < limit; i++) {
    sim.step();
    if (predicate(sim.sample(1))) return sim.sample(1);
  }
  throw new Error("Requested public pose was not reached within its graph duration");
}
function pose(sim: CatPoseSimulation, target: CatPoseId) {
  sim.enqueue({ tick: sim.tick + 1, kind: "pose", pose: target });
  return until(sim, frame => frame.pose === target && frame.transitionTo === null);
}

describe("fixed-step A2 pose simulation", () => {
  it("is deterministic at 30/60/120 displayed fps, using sixty simulation ticks", () => {
    const results = [30, 60, 120].map(fps => {
      const sim = create();
      sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
      for (let i = 0; i < fps; i++) sim.advance(1 / fps);
      return { tick: sim.tick, frame: structuredClone(sim.sample(1)) };
    });
    expect(results.map(result => result.tick)).toEqual([60, 60, 60]);
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });

  it("rejects non-future tick inputs without changing counters, frame or queued behavior", () => {
    const sim = create(), before = structuredClone(sim.sample(1));
    expect(() => sim.enqueue({ tick: 0, kind: "pose", pose: "standing" })).toThrow("Pose inputs require a future integer simulation tick.");
    expect(sim.tick).toBe(0);
    expect(sim.sample(1)).toEqual(before);
    const next = step(sim, 1);
    expect(next.tick).toBe(1);
    expect(next.pose).toBe("seated");
    expect(next.transitionTo).toBe(null);
  });

  it("follows authored stage tracks without applying a second whole-edge easing", () => {
    const sim = create();
    sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
    const frame = step(sim, 20);
    const edge = CAT_POSE_EDGES.find(edge => edge.from === "seated" && edge.to === "standing")!;
    const expected = sampleCatPoseTransition(compileCatPose(CAT_POSES.seated), compileCatPose(CAT_POSES.standing), edge, 19 / edge.durationTicks);
    for (const [index, id] of CAT_JOINT_IDS.entries()) {
      expect([...frame.base.slice(index * 4, index * 4 + 4)]).toEqual([...expected.rotations[id]]);
    }
    expect([...frame.rootOffset]).toEqual([...expected.rootOffset]);
    expect(frame.headingDeg).toBe(expected.headingDeg);
  });

  it("reuses output buffers and never depends on a wall clock or global random stream", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("global random forbidden"); });
    const clock = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("wall clock forbidden"); });
    let first: CatPoseFrame, second: CatPoseFrame, base: Float64Array;
    try {
      const sim = create(); first = sim.sample(1); base = first.base;
      sim.enqueue({ tick: 1, kind: "care", action: "play", sequence: 1 });
      step(sim, 120); second = sim.sample(.5);
    } finally { random.mockRestore(); clock.mockRestore(); }
    expect(second!).toBe(first!);
    expect(second!.base).toBe(base!);
    expect([...second!.rotations].every(Number.isFinite)).toBe(true);
  });

  it("updates gaze and interested ears on the next tick, clamping horizontal and vertical totals", () => {
    const sim = create();
    sim.enqueue({ tick: 1, kind: "touch", yawDeg: 100, pitchDeg: 90 });
    expect(sim.sample(1).gazeYaw).toBe(0);
    const first = step(sim, 1);
    expect(first.gazeYaw).toBeGreaterThan(0);
    expect(first.gazePitch).toBeGreaterThan(0);
    expect(first.earInterest).toBeGreaterThan(0);
    const settled = step(sim, 90);
    expect(settled.gazeYaw).toBeCloseTo(45, 2);
    expect(settled.gazePitch).toBeCloseTo(20, 2);
    sim.enqueue({ tick: sim.tick + 1, kind: "look", yawDeg: -100, pitchDeg: -100 });
    const opposite = step(sim, 120);
    expect(opposite.gazeYaw).toBeCloseTo(-45, 2);
    expect(opposite.gazePitch).toBeCloseTo(-25, 2);
  });

  it("redirects within ten ticks from the instantaneous base, never the additive rendered pose", () => {
    const sim = create();
    sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
    step(sim, 16);
    expect(sim.sample(1).transitionTo).toBe("standing");
    const requestTick = sim.tick + 1;
    sim.enqueue({ tick: requestTick, kind: "care", action: "sleep", sequence: 2 });
    // Owner decision A (S7): the unfinished authored leg is COMPLETED at its authored endpoint and
    // the newest intention only then publishes, from that landed simulation base - never from the
    // breath/spring-modified rendered pose. The whole interruption costs <= 300 ms at 30 Hz.
    const standing = compileCatPose(CAT_POSES.standing);
    let landed: CatPoseFrame | null = null, published: CatPoseFrame | null = null;
    for (let i = 0; i <= 10 && published === null; i++) {
      sim.step();
      const current = structuredClone(sim.sample(1));
      expect(current.bridging, `tick ${current.tick}`).toBe(false);
      if (landed === null) {
        if (current.transitionTo !== null) expect(current.transitionTo).toBe("standing");
        else {
          expect(current.transitionFrom).toBe(null);
          expect(current.pose).toBe("standing");
          expect(current.transitionProgress).toBe(1);
          expect([...current.rootOffset]).toEqual([...standing.rootOffset]);
          for (const [index, id] of CAT_JOINT_IDS.entries()) {
            expect(Array.from(current.base.slice(index * 4, index * 4 + 4)), `tick ${current.tick}: ${id}`).toEqual([...standing.rotations[id]]);
          }
          landed = current;
        }
      } else {
        // Only now does the pending arc publish, at progress 0, from the landed base.
        expect(current.tick).toBe(landed.tick + 1);
        expect(current.transitionProgress).toBe(0);
        expect([...current.base]).toEqual([...landed.base]);
        published = current;
      }
    }
    expect(landed).not.toBe(null); expect(published).not.toBe(null);
    // The seeded sleep goal leaves standing through sphinx (standing -> sphinx -> side -> curled).
    expect(published!.transitionFrom).toBe("standing"); expect(published!.transitionTo).toBe("sphinx");
    expect(published!.tick - requestTick, `redirect in effect ${published!.tick - requestTick} ticks after the request`).toBeLessThanOrEqual(10);
  });

  it("keeps nonzero secondary tail motion through an interruption instead of resetting springs", () => {
    const sim = create(); step(sim, 45);
    const delta = (frame: CatPoseFrame) => new Quaternion().fromArray(frame.base, 19 * 4).invert()
      .multiply(new Quaternion().fromArray(frame.rotations, 19 * 4)).angleTo(new Quaternion());
    expect(delta(sim.sample(1))).toBeGreaterThan(.001);
    sim.enqueue({ tick: sim.tick + 1, kind: "care", action: "sleep", sequence: 1 });
    expect(delta(step(sim, 1))).toBeGreaterThan(.001);
  });

  it("retains the original seeded blink and ear-tic schedule", () => {
    for (const energy of [0, 100]) for (const fun of [0, 100]) {
      const cues = needVisualCues({ hunger: 100, hygiene: 100, energy, fun });
      const sim = new CatPoseSimulation({ seed: 13, cues });
      for (let tick = 1; tick <= 1800; tick++) {
        sim.step();
        const frame = sim.sample(1), legacy = sampleCatIdleMotion(tick / 60, cues, { seed: 13, reducedMotion: false });
        expect(frame.eyeScale).toBe(legacy.eyeL?.scaleY ?? 1);
        expect(frame.idleEarSide).toBe(legacy.earL ? "L" : legacy.earR ? "R" : null);
      }
    }
  });

  it("uses awake .4Hz and sleeping .3Hz breathing without a root bounce", () => {
    const awake = create();
    const peak = step(awake, 37);
    expect(peak.bodyBreath).toBeGreaterThan(1.0099);
    expect(peak.bounce).toBe(0);
    expect(step(awake, 113).bodyBreath).toBeCloseTo(1, 12);
    const asleep = create();
    asleep.enqueue({ tick: 1, kind: "care", action: "sleep", sequence: 1 });
    until(asleep, frame => frame.sleeping);
    const first = asleep.sample(1).bodyBreath;
    expect(step(asleep, 200).bodyBreath).toBeCloseTo(first, 12);
  });

  it("holds sleep, wakes on touch with squint through the graph, and never jumps to standing", () => {
    const sim = create();
    sim.enqueue({ tick: 1, kind: "care", action: "sleep", sequence: 1 });
    until(sim, frame => frame.sleeping);
    expect(step(sim, 300).sleeping).toBe(true);
    sim.enqueue({ tick: sim.tick + 1, kind: "touch", yawDeg: 20, pitchDeg: 0 });
    const first = step(sim, 1);
    expect(first.sleeping).toBe(false);
    expect(first.eyeScale).toBeLessThanOrEqual(.5);
    expect(first.transitionTo).toBe("side");
    const visited = new Set<CatPoseId>();
    until(sim, frame => { visited.add(frame.pose); expect(frame.pose).not.toBe("standing"); return frame.pose === "seated" && !frame.transitionTo; });
    expect(visited.has("sphinx")).toBe(true);
  });

  it("wakes automatically after the documented sixty-second simulation hold", () => {
    const sim = create();
    sim.enqueue({ tick: 1, kind: "care", action: "sleep", sequence: 1 });
    until(sim, frame => frame.sleeping);
    expect(step(sim, 3600).sleeping).toBe(true);
    expect(step(sim, 500).sleeping).toBe(false);
    expect(sim.sample(1).pose).toBe("seated");
  });

  it.each(CAT_POSE_IDS)("petting %s bounces only when upright/loaf, otherwise squints", target => {
    const sim = create(); pose(sim, target);
    sim.enqueue({ tick: sim.tick + 1, kind: "pet" });
    const frame = step(sim, 8);
    if (["seated", "standing", "loaf"].includes(target)) expect(frame.bounce).toBeGreaterThan(0);
    else { expect(frame.bounce).toBe(0); expect(frame.eyeScale).toBeLessThanOrEqual(.5); }
  });

  it("deduplicates successful care sequences, shows the feed plate only during chewing and returns legally", () => {
    const sim = create();
    sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 5 });
    until(sim, frame => frame.plateVisible);
    expect(sim.sample(1).pose).toBe("standing");
    expect(sim.sample(1).visibleMask & 48).toBe(48);
    sim.enqueue({ tick: sim.tick + 1, kind: "care", action: "sleep", sequence: 5 });
    step(sim, 30); expect(sim.sample(1).plateVisible).toBe(true);
    until(sim, frame => frame.pose === "seated" && !frame.transitionTo && !frame.plateVisible);
    expect(sim.sample(1).visibleMask & 48).toBe(0);
  });

  it("crossfades outgoing care masks instead of snapping the visible head on interruption", () => {
    const sim = create();
    sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
    until(sim, frame => frame.plateVisible);
    step(sim, 30);
    const previous = new Quaternion().fromArray(sim.sample(1).rotations, 3 * 4);
    sim.enqueue({ tick: sim.tick + 1, kind: "care", action: "sleep", sequence: 2 });
    const next = step(sim, 1);
    expect(next.plateVisible).toBe(false);
    expect(previous.angleTo(new Quaternion().fromArray(next.rotations, 3 * 4))).toBeLessThan(10 * Math.PI / 180);
  });

  it.each(["feed", "play", "sleep", "bathe"] as const)("changing motion preference during %s never resumes a hidden hop", action => {
    const sim = create();
    sim.enqueue({ tick: 1, kind: "care", action, sequence: 1 });
    step(sim, 15);
    sim.enqueue({ tick: sim.tick + 1, kind: "reducedMotion", value: true });
    const cut = step(sim, 1);
    expect(cut.transitionTo).toBe(null);
    expect(cut.bodyBreath).toBe(1);
    expect(cut.bounce).toBe(0);
    const stableBase = cut.base.slice();
    expect([...sim.sample(.37).base]).toEqual([...stableBase]);
    sim.enqueue({ tick: sim.tick + 1, kind: "pet" });
    expect(step(sim, 1).bounce).toBe(0);
    sim.enqueue({ tick: sim.tick + 1, kind: "reducedMotion", value: false });
    expect(step(sim, 1).bounce).toBe(0);
  });

  it("cuts to stable reduced-motion targets with blink and feedback, no breath/spring/hop/fade", () => {
    const sim = new CatPoseSimulation({ seed: 123, reducedMotion: true });
    sim.enqueue({ tick: 1, kind: "care", action: "feed", sequence: 1 });
    const feeding = step(sim, 1);
    expect(feeding.pose).toBe("standing"); expect(feeding.transitionTo).toBe(null);
    expect(feeding.plateVisible).toBe(true); expect(feeding.bodyBreath).toBe(1); expect(feeding.bounce).toBe(0);
    sim.enqueue({ tick: 2, kind: "pet" });
    expect(step(sim, 1).eyeScale).toBeLessThanOrEqual(.5);
    expect(sim.sample(1).bounce).toBe(0);
    sim.enqueue({ tick: 3, kind: "reducedMotion", value: false });
    expect(step(sim, 1).bodyBreath).not.toBe(1);
  });
});
