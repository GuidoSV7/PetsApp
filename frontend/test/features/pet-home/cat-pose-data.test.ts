import { describe, expect, it } from "vitest";
import { Euler, MathUtils, Quaternion } from "three";
import { CAT_JOINT_IDS, CAT_POSE_IDS, CAT_POSES, compileCatPose } from "../../../src/features/pet-home/cat-pose-data";

const expectedJoints = ["root", "torso", "neck", "head", "jaw", "earL", "earR", "shoulderFL", "elbowFL", "wristFL", "shoulderFR", "elbowFR", "wristFR", "hipBL", "kneeBL", "ankleBL", "hipBR", "kneeBR", "ankleBR", "tailBase", "tailMid", "tailTip"].map(id => `joint-${id}`);
describe("cat pose catalog", () => {
  it("preserves all exact joint IDs and zero seated deltas including ear rest", () => {
    expect(CAT_JOINT_IDS).toEqual(expectedJoints);
    expect(CAT_POSE_IDS).toEqual(["seated", "standing", "loaf", "sphinx", "side", "curled", "bellyUp"]);
    for (const pose of Object.values(CAT_POSES)) expect(Object.keys(pose.rotationDeg)).toEqual(expectedJoints);
    expect(Object.values(CAT_POSES.seated.rotationDeg)).toEqual(expectedJoints.map(() => [0, 0, 0]));
    expect(CAT_POSES.seated.rootOffset).toEqual([0, 0, 0]);
  });
  it("authors seven distinct poses with exact rest extension masks and explicit support sets", () => {
    const limbs = ["forearmFL", "forearmFR", "shinBL", "shinBR"];
    expect(CAT_POSE_IDS.map(id => CAT_POSES[id].visibleParts)).toEqual([[], limbs, [], limbs.slice(0, 2), limbs, limbs, limbs]);
  });
  it("provides seven distinct local joint tables", () => {
    expect(new Set(Object.values(CAT_POSES).map(p => JSON.stringify(p.rotationDeg))).size).toBe(7);
  });
  it("declares explicit rest paw supports and keeps jaw closed", () => {
    expect(CAT_POSE_IDS.map(id => CAT_POSES[id].supports)).toEqual([
      ["FL", "FR", "BL", "BR"], ["FL", "FR", "BL", "BR"], [], ["FL", "FR"], [], [], [],
    ]);
    for (const pose of Object.values(CAT_POSES)) {
      expect(pose.rootOffset[0]).toBe(0); expect(pose.rootOffset[2]).toBe(0);
      expect(pose.rotationDeg["joint-jaw"]).toEqual([0, 0, 0]);
    }
  });
  it("compiles local XYZ degrees to normalized tuples without mutating or aliasing inputs", () => {
    const input = structuredClone(CAT_POSES.seated);
    const definition = { ...input, headingDeg: 370, rotationDeg: { ...input.rotationDeg, "joint-head": [30, -20, 10] as const } };
    const before = JSON.stringify(definition);
    const result = compileCatPose(definition);
    const q = new Quaternion().setFromEuler(new Euler(...[30, -20, 10].map(MathUtils.degToRad) as [number, number, number], "XYZ"));
    expect(result.rotations["joint-head"]).toEqual(q.normalize().toArray());
    expect(result.headingDeg).toBe(370);
    expect(result).toEqual(compileCatPose(definition));
    for (const rotation of Object.values(result.rotations)) expect(Math.hypot(...rotation)).toBeCloseTo(1, 14);
    expect(JSON.stringify(definition)).toBe(before);
    expect(result.rootOffset).not.toBe(definition.rootOffset);
    expect(result.visibleParts).not.toBe(definition.visibleParts);
    expect(result.supports).not.toBe(definition.supports);
  });
});
