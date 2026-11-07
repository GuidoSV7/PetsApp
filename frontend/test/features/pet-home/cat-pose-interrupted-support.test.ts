import { expect, it } from "vitest";
import { Vector3 } from "three";
import { CatPoseRenderer } from "@/features/pet-home/cat-pose-renderer";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { poseScene } from "./cat-pose-fixture";
import { measureRenderedContactDomain } from "./cat-pose-rendered-contact-domain";

const cues = needVisualCues({ hunger: 100, fun: 100, energy: 100, hygiene: 100 });
function setup() {
  const scene = poseScene(100);
  const renderer = new CatPoseRenderer(scene.skeleton, scene.joints, scene.boxes,
    { cues, reducedMotion: false, reactPulse: 0 }, 13);
  let previousMask = 0;
  const previousFeet = Array.from({ length: 4 }, () => new Vector3());
  function render(seconds = 1 / 60) {
    const frame = renderer.render(seconds);
    scene.root.updateMatrixWorld(true);
    const contacts = renderer.bind.contacts.diagnostics;
    expect(contacts.unreachableFeet).toBe(0);
    if (contacts.maxFootDrift !== null) expect(contacts.maxFootDrift).toBeLessThanOrEqual(.001);
    for (const node of scene.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
    for (const link of measureRenderedContactDomain(scene).contacts.filter(link => link.kind === "structural")) {
      expect(link.distance, `${frame.tick}: ${link.parent}/${link.child}`).toBeLessThanOrEqual(.001);
    }
    for (const [id, node] of scene.boxes) if (node.visible) {
      expect(scene.aabb(id).min.y, `${frame.tick}: ${id} floor`).toBeGreaterThanOrEqual(-.291);
    }
    const mask = contacts.requestedMask!;
    for (const [i, id] of ["wristFL", "wristFR", "ankleBL", "ankleBR"].entries()) {
      const position = scene.joints.get("joint-" + id)!.getWorldPosition(new Vector3());
      if (mask & previousMask & (1 << i)) expect(position.distanceTo(previousFeet[i])).toBeLessThanOrEqual(.001);
      previousFeet[i].copy(position);
    }
    previousMask = mask;
    const plan = renderer.bind.plan.resolve(frame);
    expect(plan.body !== null || mask !== 0, "grounded continuation must declare real support").toBe(true);
    if (plan.body) {
      const ids = plan.body === "belly" ? ["body"] : ["body", "hipL", "hipR"];
      expect(Math.abs(Math.min(...ids.map(id => scene.aabb(id).min.y)) + .29)).toBeLessThanOrEqual(.001);
    }
    return structuredClone(frame);
  }
  return { scene, renderer, render };
}

it("S7/S4 grounded interrupted S→F preserves declared body support and newest sleep route", () => {
  const { renderer: r, render } = setup();
  r.simulation.enqueue({ tick: 1, kind: "pose", pose: "sphinx" });
  for (let i = 0; i < 24; i++) render();
  r.simulation.enqueue({ tick: 25, kind: "pose", pose: "standing" });
  r.simulation.enqueue({ tick: 26, kind: "care", action: "sleep", sequence: 2 });
  // Keep the exact public witness: twenty fixed callbacks after these inputs.
  for (let i = 0; i < 20; i++) {
    const frame = render();
    expect(r.simulation.tick).toBe(25 + i);
    expect(frame.sleeping).toBe(false);
    expect(frame.plateVisible).toBe(false);
    // The newest intent keeps the shared S→F leg, rather than bridging to a
    // fictitious stable F or following the superseded standing route.
    expect(frame.transitionFrom).toBe("seated");
    expect(frame.transitionTo).toBe("sphinx");
    expect(frame.transitionProgress).toBeCloseTo((23 + i) / 54, 12);
  }
  const edges = new Set<string>();
  let sleeping = false;
  for (let i = 0; i < 240; i++) {
    const frame = render(i % 2 ? 1 / 120 : 1 / 40);
    if (frame.transitionTo) edges.add(`${frame.transitionFrom}:${frame.transitionTo}`);
    if (frame.sleeping) {
      sleeping = true;
      // Gesture feedback is current-tick state; geometry can still sample the
      // finishing side→curled edge. Seed 13's authoritative target is curled.
      const current = r.simulation.sample(1);
      expect(current.pose).toBe("curled"); expect(current.transitionTo).toBe(null);
      expect(current.sleeping).toBe(true);
      if (frame.transitionTo !== null) {
        expect(frame.pose).toBe("side"); expect(frame.transitionFrom).toBe("side");
        expect(frame.transitionTo).toBe("curled");
        expect(frame.transitionProgress).toBeGreaterThanOrEqual(56 / 57);
      } else expect(frame.pose).toBe("curled");
    }
    expect(frame.plateVisible).toBe(false);
  }
  expect([...edges]).toEqual(["seated:sphinx", "sphinx:side", "side:curled"]);
  expect(sleeping).toBe(true);
  // Consumed sleep cannot be replayed/replaced by an older care sequence.
  r.simulation.enqueue({ tick: r.simulation.tick + 1, kind: "care", action: "feed", sequence: 1 });
  for (let i = 0; i < 24; i++) {
    const frame = render();
    expect(frame.pose).toBe("curled"); expect(frame.sleeping).toBe(true); expect(frame.plateVisible).toBe(false);
  }
});

it("preserves uninterrupted S→F and still rejects an above-floor declared belly", () => {
  const { renderer: r, render, scene } = setup();
  r.simulation.enqueue({ tick: 1, kind: "pose", pose: "sphinx" });
  for (let i = 0; i < 80; i++) render();
  const frame = structuredClone(r.simulation.sample(1));
  expect(frame.pose).toBe("sphinx"); expect(frame.transitionTo).toBe(null); expect(frame.sleeping).toBe(false);
  const goals = r.bind.contacts.copyGoalsInto(new Float64Array(12));
  const revision = r.bind.contacts.goalRevision, diagnostics = { ...r.bind.contacts.diagnostics };
  frame.rootOffset[1] += .01;
  expect(() => r.bind.apply(frame)).toThrowError("Declared belly support is not on the floor:");
  expect(r.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
  expect(r.bind.contacts.goalRevision).toBe(revision);
  expect(r.bind.contacts.diagnostics).toEqual(diagnostics);
  // A valid public sample must remain applicable after the rejected geometry.
  render();
  expect(scene.aabb("body").min.y).toBeCloseTo(-.29, 12);
  // Preserve the existing immediate cut even when the new goal shares an
  // unfinished leg; the shared-leg optimization is for normal motion only.
  r.simulation.enqueue({ tick: r.simulation.tick + 1, kind: "pose", pose: "side" });
  render();
  const tick = r.simulation.tick + 1;
  r.simulation.enqueue({ tick, kind: "care", action: "sleep", sequence: 2 });
  r.simulation.enqueue({ tick, kind: "reducedMotion", value: true });
  const cut = render();
  expect(cut.pose).toBe("curled"); expect(cut.transitionTo).toBe(null);
  expect(cut.sleeping).toBe(true); expect(cut.bodyBreath).toBe(1); expect(cut.bounce).toBe(0);
  for (const alpha of [0, .25, .5, .75, 1]) expect(r.simulation.sample(alpha)).toEqual(cut);
});
