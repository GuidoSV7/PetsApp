import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { CAT_POSE_LIBRARY } from "@/features/pet-home/cat-pose-tracks";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";
import { poseScene } from "./cat-pose-fixture";

const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
const breaths = [
  { name: "awake", at: (t: number) => 1 + Math.sin(t / 60 * Math.PI * 2 * .4) * .01 },
  { name: "opposite", at: (t: number) => 1 - Math.sin(t / 60 * Math.PI * 2 * .4) * .01 },
  { name: "sleep-offset", at: (t: number) => 1 + Math.sin(t / 60 * Math.PI * 2 * .3 + 1.7) * .006 },
];
const feet = ["pawFL", "pawFR", "pawBL", "pawBR"];
const front = ["shoulderFL", "elbowFL", "wristFL", "shoulderFR", "elbowFR", "wristFR"];
const all = [...front, "hipBL", "kneeBL", "ankleBL", "hipBR", "kneeBR", "ankleBR"];
const yieldHost = () => new Promise<void>(resolve => setImmediate(resolve));

describe("prepared direct Q→F finite physical sweep", () => {
  for (const profile of profiles) for (const breath of breaths) it(`${profile.name}/${breath.name}: true Q start, all ticks and alpha1 endpoints`, async () => {
    const rig = poseScene(profile.hunger, profile.design), neutralZ = rig.boxes.get("pawFL")!.getWorldPosition(new Vector3()).z;
    const terminal = rig.prepareStable("sphinx").sample().base.slice(), prepared = rig.prepareEdge("standing", "sphinx");
    const duration = CAT_POSE_EDGES.find(edge => edge.from === "standing" && edge.to === "sphinx")!.durationTicks;
    const goals = feet.map(id => rig.boxes.get(id)!.getWorldPosition(new Vector3()));
    let priorMask = 0, revision = 0, rootY = -.10;
    for (let tick = 0; tick <= duration; tick++) for (const alpha of [0, .25, .5, .75, 1]) {
      const frame = prepared.sample(tick, alpha), time = Math.min(tick + alpha, duration), context = `${profile.name}/${breath.name}/${tick}+${alpha}`;
      frame.bodyBreath = breath.at(time); const base = frame.base.slice();
      expect(frame.pose, context).not.toBe("seated"); expect(frame.pose, context).not.toBe("loaf");
      expect(frame.rootOffset[1], context).toBeLessThanOrEqual(rootY + 1e-12);
      expect(frame.rootOffset[1], context).toBeGreaterThanOrEqual(-.24 - 1e-12); rootY = frame.rootOffset[1];
      if (time === 0) { expect(frame.base).toEqual(CAT_POSE_LIBRARY.stable.standing.base); expect(frame.rootOffset[1]).toBe(-.10); }
      if (time === duration) { expect(frame.base).toEqual(terminal); expect(frame.pose).toBe("sphinx"); }
      expect(() => rig.bind.apply(frame), context).not.toThrow(); rig.root.updateMatrixWorld(true); expect(frame.base).toEqual(base);
      const mask = time < 20 ? 15 : time < duration ? 0 : 3;
      expect(rig.bind.contacts.diagnostics.requestedMask, context).toBe(mask);
      expect(rig.bind.contacts.diagnostics.unreachableFeet, context).toBe(0);
      if (mask) expect(rig.bind.contacts.diagnostics.maxFootDrift, context).toBeLessThanOrEqual(.001);
      else expect(rig.bind.contacts.diagnostics.maxFootDrift, context).toBeNull();
      if (mask & ~priorMask) revision++;
      expect(rig.bind.contacts.goalRevision, context).toBe(revision);
      expect(rig.bind.plan.output.body, context).toBe(time >= 20 ? "belly" : null);
      if (time >= 20) expect(Math.min(...rig.corners("body").map(p => p.y)), `${context}/genuine belly`).toBeCloseTo(-.29, 3);
      for (let leg = 0; leg < 4; leg++) if (mask & (1 << leg)) {
        const node = rig.boxes.get(feet[leg])!, point = node.getWorldPosition(new Vector3());
        if (!(priorMask & (1 << leg))) goals[leg].copy(point);
        expect(point.distanceTo(goals[leg]), `${context}/${feet[leg]}/fixed`).toBeLessThanOrEqual(.001);
        expect(new Vector3(0, 1, 0).transformDirection(node.matrixWorld).y).toBeCloseTo(1, 10);
      }
      for (const [id, node] of rig.boxes) if (node.visible) for (const p of rig.corners(id)) {
        expect(p.toArray().every(Number.isFinite), `${context}/${id}/finite XYZ`).toBe(true);
        expect(p.y, `${context}/${id}/floor`).toBeGreaterThanOrEqual(-.291);
      }
      for (const [joint, proximal, distal] of [["wristFL", "forearmFL", "pawFL"], ["wristFR", "forearmFR", "pawFR"], ["ankleBL", "shinBL", "pawBL"], ["ankleBR", "shinBR", "pawBR"]]) {
        if (!rig.boxes.get(proximal)!.visible) continue;
        const hinge = rig.joints.get("joint-" + joint)!.getWorldPosition(new Vector3());
        for (const id of [proximal, distal]) { const obb = rig.obb(id); obb.halfSize.addScalar(.001); expect(obb.containsPoint(hinge), `${context}/${joint}/${id}/oriented cap`).toBe(true); }
      }
      for (const node of rig.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
      if (time === duration) {
        const bodyFront = Math.max(...["body", "chest"].flatMap(id => rig.corners(id).map(p => p.z)));
        for (const id of ["pawFL", "pawFR"]) { expect(rig.boxes.get(id)!.getWorldPosition(new Vector3()).z).toBeGreaterThan(neutralZ); expect(Math.max(...rig.corners(id).map(p => p.z))).toBeGreaterThan(bodyFront); }
      }
      priorMask = mask; if (alpha === 1) await yieldHost();
    }
  }, 30_000);
});

function handoffs(profile: typeof profiles[number]) {
  const rigs = Array.from({ length: 3 }, () => poseScene(profile.hunger, profile.design));
  return (breath: number) => {
    let maxWorld = 0, maxRotation = 0;
    for (const [caseIndex, [boundary, beforeMask, afterMask, ids]] of ([[0, 15, 15, all], [20, 15, 0, all], [54, 0, 3, front]] as const).entries()) {
      const rig = rigs[caseIndex], stable = boundary === 0 ? rig.prepareStable("standing") : undefined;
      const prepared = rig.prepareEdge("standing", "sphinx");
      const before = stable ? stable.sample() : prepared.sample(boundary - 1, 1 - 1e-9);
      before.bodyBreath = breath; rig.bind.apply(before); rig.root.updateMatrixWorld(true);
      expect(rig.bind.contacts.diagnostics.requestedMask).toBe(beforeMask); expect(rig.bind.contacts.diagnostics.unreachableFeet).toBe(0);
      const points = ids.map(id => rig.joints.get("joint-" + id)!.getWorldPosition(new Vector3()));
      const rotations = ids.map(id => rig.joints.get("joint-" + id)!.quaternion.clone());
      const goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12)), revision = rig.bind.contacts.goalRevision;
      const frame = prepared.sample(boundary, 0), base = frame.base.slice(); frame.bodyBreath = breath;
      rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
      expect(frame.base).toEqual(base); expect(rig.bind.contacts.diagnostics.requestedMask).toBe(afterMask);
      expect(rig.bind.contacts.diagnostics.unreachableFeet).toBe(0);
      if (afterMask) expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001); else expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeNull();
      expect(rig.bind.contacts.goalRevision).toBe(revision + (caseIndex === 2 ? 1 : 0));
      if (caseIndex !== 2) expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
      for (const [i, id] of ids.entries()) {
        const node = rig.joints.get("joint-" + id)!, distance = node.getWorldPosition(new Vector3()).distanceTo(points[i]);
        const angle = node.quaternion.angleTo(rotations[i]), context = `${profile.name}/${boundary}/${breath}/${id}`;
        expect(distance, `${context}/world`).toBeLessThanOrEqual(.001); expect(angle, `${context}/supported/FK rotation`).toBeLessThanOrEqual(.000001);
        maxWorld = Math.max(maxWorld, distance); maxRotation = Math.max(maxRotation, angle);
      }
    }
    return { maxWorld, maxRotation };
  };
}

describe("prepared direct Q→F actual supported/FK handoffs", () => {
  for (const profile of profiles) {
    for (const breath of [.99, .996375, 1, 1.004125, 1.01]) it(`${profile.name}/${breath}: Q seed/start, release and F landing`, async () => {
      handoffs(profile)(breath); await yieldHost();
    }, 30_000);
    it(`${profile.name}: all eighty breath interpolation midpoints`, async () => {
      const check = handoffs(profile); let maxWorld = 0, maxRotation = 0;
      for (let interval = 0; interval < 80; interval++) {
        const result = check(1 + (interval - 39.5) / 4000);
        maxWorld = Math.max(maxWorld, result.maxWorld); maxRotation = Math.max(maxRotation, result.maxRotation); await yieldHost();
      }
      console.info("quadruped-sphinx-handoff-bound", JSON.stringify({ profile: profile.name, maxWorld, maxRotation }));
    }, 30_000);
  }
});
