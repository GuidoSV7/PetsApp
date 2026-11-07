import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { poseScene } from "./cat-pose-fixture";

const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
const poses = ["side", "curled", "bellyUp"] as const;
type Rig = ReturnType<typeof poseScene>;
function physical(rig: Rig, pose: typeof poses[number], ground: number, breath: number) {
  const simulation = rig.prepareStable(pose), frame = simulation.sample(); frame.bodyBreath = breath;
  const base = frame.base.slice(), rotations = frame.rotations.slice(), goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12));
  const revision = rig.bind.contacts.goalRevision;
  expect(frame.pose).toBe(pose); expect(frame.transitionTo).toBeNull(); expect(frame.supportMask).toBe(0); expect(frame.visibleMask).toBe(15);
  expect(() => rig.bind.apply(frame)).not.toThrow(); rig.root.updateMatrixWorld(true);
  expect(frame.base).toEqual(base); expect(frame.rotations).toEqual(rotations);
  expect(rig.bind.plan.output.body).toBe(pose === "bellyUp" ? "back" : "side");
  expect(rig.bind.contacts.diagnostics).toEqual({ requestedMask: 0, unreachableFeet: 0, maxFootDrift: null });
  expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals); expect(rig.bind.contacts.goalRevision).toBe(revision);
  expect(Math.min(...["body", "hipL", "hipR"].flatMap(id => rig.corners(id).map(p => p.y))), "actual declared support").toBeCloseTo(ground, 3);
  expect(Math.min(...rig.corners("body").map(p => p.y)), "body itself bears support").toBeCloseTo(ground, 3);
  for (const [id, node] of rig.boxes) if (node.visible) for (const point of rig.corners(id)) {
    expect(point.toArray().every(Number.isFinite), `${pose}/${id}/finite XYZ`).toBe(true);
    expect(point.y, `${pose}/${id}/floor`).toBeGreaterThanOrEqual(ground - .001);
  }
  for (const [joint, proximal, distal] of [["wristFL", "forearmFL", "pawFL"], ["wristFR", "forearmFR", "pawFR"], ["ankleBL", "shinBL", "pawBL"], ["ankleBR", "shinBR", "pawBR"]]) {
    const hinge = rig.joints.get("joint-" + joint)!.getWorldPosition(new Vector3());
    for (const id of [proximal, distal]) { const obb = rig.obb(id); obb.halfSize.addScalar(.001); expect(obb.containsPoint(hinge), `${joint}/${id}/oriented cap`).toBe(true); }
  }
  for (const node of rig.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
  expect(rig.boxes.get("jaw")!.visible).toBe(false); expect(rig.boxes.get("tongue")!.visible).toBe(false);
  return frame;
}

describe("prepared stable lying destinations", () => {
  for (const profile of profiles) {
    for (const pose of poses) {
      for (const breath of [.99, 1, 1.01]) it(`${pose}/${profile.name}/${breath}: actual body support and finite rigid geometry`, () => {
        const rig = poseScene(profile.hunger, profile.design), ground = Math.min(...rig.corners("pawFL").map(p => p.y));
        const frame = physical(rig, pose, ground, breath);
        if (breath === 1) console.info("lying-calibration", JSON.stringify({ pose, profile: profile.name, root: [...frame.rootOffset], support: ["body", "hipL", "hipR"].map(id => ({ id, floor: Math.min(...rig.corners(id).map(p => p.y)) })) }));
      });
      for (const lazyWorldUpdate of [false, true]) it(`${pose}/${profile.name}: ${lazyWorldUpdate ? "cold" : "updated"} nonidentity parent covariance`, () => {
        const local = poseScene(profile.hunger, profile.design), localGround = Math.min(...local.corners("pawFL").map(p => p.y));
        const placed = poseScene(profile.hunger, profile.design, { position: [1.3, .4, -.7], yaw: .63, scale: 1.3, lazyWorldUpdate });
        const ground = Math.min(...placed.corners("pawFL").map(p => p.y));
        for (const breath of [.99, 1, 1.01]) {
          physical(local, pose, localGround, breath); physical(placed, pose, ground, breath);
          for (const [id, node] of local.boxes) if (node.visible) {
            const points = placed.corners(id).map(p => placed.root.worldToLocal(p));
            for (const [i, p] of local.corners(id).entries()) expect(p.distanceTo(points[i]), id).toBeLessThan(1e-12);
          }
        }
      }, 30_000);
    }
    it(`${profile.name}: distinct real D/C/B geometry, curled head/limbs/tail folded`, () => {
      const states = poses.map(pose => {
        const rig = poseScene(profile.hunger, profile.design); physical(rig, pose, Math.min(...rig.corners("pawFL").map(p => p.y)), 1);
        return { rig, points: ["head", "pawFL", "pawBL", "tailTip"].map(id => rig.boxes.get(id)!.getWorldPosition(new Vector3())) };
      });
      for (const i of [0, 1]) for (let j = i + 1; j < 3; j++) expect(states[i].points.some((p, k) => p.distanceTo(states[j].points[k]) > .001)).toBe(true);
      for (const [upper, foot] of [["shoulderFL", "wristFL"], ["shoulderFR", "wristFR"], ["hipBL", "ankleBL"], ["hipBR", "ankleBR"]]) {
        const reach = (rig: Rig) => rig.joints.get("joint-" + upper)!.getWorldPosition(new Vector3()).distanceTo(rig.joints.get("joint-" + foot)!.getWorldPosition(new Vector3()));
        expect(reach(states[1].rig), `${upper}/${foot}/curled fold`).toBeLessThan(reach(states[0].rig));
      }
      for (const id of ["joint-neck", "joint-head", "joint-elbowFL", "joint-kneeBL", "joint-tailBase", "joint-tailMid", "joint-tailTip"]) {
        expect(states[0].rig.joints.get(id)!.quaternion.angleTo(states[1].rig.joints.get(id)!.quaternion), id).toBeGreaterThan(.001);
      }
      const up = new Vector3(0, 1, 0);
      expect(up.clone().transformDirection(states[0].rig.boxes.get("body")!.matrixWorld).y).toBeCloseTo(0, 12);
      expect(up.clone().transformDirection(states[2].rig.boxes.get("body")!.matrixWorld).y).toBeLessThan(0);
    }, 30_000);
  }
});
