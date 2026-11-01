import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
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
const rear = ["hipBL", "kneeBL", "ankleBL", "hipBR", "kneeBR", "ankleBR"];
const directions = [["seated", "sphinx"], ["sphinx", "seated"]] as const;

describe("prepared S↔F finite physical sweeps", () => {
  for (const [from, to] of directions) for (const profile of profiles) for (const breath of breaths) {
    it(`${from}->${to}/${profile.name}/${breath.name}: all ticks, finite XYZ and alpha1/exact endpoints`, async () => {
      const rig = poseScene(profile.hunger, profile.design);
      const start = rig.prepareStable(from).sample().base.slice(), terminal = rig.prepareStable(to).sample().base.slice();
      const prepared = rig.prepareEdge(from, to), duration = CAT_POSE_EDGES.find(edge => edge.from === from && edge.to === to)!.durationTicks;
      const goals = feet.map(id => rig.boxes.get(id)!.getWorldPosition(new Vector3()));
      let priorMask = 0, revision = 0;
      for (let tick = 0; tick <= duration; tick++) for (const alpha of [0, .25, .5, .75, 1]) {
        const frame = prepared.sample(tick, alpha), time = Math.min(tick + alpha, duration);
        frame.bodyBreath = breath.at(time); const base = frame.base.slice();
        const context = `${from}->${to}/${profile.name}/${breath.name}/${tick}+${alpha}`;
        expect(() => rig.bind.apply(frame), context).not.toThrow(); rig.root.updateMatrixWorld(true);
        expect(frame.base, context).toEqual(base);
        if (time === 0) expect(frame.base, `${context}/start`).toEqual(start);
        if (time === duration) { expect(frame.base, `${context}/terminal`).toEqual(terminal); expect(frame.pose).toBe(to); }
        const mask = from === "seated" ? time < 34 ? 12 : time < duration ? 0 : 3 : time < 20 ? 0 : 15;
        expect(rig.bind.contacts.diagnostics.requestedMask, context).toBe(mask);
        expect(rig.bind.contacts.diagnostics.unreachableFeet, context).toBe(0);
        if (mask) expect(rig.bind.contacts.diagnostics.maxFootDrift, context).toBeLessThanOrEqual(.001);
        else expect(rig.bind.contacts.diagnostics.maxFootDrift, context).toBeNull();
        if (mask & ~priorMask) revision++;
        expect(rig.bind.contacts.goalRevision, `${context}/explicit landings`).toBe(revision);
        const belly = from === "seated" ? time >= 34 : time < 20;
        expect(rig.bind.plan.output.body, context).toBe(belly ? "belly" : null);
        if (belly) expect(Math.min(...rig.corners("body").map(p => p.y)), `${context}/genuine belly`).toBeCloseTo(-.29, 3);
        for (let leg = 0; leg < 4; leg++) if (mask & (1 << leg)) {
          const node = rig.boxes.get(feet[leg])!, position = node.getWorldPosition(new Vector3());
          if (!(priorMask & (1 << leg))) goals[leg].copy(position);
          expect(position.distanceTo(goals[leg]), `${context}/${feet[leg]} fixed`).toBeLessThanOrEqual(.001);
          expect(new Vector3(0, 1, 0).transformDirection(node.matrixWorld).y, context).toBeCloseTo(1, 10);
        }
        for (const [id, box] of rig.boxes) if (box.visible) for (const p of rig.corners(id)) {
          expect(p.toArray().every(Number.isFinite), `${context}/${id}/finite XYZ`).toBe(true);
          expect(p.y, `${context}/${id}/floor`).toBeGreaterThanOrEqual(-.291);
        }
        for (const [joint, proximal, distal] of [
          ["wristFL", "forearmFL", "pawFL"], ["wristFR", "forearmFR", "pawFR"],
          ["ankleBL", "shinBL", "pawBL"], ["ankleBR", "shinBR", "pawBR"],
        ]) if (rig.boxes.get(proximal)!.visible) {
          const hinge = rig.joints.get("joint-" + joint)!.getWorldPosition(new Vector3());
          for (const id of [proximal, distal]) { const obb = rig.obb(id); obb.halfSize.addScalar(.001); expect(obb.containsPoint(hinge), `${context}/${joint}/${id}/oriented cap`).toBe(true); }
        }
        for (const node of rig.joints.values()) expect(node.scale.toArray(), context).toEqual([1, 1, 1]);
        priorMask = mask;
        // Yield only the test host's event loop; simulation time remains fixed.
        if (alpha === 1) await new Promise<void>(resolve => setImmediate(resolve));
      }
    }, 30_000); // Assertion/setup wall time, not simulated motion or the device CPU gate.
  }
});

type Rig = ReturnType<typeof poseScene>;
function handoffs(profile: typeof profiles[number]) {
  const rigs = Array.from({ length: 5 }, () => poseScene(profile.hunger, profile.design));
  return (breath: number) => {
    let maxWorld = 0, maxRotation = 0;
    for (const [caseIndex, [from, to, boundary, beforeMask, afterMask, ids]] of ([
      ["seated", "sphinx", 0, 15, 12, front], ["seated", "sphinx", 34, 12, 0, rear],
      ["seated", "sphinx", 54, 0, 3, front], ["sphinx", "seated", 0, 3, 0, front],
      ["sphinx", "seated", 20, 0, 15, [...front, ...rear]],
    ] as const).entries()) {
      const rig: Rig = rigs[caseIndex];
      const stable = boundary === 0 ? rig.prepareStable(from) : undefined;
      const prepared = rig.prepareEdge(from, to);
      const before = stable ? stable.sample() : prepared.sample(boundary - 1, 1 - 1e-9);
      before.bodyBreath = breath; rig.bind.apply(before); rig.root.updateMatrixWorld(true);
      expect(rig.bind.contacts.diagnostics.requestedMask).toBe(beforeMask);
      expect(rig.bind.contacts.diagnostics.unreachableFeet).toBe(0);
      const positions = ids.map(id => rig.joints.get("joint-" + id)!.getWorldPosition(new Vector3()));
      const rotations = ids.map(id => rig.joints.get("joint-" + id)!.quaternion.clone());
      const oldGoals = rig.bind.contacts.copyGoalsInto(new Float64Array(12)), revision = rig.bind.contacts.goalRevision;
      const frame = prepared.sample(boundary, 0), base = frame.base.slice(); frame.bodyBreath = breath;
      rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
      expect(frame.base).toEqual(base);
      expect(rig.bind.contacts.diagnostics.requestedMask).toBe(afterMask);
      expect(rig.bind.contacts.diagnostics.unreachableFeet).toBe(0);
      if (afterMask) expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001);
      else expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeNull();
      const delta = caseIndex === 0 ? revision === 0 ? 1 : 0 : caseIndex === 2 || caseIndex === 4 ? 1 : 0;
      expect(rig.bind.contacts.goalRevision).toBe(revision + delta);
      if (!afterMask || caseIndex === 0) expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(oldGoals);
      for (const [i, id] of ids.entries()) {
        const node = rig.joints.get("joint-" + id)!, distance = node.getWorldPosition(new Vector3()).distanceTo(positions[i]);
        const angle = node.quaternion.angleTo(rotations[i]), context = `${profile.name}/${from}->${to}/${boundary}/${breath}/${id}`;
        expect(distance, `${context}/world gap`).toBeLessThanOrEqual(.001);
        expect(angle, `${context}/supported/FK rotations`).toBeLessThanOrEqual(.000001);
        maxWorld = Math.max(maxWorld, distance); maxRotation = Math.max(maxRotation, angle);
      }
    }
    return { maxWorld, maxRotation };
  };
}

describe("prepared S↔F supported/FK handoffs", () => {
  for (const profile of profiles) {
    for (const breath of [.99, .996375, 1, 1.004125, 1.01]) it(`${profile.name}/${breath}: both sides of actual handoffs`, async () => {
      handoffs(profile)(breath);
      await new Promise<void>(resolve => setImmediate(resolve));
    }, 30_000);
    it(`${profile.name}: all eighty live-breath interpolation midpoints`, async () => {
      const check = handoffs(profile); let maxWorld = 0, maxRotation = 0;
      for (let interval = 0; interval < 80; interval++) {
        const result = check(1 + (interval - 39.5) / 4000);
        maxWorld = Math.max(maxWorld, result.maxWorld); maxRotation = Math.max(maxRotation, result.maxRotation);
        await new Promise<void>(resolve => setImmediate(resolve));
      }
      console.info("sphinx-handoff-bound", JSON.stringify({ profile: profile.name, maxWorld, maxRotation }));
    }, 30_000);
  }
});
