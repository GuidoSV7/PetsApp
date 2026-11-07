import { Euler, Quaternion } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import type { CatSkeleton } from "./cat-skeleton";

/** Independent side-lying FK at the unchanged, asymmetric A1 tail anchor. */
export const CAT_SIDE_TAIL_FK = {
  left: [[-80, -40.540343, 27.073959], [-8.633422, 36.207251, -27.792382], [-69.577004, 80, 18.339561]],
  right: [[-80, .040409, 77.946680], [-28.048246, 3.013536, -75.096203], [-26.114994, -37.236442, 23.671422]],
} as const;

/** C-only authored FK: separate routes from the unchanged asymmetric anchor.
 * The right base reverses its cross-section to stay above the supporting face;
 * distal segments turn headward along the same torso side. Degrees, local XYZ.
 */
export const CAT_CURLED_TAIL_FK = {
  left: [[110, 0, 0], [-56.869898, 0, 0], [-53.130102, 0, 30]],
  right: [[-70, 180, 0], [-123.130102, 180, 0], [-53.130102, 0, 30]],
} as const;

/**
 * Setup-only exact X reflection of the paired body/limbs, relative to rest.
 * Tail translations CANNOT reflect: transport the source's FK residual between
 * independently authored left/right tail frames instead. The reverse transport
 * is its inverse, including for nonzero residuals. Never use negative scale.
 * C uses its own frames only at the exact authored neck signature. Other
 * residuals, D frames and B reflection remain unchanged. This setup seam is not
 * a new runtime side selector or a claim of visual acceptance.
 */
export function mirrorCatPoseBase(skeleton: CatSkeleton, source: Float64Array): Float64Array {
  const output = new Float64Array(source), q = new Quaternion(), targetRest = new Quaternion();
  // These FK frames belong to the stable quarter-roll family, not B's half
  // turn. Leave B's previous tail rotation reflection intact until authored.
  const sideTail = source[0] === 0 && source[1] === 0 && Math.abs(Math.abs(source[2]) - Math.abs(source[3])) < 1e-12;
  const right = source[2] * source[3] < 0; // independent of quaternion sign
  // Exact signature of C's authored rigid neck fold, invariant under reflection.
  // All other poses and D/B residual transport keep their prior arithmetic.
  const neck = CAT_JOINT_IDS.indexOf("joint-neck") * 4;
  const curled = sideTail && Math.abs(source[neck] / source[neck + 3] + Math.tan(35 * Math.PI / 180)) < 1e-12;
  const family = curled ? CAT_CURLED_TAIL_FK : CAT_SIDE_TAIL_FK;
  const sourceTail = right ? family.right : family.left;
  const targetTail = right ? family.left : family.right;
  const authored = new Quaternion(), counterpart = new Quaternion();
  const binds = new Map(skeleton.joints.map(joint => [joint.id, joint]));
  for (const [i, id] of CAT_JOINT_IDS.entries()) {
    const target = id.replace(/[LR]$/, side => side === "L" ? "R" : "L") as typeof CAT_JOINT_IDS[number];
    q.setFromEuler(new Euler(...binds.get(id)!.rotation)).multiply(new Quaternion().fromArray(source, i * 4));
    // F R F, F=diag(-1,1,1): quaternion vector is a pseudovector.
    q.set(q.x, -q.y, -q.z, q.w);
    const tailIndex = ["joint-tailBase", "joint-tailMid", "joint-tailTip"].indexOf(id);
    if (sideTail && tailIndex >= 0) {
      authored.setFromEuler(new Euler(...sourceTail[tailIndex].map(value => value * Math.PI / 180) as [number, number, number]));
      counterpart.setFromEuler(new Euler(...targetTail[tailIndex].map(value => value * Math.PI / 180) as [number, number, number]));
      authored.set(authored.x, -authored.y, -authored.z, authored.w).invert();
      q.premultiply(authored).premultiply(counterpart);
    }
    targetRest.setFromEuler(new Euler(...binds.get(target)!.rotation)).invert().multiply(q).normalize()
      .toArray(output, CAT_JOINT_IDS.indexOf(target) * 4);
  }
  output[88] = -source[88]; output[91] = -source[91];
  return output;
}
