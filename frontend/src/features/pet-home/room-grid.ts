/** Frozen canonical A1 neutral length: (nose +0.52 - tail -0.65) × 0.78.
 * Deliberately independent of the cat runtime, poses, morphology and design scale.
 */
export const ROOM_LENGTH = 0.9126;
export const CELL_SIZE = ROOM_LENGTH / 2;
/** Owner decision (S2): the starter world is a 16 × 16 field of these cells. */
export const FIELD_SIZE = 16;
/** Half extent of the square field, centred on the origin. */
export const FIELD_HALF = (FIELD_SIZE / 2) * CELL_SIZE;
/** Half width of one painted lattice line, in world units. The 3D field and the
 * pre-3D loading placeholder paint the same lattice, so the width lives here.
 * Kept thin: at the authored camera it renders as a 1–2 px line.
 */
export const FIELD_LINE_HALF = CELL_SIZE * 0.008;

export type RoomCell = { i: number; j: number };
export type RoomPoint = { x: number; y: number; z: number };

/** +X east, +Y up, -Z north; i increases east, j increases north. */
export function cellCenter(i: number, j: number): RoomPoint | null {
  if (![i, j].every((n) => Number.isInteger(n) && n >= 0 && n < FIELD_SIZE)) return null;
  return { x: -FIELD_HALF + (i + 0.5) * CELL_SIZE, y: 0, z: FIELD_HALF - (j + 0.5) * CELL_SIZE };
}

/** X[-half,half), Z(-half,half]; never snap exterior points into the field. */
export function pointToCell({ x, z }: { x: number; z: number }): RoomCell | null {
  if (!Number.isFinite(x) || !Number.isFinite(z) || x < -FIELD_HALF || x >= FIELD_HALF || z <= -FIELD_HALF || z > FIELD_HALF) return null;
  let i = 0;
  let j = 0;
  // Compare authored edges directly: division can round an exact interior edge down.
  for (let edge = 1; edge < FIELD_SIZE; edge++) {
    if (x >= -FIELD_HALF + edge * CELL_SIZE) i = edge;
    if (z <= FIELD_HALF - edge * CELL_SIZE) j = edge;
  }
  return { i, j };
}

/** Application degrees, viewed from above: south, east, north, west.
 * Three's positive Y rotation transforms +Z toward +X.
 */
export function orientationY(degrees: number): number | null {
  switch (degrees) {
    case 0: return 0;
    case 90: return Math.PI / 2;
    case 180: return Math.PI;
    case 270: return -Math.PI / 2;
    default: return null;
  }
}
