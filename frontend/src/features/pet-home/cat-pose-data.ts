import { Euler, MathUtils, Quaternion } from "three";
import type { CatJointId, CatPoseDefinition, CatPoseId, CompiledCatPose, PoseVec3 } from "./cat-pose-types";

export const CAT_POSE_IDS = Object.freeze(["seated", "standing", "loaf", "sphinx", "side", "curled", "bellyUp"] as const);
export const CAT_JOINT_IDS: readonly CatJointId[] = Object.freeze([
  "joint-root", "joint-torso", "joint-neck", "joint-head", "joint-jaw", "joint-earL", "joint-earR",
  "joint-shoulderFL", "joint-elbowFL", "joint-wristFL", "joint-shoulderFR", "joint-elbowFR", "joint-wristFR",
  "joint-hipBL", "joint-kneeBL", "joint-ankleBL", "joint-hipBR", "joint-kneeBR", "joint-ankleBR",
  "joint-tailBase", "joint-tailMid", "joint-tailTip",
]);
const zero: PoseVec3 = [0, 0, 0];
const limbs = ["forearmFL", "forearmFR", "shinBL", "shinBR"] as const;

/** Expand sparse authoring into complete 22-entry exports; never alter bind rotations. */
function definePose(id: CatPoseId, label: string, height: number,
  deltas: Partial<Record<CatJointId, PoseVec3>>, visibleParts: CatPoseDefinition["visibleParts"],
  supports: CatPoseDefinition["supports"]): CatPoseDefinition {
  const rotationDeg = Object.fromEntries(CAT_JOINT_IDS.map(joint => [joint, Object.freeze([...(deltas[joint] ?? zero)])]));
  return Object.freeze({ id, label, rotationDeg: Object.freeze(rotationDeg) as CatPoseDefinition["rotationDeg"],
    rootOffset: Object.freeze([0, height, 0]) as PoseVec3, headingDeg: 0,
    visibleParts: Object.freeze([...visibleParts]), supports: Object.freeze([...supports]) });
}

/** Initial rigid-FK authoring only: editor/contact/browser tuning is still required. */
export const CAT_POSES: Readonly<Record<CatPoseId, CatPoseDefinition>> = Object.freeze({
  seated: definePose("seated", "Seated", 0, {}, [], ["FL", "FR", "BL", "BR"]),
  standing: definePose("standing", "Quadruped", -.10, {
    // The primitive torso already has its long axis along +Z. Raising the
    // pelvis is a limb/hip articulation, not a 60-degree torso compensation.
    "joint-torso": [0, 0, 0], "joint-neck": [0, 0, 0], "joint-head": [0, 0, 0],
    "joint-shoulderFL": [-55, 0, 0], "joint-shoulderFR": [-55, 0, 0],
    "joint-elbowFL": [15, 0, 0], "joint-elbowFR": [15, 0, 0],
    "joint-wristFL": [-20, 0, 0], "joint-wristFR": [-20, 0, 0],
    "joint-hipBL": [-45, 0, 0], "joint-hipBR": [-45, 0, 0],
    "joint-kneeBL": [-20, 0, 0], "joint-kneeBR": [-20, 0, 0],
    "joint-ankleBL": [5, 0, 0], "joint-ankleBR": [5, 0, 0],
    "joint-tailBase": [0, 25, -15], "joint-tailMid": [15, 0, 0], "joint-tailTip": [20, 0, 0],
  }, limbs, ["FL", "FR", "BL", "BR"]),
  loaf: definePose("loaf", "Loaf", -.24, {
    // Belly is the original horizontal lower face: .20 - .25 - .24 = -.29.
    // Fold limbs upward into the body; do not rotate a free paw through the floor.
    "joint-shoulderFL": [150, 0, 0], "joint-shoulderFR": [150, 0, 0],
    "joint-wristFL": [-150, 0, 0], "joint-wristFR": [-150, 0, 0],
    "joint-hipBL": [150, 0, 0], "joint-hipBR": [150, 0, 0],
    "joint-ankleBL": [-150, 0, 0], "joint-ankleBR": [-150, 0, 0],
    "joint-tailBase": [0, 60, 20], "joint-tailMid": [30, 40, 0], "joint-tailTip": [30, 20, 0],
  }, [], []),
  sphinx: definePose("sphinx", "Sphinx", -.09, {
    "joint-torso": [60, 0, 0], "joint-neck": [-35, 0, 0], "joint-head": [-25, 0, 0],
    "joint-shoulderFL": [-120, 0, 0], "joint-shoulderFR": [-120, 0, 0],
    "joint-elbowFL": [-20, 0, 0], "joint-elbowFR": [-20, 0, 0],
    "joint-wristFL": [80, 0, 0], "joint-wristFR": [80, 0, 0],
    "joint-hipBL": [-60, 0, 10], "joint-hipBR": [-60, 0, -10],
    "joint-kneeBL": [80, 0, 0], "joint-kneeBR": [80, 0, 0],
    "joint-ankleBL": [-80, 0, 0], "joint-ankleBR": [-80, 0, 0],
    "joint-tailBase": [0, 30, 20], "joint-tailMid": [25, 0, 0], "joint-tailTip": [15, 0, 0],
  }, limbs.slice(0, 2), ["FL", "FR"]),
  side: definePose("side", "Left side", -.13, {
    "joint-root": [0, 0, 90], "joint-torso": [60, 0, 0],
    "joint-neck": [-30, 0, 0], "joint-head": [-25, -10, 0],
    "joint-shoulderFL": [-60, 0, 15], "joint-shoulderFR": [-45, 0, -15],
    "joint-elbowFL": [35, 0, 0], "joint-elbowFR": [45, 0, 0],
    "joint-hipBL": [-45, 0, 15], "joint-hipBR": [-35, 0, -15],
    "joint-kneeBL": [45, 0, 0], "joint-kneeBR": [55, 0, 0],
    "joint-tailBase": [0, 35, 10], "joint-tailMid": [20, 10, 0], "joint-tailTip": [20, 0, 0],
  }, limbs, []),
  curled: definePose("curled", "Curled", -.13, {
    "joint-root": [0, 0, 90], "joint-torso": [60, 0, 0],
    "joint-neck": [-20, 25, 0], "joint-head": [20, 35, 0],
    "joint-shoulderFL": [-90, 0, 20], "joint-shoulderFR": [-80, 0, -20],
    "joint-elbowFL": [95, 0, 0], "joint-elbowFR": [95, 0, 0],
    "joint-hipBL": [-70, 0, 20], "joint-hipBR": [-65, 0, -20],
    "joint-kneeBL": [90, 0, 0], "joint-kneeBR": [90, 0, 0],
    "joint-tailBase": [30, 65, 20], "joint-tailMid": [60, 50, 0], "joint-tailTip": [65, 25, 0],
  }, limbs, []),
  bellyUp: definePose("bellyUp", "Belly up", -.08, {
    "joint-root": [0, 0, 180], "joint-torso": [60, 0, 0],
    "joint-neck": [-25, 0, 0], "joint-head": [-25, 0, 0],
    "joint-shoulderFL": [-30, 0, -20], "joint-shoulderFR": [-30, 0, 20],
    "joint-elbowFL": [65, 0, 0], "joint-elbowFR": [65, 0, 0],
    "joint-hipBL": [-20, 0, -20], "joint-hipBR": [-20, 0, 20],
    "joint-kneeBL": [65, 0, 0], "joint-kneeBR": [65, 0, 0],
    "joint-tailBase": [0, 15, 15], "joint-tailMid": [25, 0, 0], "joint-tailTip": [20, 0, 0],
  }, limbs, []),
});

export function compileCatPose(definition: CatPoseDefinition): CompiledCatPose {
  const entries = CAT_JOINT_IDS.map(id => {
    const radians = definition.rotationDeg[id].map(MathUtils.degToRad);
    const q = new Quaternion().setFromEuler(new Euler(radians[0], radians[1], radians[2], "XYZ")).normalize();
    return [id, q.toArray()];
  });
  return { id: definition.id, rotations: Object.fromEntries(entries) as CompiledCatPose["rotations"],
    rootOffset: [...definition.rootOffset], headingDeg: definition.headingDeg,
    visibleParts: [...definition.visibleParts], supports: [...definition.supports] };
}
