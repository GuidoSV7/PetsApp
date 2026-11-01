import { Vector3 } from "three";
import type { PoseVec3, SupportChainInput, SupportChainSolution } from "./cat-pose-types";

const tuple = (v: Vector3): PoseVec3 => [v.x, v.y, v.z];
const finitePoint = (v: PoseVec3) => v.every(Number.isFinite);

/**
 * Pure world-space rigid two-bone support, +Y up / +Z forward / left -X.
 * Unreachable goals produce a rigid nearest radial endpoint, never false contact.
 * The caller applies this LAST (after springs) and rejects unreachable supports.
 */
export function solveTwoBoneSupport(input: SupportChainInput): SupportChainSolution {
  const { root, target, pole, upperLength: a, lowerLength: b, maxReach } = input;
  if (![root, target, pole].every(finitePoint) ||
      ![a, b].every((length) => Number.isFinite(length) && length > 0)) {
    throw new RangeError("Support chain requires finite world points and positive finite lengths.");
  }
  const minimum = Math.abs(a - b);
  if (maxReach !== undefined &&
      (!Number.isFinite(maxReach) || maxReach <= 0 || maxReach < minimum)) {
    throw new RangeError("Support chain maxReach must be finite, positive and at least |upperLength - lowerLength|.");
  }

  const origin = new Vector3(...root);
  const axis = new Vector3(...target).sub(origin);
  const distance = Math.hypot(axis.x, axis.y, axis.z);
  const poleOffset = new Vector3(...pole).sub(origin);
  const poleDistance = Math.hypot(poleOffset.x, poleOffset.y, poleOffset.z);
  const maximum = Math.min(a + b, maxReach ?? Infinity);
  if (![distance, poleDistance, maximum].every(Number.isFinite)) {
    throw new RangeError("Support chain geometry exceeds finite numeric range.");
  }
  // No direction exists at coincidence. A fixed axis makes replay stateless.
  if (distance === 0) axis.set(0, 1, 0);
  else axis.set(axis.x / distance, axis.y / distance, axis.z / distance);

  // The pole is a WORLD POINT, not a vector. Remove its axial component to
  // obtain the knee's bend direction. Normalize before projection for stability.
  const bend = poleOffset;
  if (poleDistance > 0) bend.set(bend.x / poleDistance, bend.y / poleDistance, bend.z / poleDistance);
  bend.addScaledVector(axis, -bend.dot(axis));
  if (bend.lengthSq() <= 1e-24) {
    // Collinear/coincident pole: use the least-aligned world axis (X wins ties).
    const x = Math.abs(axis.x), y = Math.abs(axis.y), z = Math.abs(axis.z);
    if (x <= y && x <= z) bend.set(1, 0, 0);
    else if (y <= z) bend.set(0, 1, 0);
    else bend.set(0, 0, 1);
    bend.addScaledVector(axis, -bend.dot(axis));
  }
  bend.normalize();

  const reachable = distance >= minimum && distance <= maximum;
  const radius = Math.max(minimum, Math.min(maximum, distance));
  // Law of cosines: axial x = (r² + a² - b²)/(2r), h² = a² - x².
  // Scale first and factor differences to avoid squared-length overflow and
  // cancellation for equal-length chains near the fully folded singularity.
  const scale = Math.max(a, b, radius);
  const u = a / scale, l = b / scale, r = radius / scale;
  const x = radius === 0 ? 0 : (r + (u - l) * (u + l) / r) / 2;
  const h = Math.sqrt(Math.max(0, (u - x) * (u + x))) * scale;
  const knee = origin.clone().addScaledVector(axis, x * scale).addScaledVector(bend, h);
  const foot = reachable ? new Vector3(...target) : origin.clone().addScaledVector(axis, radius);
  const error = Math.hypot(foot.x - target[0], foot.y - target[1], foot.z - target[2]);
  if (![...tuple(knee), ...tuple(foot), error].every(Number.isFinite)) {
    throw new RangeError("Support chain geometry exceeds finite numeric range.");
  }
  return {
    knee: tuple(knee),
    foot: tuple(foot),
    // World-flat ankle orientation; adapters must remove the parent world rotation.
    footQuaternion: [0, 0, 0, 1],
    reachable,
    error,
  };
}
