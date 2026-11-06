// S4/S19 — the retarget bridge blends two individually grounded configurations into one that is
// not grounded, and the S19 seat grounds only the DECLARED body support, so a free limb can hang
// under the floor while the body sits exactly on it. These tests pin that no limb crosses the
// floor during a transition, without touching planted feet, plant goals or authored poses.
import { expect, it } from "vitest";
import { Vector3 } from "three";
import { CatPoseRenderer } from "@/features/pet-home/cat-pose-renderer";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { poseScene } from "./cat-pose-fixture";

const cues = needVisualCues({ hunger: 100, fun: 100, energy: 100, hygiene: 100 });
const FRAME = 1 / 30;
const ENTRY = 165; // measured sleep-entry span: seated -> sphinx -> side -> curled
const FLOOR = -.291;

type Scene = ReturnType<typeof poseScene>;

function floorOf(scene: Scene, v: Vector3) {
  let floor = Infinity, part = "";
  for (const [id, node] of scene.boxes) {
    if (!node.visible) continue;
    const args = scene.skeleton.bindings.get(id)!.part.args;
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      v.set(x * args[0] / 2, y * args[1] / 2, z * args[2] / 2).applyMatrix4(node.matrixWorld);
      if (v.y < floor) { floor = v.y; part = id; }
    }
  }
  return { floor, part };
}

function setup() {
  const scene = poseScene(100);
  const renderer = new CatPoseRenderer(scene.skeleton, scene.joints, scene.boxes,
    { cues, reducedMotion: false, reactPulse: 0 }, 13);
  return { scene, renderer };
}

it("S4/S19 no limb crosses the floor on a bridged retarget", () => {
  // Measured offenders before the guard: .15 bridges into sphinx->seated (hind paws, worst
  // -0.32661) and .65/.70/.75 into side->sphinx (forefoot, -0.30208).
  for (const fraction of [.15, .65, .7, .75]) {
    const { scene, renderer } = setup();
    const v = new Vector3();
    const sim = renderer.simulation;
    sim.enqueue({ tick: 1, kind: "care", action: "sleep", sequence: 1 });
    const target = 1 + Math.max(1, Math.round(fraction * ENTRY));
    while (sim.tick < target) renderer.render(FRAME);
    sim.enqueue({ tick: sim.tick + 1, kind: "care", action: "feed", sequence: 2 });
    let worst = Infinity, worstPart = "", drift = 0;
    for (let i = 0; i < 200; i++) {
      renderer.render(FRAME);
      scene.root.updateMatrixWorld(true);
      const { floor, part } = floorOf(scene, v);
      if (floor < worst) { worst = floor; worstPart = part; }
      const diagnostics = renderer.bind.contacts.diagnostics;
      expect(diagnostics.unreachableFeet ?? 0, `fraction ${fraction}: planted goal unreachable`).toBe(0);
      drift = Math.max(drift, diagnostics.maxFootDrift ?? 0);
    }
    expect(worst, `fraction ${fraction}: ${worstPart} below the floor`).toBeGreaterThanOrEqual(FLOOR);
    expect(drift, `fraction ${fraction}: planted foot drift`).toBeLessThanOrEqual(.001);
  }
}, 240000);

it("S4 the floor guard does not touch planted feet, plant goals or authored edges", () => {
  const v = new Vector3();
  // A transition that keeps 15 planted feet throughout: the plan mask and every goal must survive.
  const { scene, renderer } = setup();
  const sim = renderer.simulation;
  sim.enqueue({ tick: 1, kind: "pose", pose: "standing", sequence: 1 });
  for (let i = 0; i < 40; i++) renderer.render(FRAME);
  sim.enqueue({ tick: sim.tick + 1, kind: "pose", pose: "seated", sequence: 2 });
  for (let i = 0; i < 60; i++) {
    const frame = renderer.render(FRAME);
    scene.root.updateMatrixWorld(true);
    const plan = renderer.bind.plan.resolve(frame);
    const diagnostics = renderer.bind.contacts.diagnostics;
    if (plan.feet === 15) expect(diagnostics.requestedMask, `tick ${frame.tick}`).toBe(15);
    expect(floorOf(scene, v).floor, `tick ${frame.tick}`).toBeGreaterThanOrEqual(FLOOR);
    expect(diagnostics.maxFootDrift ?? 0, `tick ${frame.tick}`).toBeLessThanOrEqual(.001);
  }
}, 120000);
