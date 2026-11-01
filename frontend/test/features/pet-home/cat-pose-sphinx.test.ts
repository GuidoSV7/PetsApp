import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import type { CatPoseFrame } from "@/features/pet-home/cat-pose-simulation";
import { CAT_POSE_LIBRARY } from "@/features/pet-home/cat-pose-tracks";
import { poseScene } from "./cat-pose-fixture";

const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
type Rig = ReturnType<typeof poseScene>;
function rest(rig: Rig) {
  return {
    ground: Math.min(...rig.corners("pawFL").map(p => p.y)),
    chestY: rig.boxes.get("chest")!.getWorldPosition(new Vector3()).y,
    frontZ: ["pawFL", "pawFR"].map(id => rig.root.worldToLocal(rig.boxes.get(id)!.getWorldPosition(new Vector3())).z),
  };
}
function check(rig: Rig, frame: CatPoseFrame, neutral: ReturnType<typeof rest>, scale = 1) {
  const base = frame.base.slice(), rotations = frame.rotations.slice();
  expect(frame.pose).toBe("sphinx"); expect(frame.transitionTo).toBeNull();
  expect(frame.supportMask).toBe(3); expect(frame.visibleMask & 63).toBe(3);
  expect(() => rig.bind.apply(frame)).not.toThrow(); rig.root.updateMatrixWorld(true);
  expect(frame.base).toEqual(base); expect(frame.rotations).toEqual(rotations);
  expect(rig.bind.contacts.diagnostics.requestedMask).toBe(3);
  expect(rig.bind.contacts.diagnostics.unreachableFeet).toBe(0);
  expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001);
  expect(Math.min(...rig.corners("body").map(p => p.y)), "actual belly floor").toBeCloseTo(neutral.ground, 3);
  expect(rig.boxes.get("chest")!.getWorldPosition(new Vector3()).y, "chest lowered, not upright provisional torso")
    .toBeLessThan(neutral.chestY - .20 * scale);
  const bodyFront = Math.max(...["body", "chest"].flatMap(id => rig.corners(id).map(p => rig.root.worldToLocal(p).z)));
  for (const [i, id] of ["pawFL", "pawFR"].entries()) {
    const paw = rig.boxes.get(id)!, point = paw.getWorldPosition(new Vector3());
    expect(rig.root.worldToLocal(point.clone()).z, `${id} positive authored forward displacement`).toBeGreaterThan(neutral.frontZ[i]);
    const toe = Math.max(...rig.corners(id).map(p => rig.root.worldToLocal(p).z));
    expect(toe, `${id} toes ahead of body/chest front`).toBeGreaterThan(bodyFront);
    expect(new Vector3(0, 1, 0).transformDirection(paw.matrixWorld).y).toBeCloseTo(1, 10);
  }
  for (const [id, box] of rig.boxes) if (box.visible) {
    for (const corner of rig.corners(id)) {
      expect([corner.x, corner.y, corner.z].every(Number.isFinite), `${id} finite XYZ`).toBe(true);
    }
    for (const corner of rig.corners(id)) expect(corner.y, `${id} finite floor`).toBeGreaterThanOrEqual(neutral.ground - .001);
  }
  for (const side of ["L", "R"]) for (const [joint, proximal, distal] of [
    ["shoulderF" + side, "body", "legF" + side],
    ["elbowF" + side, "legF" + side, "forearmF" + side],
    ["wristF" + side, "forearmF" + side, "pawF" + side],
  ]) {
    const hinge = rig.joints.get("joint-" + joint)!.getWorldPosition(new Vector3());
    for (const id of [proximal, distal]) {
      const obb = rig.obb(id); obb.halfSize.addScalar(.001);
      expect(obb.containsPoint(hinge), `${joint}/${id} oriented cap`).toBe(true);
    }
  }
  for (const node of rig.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
  for (const id of ["shinBL", "shinBR", "jaw", "tongue"]) expect(rig.boxes.get(id)!.visible).toBe(false);
}

describe("prepared stable sphinx physical calibration", () => {
  for (const profile of profiles) {
    for (const breath of [.99, 1, 1.01]) it(`${profile.name}/breath${breath}: genuine support and forward flat paws`, () => {
      const rig = poseScene(profile.hunger, profile.design), neutral = rest(rig);
      const simulation = rig.prepareStable("sphinx"), frame = simulation.sample(); frame.bodyBreath = breath;
      check(rig, frame, neutral);
      if (breath === 1) console.info("sphinx-forward-authoring", JSON.stringify({
        profile: profile.name, neutralCentersZ: neutral.frontZ,
        centersZ: ["pawFL", "pawFR"].map(id => rig.root.worldToLocal(rig.boxes.get(id)!.getWorldPosition(new Vector3())).z),
        toesZ: ["pawFL", "pawFR"].map(id => Math.max(...rig.corners(id).map(p => rig.root.worldToLocal(p).z))),
        bodyFrontZ: Math.max(...["body", "chest"].flatMap(id => rig.corners(id).map(p => rig.root.worldToLocal(p).z))),
      }));
    });
    it(`${profile.name}: normal-motion stable ticks and interpolation keep immutable contacts`, () => {
      const rig = poseScene(profile.hunger, profile.design), neutral = rest(rig);
      const simulation = rig.prepareStable("sphinx");
      check(rig, simulation.sample(), neutral);
      const goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12)), revision = rig.bind.contacts.goalRevision;
      for (let tick = 0; tick < 120; tick++) {
        simulation.step();
        for (const alpha of [0, .25, .5, .75, 1]) {
          check(rig, simulation.sample(alpha), neutral);
          expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
          expect(rig.bind.contacts.goalRevision).toBe(revision);
        }
      }
    });
    for (const lazyWorldUpdate of [false, true]) it(`${profile.name}: ${lazyWorldUpdate ? "cold" : "updated"} immutable nonidentity rest parent preserves model/world goals`, () => {
      const rig = poseScene(profile.hunger, profile.design, { position: [1.3, .4, -.7], yaw: .63, scale: 1.3, lazyWorldUpdate });
      const neutral = rest(rig), simulation = rig.prepareStable("sphinx");
      let goals: Float64Array | undefined;
      for (const breath of [.99, 1, 1.01]) {
        const frame = simulation.sample(); frame.bodyBreath = breath;
        check(rig, frame, neutral, 1.3);
        const current = rig.bind.contacts.copyGoalsInto(new Float64Array(12));
        if (goals) expect(current).toEqual(goals); else goals = current;
      }
    });
  }
});

describe("sphinx preparation validation", () => {
  it("rejects nonfinite/wrong-length setup without changing prior library behavior, contacts or counters", () => {
    const rig = poseScene(), prepared = rig.prepareEdge("seated", "loaf"), frame = prepared.sample(35, .5);
    frame.bodyBreath = .99; rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
    const before = [...rig.joints.values()].map(node => node.matrixWorld.elements.slice());
    const goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12)), revision = rig.bind.contacts.goalRevision;
    const diagnostics = { ...rig.bind.contacts.diagnostics }, plan = { ...rig.bind.plan.output };
    for (const invalid of [new Float64Array(11), Float64Array.from([...goals.slice(0, 11), NaN]),
      Float64Array.from([...goals.slice(0, 11), Infinity]), Float64Array.from([...goals.slice(0, 11), -Infinity])]) {
      expect(() => rig.bind.configureLibrary(CAT_POSE_LIBRARY, invalid)).toThrow("Sphinx goals require 12 finite model coordinates.");
      expect(rig.bind.contacts.goalRevision).toBe(revision); expect(rig.bind.contacts.diagnostics).toEqual(diagnostics);
      expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals); expect(rig.bind.plan.output).toEqual(plan);
      rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
      expect([...rig.joints.values()].map(node => node.matrixWorld.elements)).toEqual(before);
    }
  });
  it("copies static authoring goals, permits identical preparation, and rejects later replacement atomically", () => {
    const rig = poseScene(), goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12));
    goals[2] += .05; goals[5] += .05;
    const authored = goals.slice(), diagnostics = { ...rig.bind.contacts.diagnostics };
    rig.bind.configureLibrary(CAT_POSE_LIBRARY, goals); goals[2] += 100;
    rig.frame.pose = "sphinx"; rig.frame.supportMask = 3;
    expect(rig.bind.plan.resolve(rig.frame).goals).toEqual(authored);
    expect(() => rig.bind.configureLibrary(CAT_POSE_LIBRARY, authored)).not.toThrow();
    const changed = authored.slice(); changed[2] += .001;
    expect(() => rig.bind.configureLibrary(CAT_POSE_LIBRARY, changed)).toThrow("Sphinx rest goals are immutable after preparation.");
    expect(rig.bind.plan.resolve(rig.frame).goals).toEqual(authored);
    expect(rig.bind.contacts.goalRevision).toBe(0); expect(rig.bind.contacts.diagnostics).toEqual(diagnostics);
  });
});
