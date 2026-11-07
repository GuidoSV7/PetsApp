import { Vector3 } from "three";
import type { PoseVec3, SupportChainInput, SupportChainSolution } from "./cat-pose-types";

const finitePoint = (v: PoseVec3) => Number.isFinite(v[0]) && Number.isFinite(v[1]) && Number.isFinite(v[2]);

/** Allocate once per rig, never inside a render/fixed-step callback. */
export function createSupportScratch() {
  return { origin: new Vector3(), axis: new Vector3(), bend: new Vector3(), knee: new Vector3(), foot: new Vector3() };
}
export function createSupportSolution() {
  return { knee: [0, 0, 0] as [number, number, number], foot: [0, 0, 0] as [number, number, number],
    footQuaternion: [0, 0, 0, 1] as [number, number, number, number], reachable: false, error: 0 };
}

/**
 * Pure world-space rigid two-bone support, +Y up / +Z forward / left -X.
 * Unreachable goals produce a rigid nearest radial endpoint, never false contact.
 * The caller applies this LAST (after springs) and rejects unreachable supports.
 */
export function solveTwoBoneSupport(input: SupportChainInput): SupportChainSolution {
  return solveTwoBoneSupportInto(input, createSupportSolution(), createSupportScratch());
}

/** Same analytic solution/validation as the allocating compatibility API. */
export function solveTwoBoneSupportInto(input: SupportChainInput,
  output: ReturnType<typeof createSupportSolution>, scratch: ReturnType<typeof createSupportScratch>): SupportChainSolution {
  const { root, target, pole, upperLength: a, lowerLength: b, maxReach } = input;
  if (!finitePoint(root) || !finitePoint(target) || !finitePoint(pole) ||
      !Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    throw new RangeError("Support chain requires finite world points and positive finite lengths.");
  }
  const minimum = Math.abs(a - b);
  if (maxReach !== undefined &&
      (!Number.isFinite(maxReach) || maxReach <= 0 || maxReach < minimum)) {
    throw new RangeError("Support chain maxReach must be finite, positive and at least |upperLength - lowerLength|.");
  }

  const { origin, axis, bend, knee, foot } = scratch;
  origin.set(root[0], root[1], root[2]);
  axis.set(target[0], target[1], target[2]).sub(origin);
  const distance = Math.hypot(axis.x, axis.y, axis.z);
  bend.set(pole[0], pole[1], pole[2]).sub(origin);
  const poleDistance = Math.hypot(bend.x, bend.y, bend.z);
  const maximum = Math.min(a + b, maxReach ?? Infinity);
  if (!Number.isFinite(distance) || !Number.isFinite(poleDistance) || !Number.isFinite(maximum)) {
    throw new RangeError("Support chain geometry exceeds finite numeric range.");
  }
  // No direction exists at coincidence. A fixed axis makes replay stateless.
  if (distance === 0) axis.set(0, 1, 0);
  else axis.set(axis.x / distance, axis.y / distance, axis.z / distance);

  // The pole is a WORLD POINT, not a vector. Remove its axial component to
  // obtain the knee's bend direction. Normalize before projection for stability.
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
  knee.copy(origin).addScaledVector(axis, x * scale).addScaledVector(bend, h);
  if (reachable) foot.set(target[0], target[1], target[2]);
  else foot.copy(origin).addScaledVector(axis, radius);
  const error = Math.hypot(foot.x - target[0], foot.y - target[1], foot.z - target[2]);
  if (!Number.isFinite(knee.x) || !Number.isFinite(knee.y) || !Number.isFinite(knee.z) ||
      !Number.isFinite(foot.x) || !Number.isFinite(foot.y) || !Number.isFinite(foot.z) || !Number.isFinite(error)) {
    throw new RangeError("Support chain geometry exceeds finite numeric range.");
  }
  output.knee[0] = knee.x; output.knee[1] = knee.y; output.knee[2] = knee.z;
  output.foot[0] = foot.x; output.foot[1] = foot.y; output.foot[2] = foot.z;
  // World-flat ankle orientation; adapters must remove the parent world rotation.
  output.footQuaternion[0] = 0; output.footQuaternion[1] = 0;
  output.footQuaternion[2] = 0; output.footQuaternion[3] = 1;
  output.reachable = reachable; output.error = error;
  return output;
}
