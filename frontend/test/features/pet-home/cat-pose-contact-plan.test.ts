import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";
import { CAT_POSES, compileCatPose } from "@/features/pet-home/cat-pose-data";
import { poseScene } from "./cat-pose-fixture";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";

const profiles = [
  { name: "default-hunger0", hunger: 0, design: defaultCatDesign() },
  { name: "default-hunger100", hunger: 100, design: defaultCatDesign() },
  { name: "compact-hunger0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep-hunger100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];

const feet = ["pawFL", "pawFR", "pawBL", "pawBR"] as const;
const breaths = [
  { name: "original-awake", at: (time: number) => 1 + Math.sin(time / 60 * Math.PI * 2 * .4) * .01 },
  { name: "opposite-awake", at: (time: number) => 1 - Math.sin(time / 60 * Math.PI * 2 * .4) * .01 },
  { name: "sleep-rate-offset", at: (time: number) => 1 + Math.sin(time / 60 * Math.PI * 2 * .3 + 1.7) * .006 },
];

function breathInputs(from: string, to: string) {
  const transfer = (from === "seated" && (to === "loaf" || to === "sphinx")) || ((from === "loaf" || from === "sphinx") && to === "seated") || (from === "standing" && to === "sphinx");
  return transfer ? breaths : [breaths[0]];
}

describe("public rigid adapter physical phase gate (S1/S4/S5/S6/S10/S12)", () => {
  for (const edge of CAT_POSE_EDGES) for (const profile of profiles) for (const breath of breathInputs(edge.from, edge.to)) {
    it(`${edge.from}->${edge.to} ${profile.name}/${breath.name}: every fixed tick and quarter interpolation`, () => {
      const hunger = profile.hunger;
      const rig = poseScene(hunger, profile.design), prepared = rig.prepareEdge(edge.from, edge.to);
      const goals = feet.map(id => rig.boxes.get(id)!.getWorldPosition(new Vector3()));
      let previousMask = 0;
      for (let tick = 0; tick <= edge.durationTicks; tick++) for (const alpha of [0, .25, .5, .75]) {
        const frame = prepared.sample(tick, alpha);
        frame.bodyBreath = breath.at(tick + alpha);
        const context = `${edge.from}->${edge.to}/${hunger}/${tick}+${alpha}`;
        expect(() => rig.bind.apply(frame), context).not.toThrow();
        rig.root.updateMatrixWorld(true);
        const diagnostics = rig.bind.contacts.diagnostics;
        expect(diagnostics.requestedMask, context).not.toBeNull();
        expect(diagnostics.unreachableFeet, context).toBe(0);
        const mask = diagnostics.requestedMask!;
        if (mask !== 0) expect(diagnostics.maxFootDrift, context).toBeLessThanOrEqual(.001);
        else {
          const bodyFloor = Math.min(...["body", "hipL", "hipR"].flatMap(id => rig.corners(id).map(corner => corner.y)));
          expect(bodyFloor, `${context}/body support must actually meet floor`).toBeCloseTo(-.29, 3);
        }
        for (let i = 0; i < feet.length; i++) if (mask & (1 << i)) {
          const paw = rig.boxes.get(feet[i])!, current = paw.getWorldPosition(new Vector3());
          if (!(previousMask & (1 << i))) goals[i].copy(current); // observable landing boundary only
          expect(current.distanceTo(goals[i]), `${context}/${feet[i]} planted goal`).toBeLessThanOrEqual(.001);
          expect(new Vector3(0, 1, 0).transformDirection(paw.matrixWorld).y).toBeCloseTo(1, 10);
          for (const corner of rig.corners(feet[i])) expect(corner.y, `${context}/${feet[i]} finite corner`).toBeGreaterThanOrEqual(-.291);
        }
        previousMask = mask;
        for (const [id, box] of rig.boxes) if (box.visible) {
          for (const corner of rig.corners(id)) expect(corner.y, `${context}/${id} floor`).toBeGreaterThanOrEqual(-.291);
        }
        // Exact oriented seam test: the wrist/ankle hinge must lie in BOTH boxes.
        for (const [joint, proximal, distal] of [["wristFL", "forearmFL", "pawFL"], ["wristFR", "forearmFR", "pawFR"], ["ankleBL", "shinBL", "pawBL"], ["ankleBR", "shinBR", "pawBR"]]) {
          if (!rig.boxes.get(proximal)!.visible) continue;
          const hinge = rig.joints.get("joint-" + joint)!.getWorldPosition(new Vector3());
          for (const id of [proximal, distal]) {
            const obb = rig.obb(id); obb.halfSize.addScalar(.001);
            expect(obb.containsPoint(hinge), `${context}/${joint}/${id} cap`).toBe(true);
          }
        }
      }
    });
  }
});

describe("phase protocol", () => {
  it("resolves every arc/quarter-tick without an empty total-support declaration and reuses output", () => {
    const rig = poseScene(), output = rig.bind.plan.output;
    for (const edge of CAT_POSE_EDGES) {
      for (let tick = 0; tick <= edge.durationTicks * 4; tick++) {
        rig.frame.transitionFrom = edge.from; rig.frame.transitionTo = edge.to;
        rig.frame.transitionProgress = tick / (edge.durationTicks * 4);
        const selected = rig.bind.plan.resolve(rig.frame);
        expect(selected).toBe(output); expect(selected.feet).toBeGreaterThanOrEqual(0);
        if (selected.feet === 0) expect(selected.body).not.toBeNull();
      }
    }
  });
  it("rejects planted-goal movement atomically and permits it only after explicit release", () => {
    const rig = poseScene(), contacts = rig.bind.contacts, goals = contacts.copyGoalsInto(new Float64Array(12));
    contacts.applyPlan(15, goals);
    const revision = contacts.goalRevision, before = { ...contacts.diagnostics };
    const invalid = new Float64Array(goals); invalid[2] += .01;
    expect(() => contacts.applyPlan(15, invalid)).toThrow("before an explicit release");
    expect(contacts.goalRevision).toBe(revision); expect(contacts.diagnostics).toEqual(before);
    expect(contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
    invalid[11] = NaN;
    expect(() => contacts.applyPlan(15, invalid)).toThrow("finite");
    expect(contacts.goalRevision).toBe(revision); expect(contacts.diagnostics).toEqual(before);
    expect(contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
    invalid[11] = goals[11];
    contacts.applyPlan(12, goals); contacts.applyPlan(15, invalid);
    expect(contacts.goalRevision).toBe(revision + 1);
    expect(contacts.copyGoalsInto(new Float64Array(12))).toEqual(invalid);
    expect(contacts.diagnostics.unreachableFeet).toBe(0);
    expect(contacts.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001);
  });
  it("rejects invalid route/progress without changing the borrowed plan output or stored goals", () => {
    const rig = poseScene(), before = { ...rig.bind.plan.output }, goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12));
    rig.frame.transitionFrom = "sphinx"; rig.frame.transitionTo = "standing";
    expect(() => rig.bind.apply(rig.frame)).toThrow("authored directed edge");
    rig.frame.transitionFrom = "seated"; rig.frame.transitionProgress = NaN;
    expect(() => rig.bind.apply(rig.frame)).toThrow("finite and within");
    expect(rig.bind.plan.output).toEqual(before);
    expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
    expect(rig.bind.contacts.goalRevision).toBe(0);
    expect(rig.bind.contacts.diagnostics).toEqual({ requestedMask: null, unreachableFeet: null, maxFootDrift: null });
  });
  it("does not commit a pretend belly support whose actual finite box corners miss the floor", () => {
    const rig = poseScene(), goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12));
    rig.load(compileCatPose(CAT_POSES.sphinx));
    expect(() => rig.bind.apply(rig.frame)).toThrow("Declared belly support is not on the floor");
    expect(rig.bind.contacts.goalRevision).toBe(0);
    expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
    expect(rig.bind.contacts.diagnostics).toEqual({ requestedMask: null, unreachableFeet: null, maxFootDrift: null });
  });
});
