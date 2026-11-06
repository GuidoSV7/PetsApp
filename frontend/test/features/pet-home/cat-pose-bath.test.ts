import { Quaternion, Vector3 } from "three";
import { measureRenderedContactDomain } from "./cat-pose-rendered-contact-domain";
import { expect, it } from "vitest";
import { CatPoseRenderer } from "@/features/pet-home/cat-pose-renderer";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { CAT_POSES } from "@/features/pet-home/cat-pose-data";
import { poseScene } from "./cat-pose-fixture";

it("BATH real four-care path keeps every planted support reachable, not merely low drift", () => {
  const rig = poseScene(33), input = { cues: needVisualCues({ hunger: 33, fun: 100, energy: 100, hygiene: 100 }), reducedMotion: false, reactPulse: 0 };
  const renderer = new CatPoseRenderer(rig.skeleton, rig.joints, rig.boxes, input, 0);
  for (const [i, action] of (["feed", "play", "bathe"] as const).entries()) {
    renderer.synchronize({ ...input, careEvent: { action, sequence: i + 1 }, reactPulse: action === "play" ? 1 : 0 });
    for (let tick = 0; tick < 660; tick++) {
      const frame = renderer.render(1 / 60);
      if (action !== "bathe") continue;
      expect(renderer.diagnostics.unreachableFeet, `bath h33 tick${frame.tick}/breath${frame.bodyBreath}/drift${renderer.diagnostics.maxFootDrift}`).toBe(0);
      expect(renderer.diagnostics.plantedFeet).toBe(4);
      expect(renderer.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001);
    }
  }
}, 30_000);


it("BATH concurrent sphinx authoring preview keeps the authored support hull", () => {
  const rig = poseScene(33), input = { cues: needVisualCues({ hunger: 33, fun: 100, energy: 100, hygiene: 100 }), reducedMotion: false, reactPulse: 0,
    careEvent: { action: "bathe" as const, sequence: 1 }, posePreview: { pose: "sphinx" as const, definition: CAT_POSES.sphinx,
      breathing: true, reducedMotion: false, showHidden: false, contacts: true, selectedJoint: null } };
  const renderer = new CatPoseRenderer(rig.skeleton, rig.joints, rig.boxes, input, 0);
  for (let tick = 0; tick < 220; tick++) {
    const frame = renderer.render(1 / 60);
    expect(frame.pose).toBe("sphinx");
    expect(renderer.diagnostics.unreachableFeet).toBe(0);
  }
}, 30_000);


function setupBath(hunger = 33, pose: "seated" | "standing" = "seated") {
  const rig = poseScene(hunger), input = { cues: needVisualCues({ hunger, fun: 100, energy: 100, hygiene: 100 }), reducedMotion: false, reactPulse: 0 };
  const renderer = new CatPoseRenderer(rig.skeleton, rig.joints, rig.boxes, input, 0);
  if (pose === "standing") {
    renderer.simulation.enqueue({ tick: 1, kind: "reducedMotion", value: true });
    renderer.simulation.enqueue({ tick: 1, kind: "pose", pose }); renderer.render(1 / 60);
    renderer.simulation.enqueue({ tick: 2, kind: "reducedMotion", value: false }); renderer.render(1 / 60);
  }
  const event = { ...input, careEvent: { action: "bathe" as const, sequence: 1 } };
  renderer.synchronize(event);
  return { rig, renderer, input, event };
}
it("BATH rendered rear bridge stays connected across the hidden shin at the retained h33 witness", () => {
  const { rig, renderer } = setupBath();
  for (let tick = 0; tick < 90; tick++) renderer.render(1 / 60);
  const frame = renderer.simulation.sample(1); frame.bodyBreath = .99;
  renderer.bind.apply(frame); rig.root.updateMatrixWorld(true);
  const bridge = measureRenderedContactDomain(rig).contacts.find(link => link.parent === "hipL" && link.child === "pawBL")!;
  expect(bridge.via).toEqual(["shinBL"]);
  expect(bridge.distance).toBeLessThanOrEqual(.001);
  expect(renderer.diagnostics.unreachableFeet).toBe(0);
  expect(renderer.diagnostics.plantedFeet).toBe(4);
  expect(renderer.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001);
  expect(renderer.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(setupBath().renderer.bind.contacts.copyGoalsInto(new Float64Array(12)));
  for (const [id, node] of rig.boxes) if (node.visible) for (const corner of rig.corners(id)) expect(corner.y).toBeGreaterThanOrEqual(-.291);
  for (const node of rig.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
});

const authoredRoll = (age: number) => age < 72 || age >= 99 ? 0
  : Math.sin((age - 72) / 60 * 12 * Math.PI) * .04 * Math.min(1, age / 9, (99 - age) / 9);

it.each(Array.from({ length: 101 }, (_, h) => h))("BATH h%d: exact full-breath/fractional physical domain", hunger => {
  for (const pose of ["seated", "standing"] as const) {
    const { rig, renderer } = setupBath(hunger, pose);
    const goals = renderer.bind.contacts.copyGoalsInto(new Float64Array(12));
    const base = renderer.simulation.sample(1).base.slice();
    let floor = Infinity, gap = 0, drift = 0, unreachable = 0, unitError = 0, angularError = 0;
    let goalsFixed = true, allPlanted = true, baseFixed = true, finite = true;
    let rootError = 0;
    let gapWitness: object | null = null;
    const q = new Quaternion(), expected = new Quaternion();
    for (let age = 0; age < 102; age++) {
      renderer.render(1 / 60);
      for (const alpha of [0, .25, .5, .75, 1]) for (const breath of [.99, 1, 1.01]) {
        const frame = renderer.simulation.sample(alpha); frame.bodyBreath = breath;
        renderer.bind.apply(frame); rig.root.updateMatrixWorld(true);
        const d = renderer.bind.contacts.diagnostics;
        unreachable = Math.max(unreachable, d.unreachableFeet ?? Infinity);
        drift = Math.max(drift, d.maxFootDrift ?? Infinity); allPlanted &&= d.requestedMask === 15;
        goalsFixed &&= renderer.bind.contacts.copyGoalsInto(new Float64Array(12)).every((v, i) => v === goals[i]);
        if (alpha === 1) baseFixed &&= frame.base.every((v, i) => v === base[i]);
        const roll = authoredRoll(age) * (1 - alpha) + authoredRoll(age + 1) * alpha;
        angularError = Math.max(angularError, Math.abs(frame.bathRoll - roll));
        // Original full .04 torso/.20 head shake remains, not reduced to get reach.
        for (const [joint, factor] of [[1, 1], [3, 5]]) {
          q.fromArray(frame.base, joint * 4).invert().multiply(expected.fromArray(frame.rotations, joint * 4));
          expected.set(0, 0, Math.sin(roll * factor / 2), Math.cos(roll * factor / 2));
          angularError = Math.max(angularError, q.angleTo(expected));
        }
        for (const [id, node] of rig.boxes) if (node.visible) for (const corner of rig.corners(id)) {
          finite &&= Number.isFinite(corner.y);
          floor = Math.min(floor, corner.y);
        }
        for (const link of measureRenderedContactDomain(rig).contacts) if (link.kind === "structural" && link.distance > gap) {
          gap = link.distance; gapWitness = { age, alpha, breath, parent: link.parent, child: link.child, via: link.via };
        }
        for (const node of rig.joints.values()) unitError = Math.max(unitError, ...node.scale.toArray().map(v => Math.abs(v - 1)));
        rootError = Math.max(rootError, Math.abs(frame.rootOffset[0]), Math.abs(frame.rootOffset[2]), Math.abs(frame.headingDeg));
      }
    }
    expect({ allPlanted, goalsFixed, baseFixed }, `h${hunger}/${pose}`).toEqual({ allPlanted: true, goalsFixed: true, baseFixed: true });
    expect(unreachable, `h${hunger}/${pose}/reachable independently of drift`).toBe(0);
    expect(drift).toBeLessThanOrEqual(.001); expect(floor, `h${hunger}/${pose}/floor`).toBeGreaterThanOrEqual(-.291);
    expect(gap, `h${hunger}/${pose}/rendered structural contact/${JSON.stringify(gapWitness)}`).toBeLessThanOrEqual(.001);
    expect(unitError).toBe(0); expect(rootError).toBe(0); expect(finite).toBe(true);
    // S19 visible-crossing acceptance requires real multi-camera footage.
    expect(angularError, "original shake amplitude/frequency").toBeLessThanOrEqual(1e-6);
  }
}, 30_000);

function snapshot(rig: ReturnType<typeof poseScene>) {
  rig.root.updateMatrixWorld(true);
  return [...rig.joints.values()].map(node => ({ p: node.getWorldPosition(new Vector3()), q: node.getWorldQuaternion(new Quaternion()) }));
}
function sameInstant(rig: ReturnType<typeof poseScene>, before: ReturnType<typeof snapshot>) {
  snapshot(rig).forEach((v, i) => { expect(v.p.distanceTo(before[i].p)).toBeLessThanOrEqual(.001); expect(v.q.angleTo(before[i].q)).toBeLessThanOrEqual(1e-6); });
}
it.each([71, 72, 73, 78, 90, 98, 99])("BATH boundary%d: same-instant care/pose cancellation keeps support and fades safely", at => {
  for (const kind of ["care", "pose"] as const) {
    const { rig, renderer, input } = setupBath();
    for (let i = 0; i < at; i++) renderer.render(1 / 60);
    renderer.bind.apply(renderer.simulation.sample(1)); const before = snapshot(rig);
    if (kind === "care") renderer.synchronize({ ...input, careEvent: { action: "feed", sequence: 2 } });
    else renderer.simulation.enqueue({ tick: renderer.simulation.tick + 1, kind: "pose", pose: "standing" });
    renderer.render(1 / 60); sameInstant(rig, before);
    for (let i = 0; i < 80; i++) {
      renderer.render(1 / 60); expect(renderer.diagnostics.unreachableFeet).toBe(0);
      expect(renderer.diagnostics.plantedFeet).toBe(4); expect(renderer.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001);
    }
  }
}, 30_000);

it("BATH reduced cuts suppress compensation/shake without hidden resume or sequence replay", () => {
  for (const at of [1, 71, 74, 78, 98]) {
    const { renderer, event } = setupBath();
    for (let i = 0; i < at; i++) renderer.render(1 / 60);
    renderer.synchronize({ ...event, reducedMotion: true });
    for (let i = 0; i < 10; i++) {
      const frame = renderer.render(1 / 60);
      expect(frame.bathRoll).toBe(0); expect(frame.bodyBreath).toBe(1); expect(frame.bounce).toBe(0);
      expect(renderer.diagnostics.unreachableFeet).toBe(0); expect(renderer.diagnostics.plantedFeet).toBe(4);
    }
    renderer.synchronize(event);
    for (let i = 0; i < 130; i++) expect(renderer.render(1 / 60).bathRoll).toBe(0);
    renderer.synchronize(event);
    for (let i = 0; i < 120; i++) expect(renderer.render(1 / 60).bathRoll).toBe(0);
  }
}, 30_000);
