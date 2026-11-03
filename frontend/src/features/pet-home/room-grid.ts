/** Frozen canonical A1 neutral length: (nose +0.52 - tail -0.65) × 0.78.
 * Deliberately independent of the cat runtime, poses, morphology and design scale.
 */
export const ROOM_LENGTH = 0.9126;
export const CELL_SIZE = ROOM_LENGTH / 2;
export const ROOM_HALF = 4 * CELL_SIZE;
export const GRID_SIZE = 8;

export type RoomCell = { i: number; j: number };
export type RoomPoint = { x: number; y: number; z: number };

/** +X east, +Y up, -Z north; i increases east, j increases north. */
export function cellCenter(i: number, j: number): RoomPoint | null {
  if (![i, j].every((n) => Number.isInteger(n) && n >= 0 && n < GRID_SIZE)) return null;
  return { x: -ROOM_HALF + (i + 0.5) * CELL_SIZE, y: 0, z: ROOM_HALF - (j + 0.5) * CELL_SIZE };
}

/** X[-half,half), Z(-half,half]; never snap exterior points into the room. */
export function pointToCell({ x, z }: { x: number; z: number }): RoomCell | null {
  if (!Number.isFinite(x) || !Number.isFinite(z) || x < -ROOM_HALF || x >= ROOM_HALF || z <= -ROOM_HALF || z > ROOM_HALF) return null;
  let i = 0;
  let j = 0;
  // Compare authored edges directly: division can round an exact interior edge down.
  for (let edge = 1; edge < GRID_SIZE; edge++) {
    if (x >= -ROOM_HALF + edge * CELL_SIZE) i = edge;
    if (z <= ROOM_HALF - edge * CELL_SIZE) j = edge;
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
