import { expect, it } from "vitest";
import { CatPoseRenderer, type CatPoseRenderInputs } from "@/features/pet-home/cat-pose-renderer";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { PREVIEW_PET_NEEDS } from "@/features/pet-home/pet-stats";
import { poseScene } from "./cat-pose-fixture";

const poses = ["seated", "standing", "loaf"] as const;

// T7 defect (S41/L189): the petting bounce lifts the root up to .04 while all
// seated feet stay declared planted with frozen goals, so the LAST-layer
// support IK reports unreachable feet and drift above the .001 gate. Planted
// feet must stay reachable (drift ≤ .001) through the whole bounce in every
// upright pose (S8), at hunger 0 and 100.
for (const hunger of [0, 100]) for (const pose of poses) it(
  `keeps planted petting-bounce feet reachable (hunger ${hunger}, ${pose})`, () => {
    const rig = poseScene(hunger);
    const input: CatPoseRenderInputs = { cues: needVisualCues({ ...PREVIEW_PET_NEEDS, hunger }), reducedMotion: false, reactPulse: 0 };
    const renderer = new CatPoseRenderer(rig.skeleton, rig.joints, rig.boxes, input, 0);
    renderer.simulation.enqueue({ tick: Math.floor(renderer.simulation.tick) + 1, kind: "pose", pose });
    let stable = false;
    for (let i = 0; i < 180 && !stable; i++) {
      const frame = renderer.render(1 / 60);
      stable = frame.pose === pose && frame.transitionTo === null && frame.transitionProgress === 1;
    }
    expect(stable, "rig never reached " + pose).toBe(true);
    // Reproduce the mobile touch-wake path (t7-r2 mobile-b): care-sleep routes
    // to curled, a touch wakes the cat and the graph returns it to seated
    // before the petting clicks.
    if (pose === "seated") {
      renderer.simulation.enqueue({ tick: Math.floor(renderer.simulation.tick) + 1, kind: "care", action: "sleep", sequence: 1 });
      let asleep = false;
      for (let i = 0; i < 480 && !asleep; i++) {
        const frame = renderer.render(1 / 60);
        // Sleep goal depends on seed parity: curled (odd) or side (even).
        asleep = frame.sleeping && (frame.pose === "curled" || frame.pose === "side") && frame.transitionTo === null;
      }
      expect(asleep, "rig never reached sleeping curled").toBe(true);
      renderer.simulation.enqueue({ tick: Math.floor(renderer.simulation.tick) + 1, kind: "touch", yawDeg: 0, pitchDeg: 0 });
      let woke = false;
      for (let i = 0; i < 600 && !woke; i++) {
        const frame = renderer.render(1 / 60);
        woke = frame.pose === "seated" && frame.transitionTo === null && frame.transitionProgress === 1;
      }
      expect(woke, "rig never returned to stable seated after wake").toBe(true);
    }
    renderer.simulation.enqueue({ tick: Math.floor(renderer.simulation.tick) + 1, kind: "pet" });
    const violations: unknown[] = [];
    let replanted = false;
    for (let i = 0; i < 40; i++) {
      const frame = renderer.render(1 / 60);
      const { unreachableFeet, maxFootDrift, plantedFeet } = renderer.diagnostics;
      if (frame.bounce > 0 && plantedFeet > 0 && (unreachableFeet !== 0 || (maxFootDrift ?? 0) > .001)) {
        violations.push({ tick: frame.tick, bounce: frame.bounce, plantedFeet, unreachableFeet, maxFootDrift });
      }
      // Floor gate (S19 criterion 2): every visible box stays on or above the
      // recorded alarm floor through the whole window, including the release
      // and replant ticks (mobile-b t7-r2 caught a paw .00046 below at the
      // zero-bounce first tick of the release).
      if (frame.bounce > 0 || plantedFeet === 0) {
        let floor = Infinity;
        for (const [id, node] of rig.boxes) if (node.visible) for (const p of rig.corners(id)) floor = Math.min(floor, p.y);
        if (floor < -.291) violations.push({ tick: frame.tick, phase: "floor", floor });
      }
      // After the bounce the declared supports must replant at the same frozen
      // goals (S31 landing restore), never stay released.
      if (frame.bounce === 0 && plantedFeet === (pose === "loaf" ? 0 : 4)) replanted = true;
      if (replanted && (unreachableFeet !== 0 || (maxFootDrift ?? 0) > .001)) {
        violations.push({ tick: frame.tick, phase: "post-bounce", plantedFeet, unreachableFeet, maxFootDrift });
      }
    }
    expect(replanted, "supports never replanted after the pet bounce").toBe(true);
    expect(violations, JSON.stringify(violations)).toEqual([]);
  }, 30_000);
