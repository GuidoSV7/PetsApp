import { Euler, Quaternion } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import { createCatPoseReference } from "./cat-pose-reference";
import { CatPoseSimulation } from "./cat-pose-simulation";
import type { PoseBreathFK } from "./cat-pose-tracks";
import type { CatSkeleton } from "./cat-skeleton";

export type CatJumpPhase = "prepare" | "takeoff" | "airborne" | "landing" | "settle";
export const PLAY_RELEASE = 8;
export const PLAY_LANDING = 24;
export function catPlayJumpPhase(age: number): CatJumpPhase {
  return age < PLAY_RELEASE ? "prepare" : age === PLAY_RELEASE ? "takeoff"
    : age < PLAY_LANDING ? "airborne" : age === PLAY_LANDING ? "landing" : "settle";
}
export function catJumpReleased(phase: CatJumpPhase | null): boolean {
  return phase === "takeoff" || phase === "airborne";
}
export function catPlayJumpHeight(age: number): number {
  // Small grounded flex before extension and after replant. Root travel is
  // downward only while planted; existing support IK flexes the actual legs.
  if (age < PLAY_RELEASE) return -.006 * Math.sin(age / PLAY_RELEASE * Math.PI) ** 2;
  if (age > PLAY_LANDING) return -.006 * Math.sin((age - PLAY_LANDING) / 24 * Math.PI) ** 2;
  if (age === PLAY_RELEASE || age === PLAY_LANDING) return 0;
  return .04 * Math.sin((age - PLAY_RELEASE) / (PLAY_LANDING - PLAY_RELEASE) * Math.PI) ** 2;
}

/** Compile ONLY the supported seated release/landing configuration. Flight
 * holds these local FK angles while the root travels; no airborne IK targets.
 * The dense breath family preserves full body-surface expansion at release.
 */
export function compileCatPlayJump(skeleton: CatSkeleton): PoseBreathFK {
  const reference = createCatPoseReference(skeleton);
  const frame = new CatPoseSimulation({ seed: 0 }).sample();
  const limbs = CAT_JOINT_IDS.map((id, i) => ({ id, i }))
    .filter(({ i }) => i >= 7 && i <= 18);
  const rest = new Map(skeleton.joints.map(joint => [joint.id,
    new Quaternion().setFromEuler(new Euler(...joint.rotation)).invert()]));
  const variants: Float64Array[] = [], q = new Quaternion();
  for (let knot = 0; knot <= 80; knot++) {
    frame.bodyBreath = .99 + knot / 4000;
    reference.bind.apply(frame);
    if (reference.bind.contacts.diagnostics.unreachableFeet !== 0) throw new RangeError("Play release requires reachable seated support.");
    const rotations = frame.rotations.slice();
    for (const { id, i } of limbs) q.copy(rest.get(id)!).multiply(reference.joints.get(id)!.quaternion).normalize().toArray(rotations, i * 4);
    variants.push(rotations);
  }
  return { minimum: .99, maximum: 1.01, jointMask: limbs.reduce((mask, { i }) => mask | (1 << i), 0), variants };
}
