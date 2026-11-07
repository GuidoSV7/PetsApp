import { describe, expect, it } from "vitest";
import { CatPoseSimulation, type CatPoseInput } from "@/features/pet-home/cat-pose-simulation";
import { BASE_SIZE, CAT_POSE_LIBRARY } from "@/features/pet-home/cat-pose-tracks";
import { CAT_JOINT_IDS } from "@/features/pet-home/cat-pose-data";

function inputs(simulation: CatPoseSimulation) {
  const events: CatPoseInput[] = [
    { tick: 1, kind: "pose", pose: "loaf" }, { tick: 20, kind: "look", yawDeg: 30, pitchDeg: -20 },
    { tick: 70, kind: "care", sequence: 1, action: "feed" }, { tick: 95, kind: "pet" },
    { tick: 130, kind: "pose", pose: "seated" }, { tick: 180, kind: "reducedMotion", value: true },
    { tick: 190, kind: "pose", pose: "bellyUp" }, { tick: 200, kind: "reducedMotion", value: false },
  ];
  events.forEach(input => simulation.enqueue(input));
}

describe("transfer library public boundary", () => {
  it("omitted and explicit default libraries preserve every output field bit-for-bit", () => {
    for (const reducedMotion of [false, true]) {
      const plain = new CatPoseSimulation({ seed: 13, reducedMotion });
      const explicit = new CatPoseSimulation({ seed: 13, reducedMotion, library: CAT_POSE_LIBRARY });
      inputs(plain); inputs(explicit);
      expect(plain.sample()).toEqual(explicit.sample());
      for (let tick = 0; tick < 240; tick++) {
        plain.step(); explicit.step();
        for (const alpha of [0, .25, .5, .75, 1]) expect(explicit.sample(alpha)).toEqual(plain.sample(alpha));
      }
    }
  });
  it("consumes injected base data inside the core before additives and interruption snapshots", () => {
    const old = CAT_POSE_LIBRARY.tracks.seated.loaf!;
    const frames = new Float64Array(old.frames);
    // A deliberately distinct legal local quaternion, not an adapter-only pose.
    const joint = CAT_JOINT_IDS.indexOf("joint-elbowFL") * 4;
    for (let tick = 1; tick < old.duration; tick++) {
      frames[tick * BASE_SIZE + joint] = Math.sin(.2);
      frames[tick * BASE_SIZE + joint + 3] = Math.cos(.2);
    }
    const library = { ...CAT_POSE_LIBRARY, tracks: { ...CAT_POSE_LIBRARY.tracks,
      seated: { ...CAT_POSE_LIBRARY.tracks.seated, loaf: { ...old, frames } } } };
    const simulation = new CatPoseSimulation({ seed: 13, library });
    simulation.enqueue({ tick: 1, kind: "pose", pose: "loaf" });
    for (let tick = 0; tick < 10; tick++) simulation.step();
    const base = simulation.sample().base.slice();
    expect(base[joint]).toBe(Math.sin(.2));
    expect(simulation.sample().rotations[joint]).toBe(Math.sin(.2));
    simulation.enqueue({ tick: 11, kind: "pose", pose: "standing" });
    simulation.step();
    // Deferred redirect must not replace the live compiled base with default data.
    expect(simulation.sample().base[joint]).toBe(Math.sin(.2));
    expect(CAT_POSE_LIBRARY.tracks.seated.loaf!.frames).toBe(old.frames);
    expect(old.frames[9 * BASE_SIZE + joint]).not.toBe(Math.sin(.2));
  });
});
