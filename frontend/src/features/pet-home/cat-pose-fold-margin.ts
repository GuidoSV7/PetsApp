type Point3 = Readonly<{ x: number; y: number; z: number }>;

// Authoring reserve, NOT a solver tolerance: 100 times the S30 minimum-bracket
// resolution, relative to the calibrated chain rather than a hunger/pose number.
export const CAT_POSE_FOLD_MARGIN_RATIO = .001;

/** Smallest positive X pitch whose horizontal projection clears the inner fold. */
export function catPoseFoldMarginPitch(root: Point3, goal: Point3, pivot: Point3, upper: number, lower: number): number {
  const radius = Math.abs(upper - lower) + CAT_POSE_FOLD_MARGIN_RATIO * (upper + lower);
  const dx = Math.abs(root.x - goal.x);
  if (dx >= radius) return 0;
  const clearanceZ = Math.sqrt((radius - dx) * (radius + dx));
  const height = pivot.y - root.y, forward = root.z - pivot.z;
  // z(theta) = pivot.z + forward*cos(theta) - height*sin(theta).
  // Clear the expanded inner sphere for EVERY root Y, not just sampled ticks.
  const cosine = (goal.z - pivot.z - clearanceZ) / Math.hypot(height, forward);
  return Math.max(0, Math.acos(cosine) - Math.atan2(height, forward));
}
