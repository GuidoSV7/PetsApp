// S4/S19 — a declared body support must be on the floor, including across an interrupted
// retarget. The retarget bridge blends two individually grounded bases (slerp on rotations,
// linear on the base) and the intermediate base is not grounded; these tests pin that a declared
// body support is seated before the contact layer, without moving stable-authored poses.
import { expect, it } from "vitest";
import { CatPoseRenderer } from "@/features/pet-home/cat-pose-renderer";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import type { CatPoseId } from "@/features/pet-home/cat-pose-types";
import { poseScene } from "./cat-pose-fixture";

const cues = needVisualCues({ hunger: 100, fun: 100, energy: 100, hygiene: 100 });
const FRAME = 1 / 30;
const ENTRY = 165; // measured sleep-entry span: seated -> sphinx -> side -> curled

function setup() {
  const scene = poseScene(100);
  const renderer = new CatPoseRenderer(scene.skeleton, scene.joints, scene.boxes,
    { cues, reducedMotion: false, reactPulse: 0 }, 13);
  return { scene, renderer };
}

function bodyFloor(scene: ReturnType<typeof poseScene>) {
  scene.root.updateMatrixWorld(true);
  return scene.aabb("body").min.y;
}

it("S4/S19 every frame that declares a body support keeps it on the floor across a retarget", () => {
  // These fractions bridge into side->sphinx and sphinx->seated (belly): the measured offenders.
  for (const fraction of [.15, .4, .5, .6, .75]) {
    const { scene, renderer } = setup();
    const sim = renderer.simulation;
    const care = sim.tick + 1;
    sim.enqueue({ tick: care, kind: "care", action: "sleep", sequence: 1 });
    const target = care + Math.max(1, Math.round(fraction * ENTRY));
    while (sim.tick < target) renderer.render(FRAME);
    sim.enqueue({ tick: sim.tick + 1, kind: "care", action: "feed", sequence: 2 });
    for (let i = 0; i < 200; i++) {
      const frame = renderer.render(FRAME); // must not throw "Declared ... support is not on the floor"
      scene.root.updateMatrixWorld(true);
      const plan = renderer.bind.plan.resolve(frame);
      if (plan.body !== null) {
        expect(Math.abs(bodyFloor(scene) + .29), `fraction ${fraction} tick ${frame.tick}: declared ${plan.body}`).toBeLessThanOrEqual(.001);
      }
      expect(scene.aabb("body").min.y, `fraction ${fraction} tick ${frame.tick}: floor`).toBeGreaterThanOrEqual(-.291);
    }
  }
}, 120000);

it("S19 stable lying poses are not moved by the seat correction", () => {
  const stable: CatPoseId[] = ["sphinx", "loaf", "side", "curled", "bellyUp"];
  for (const pose of stable) {
    const { scene, renderer } = setup();
    const sim = renderer.simulation;
    sim.enqueue({ tick: sim.tick + 1, kind: "pose", pose });
    for (let i = 0; i < 260; i++) renderer.render(FRAME);
    const frame = renderer.render(FRAME);
    const plan = renderer.bind.plan.resolve(frame);
    expect(frame.pose).toBe(pose);
    expect(plan.body, pose).not.toBeNull();
    // Authored stable poses are already exact; the correction must stay at zero.
    expect(Math.abs(bodyFloor(scene) + .29), pose).toBeLessThanOrEqual(1e-9);
    const correction = (renderer.bind.contacts.diagnostics as unknown as { bodySupportCorrection?: number }).bodySupportCorrection;
    expect(correction ?? 0, `${pose} correction`).toBe(0);
  }
}, 120000);
