import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshLambertMaterial } from "three";
import { ROOM_LENGTH } from "./room-grid";
import { AO_FACTORS, aoLevel, flipDiagonal, type AoLevel } from "./room-ao";

type Triple = readonly [number, number, number];
export const ROOM_PALETTE = {
  // Owner art direction: warm daylight room. The plan calls these proposals, and
  // the sage set read as a grey prototype next to the grey coats. Warm wood keeps
  // the floor clear of every coat preset (including white, orange and calico),
  // cream walls stay lighter than the cat, and the rug gives a saturated base.
  floor: "#b07a4e",
  north: "#f2e4cb",
  west: "#e6d2b3",
  baseboard: "#6d4630",
  window: "#cfe8ff",
  trim: "#fbf5e8",
  rug: "#4f8f5f",
} as const;
type Surface = keyof typeof ROOM_PALETTE;
type Solid = { readonly min: Triple; readonly max: Triple; readonly surface: Surface };

/** Fixed L/20 authoring lattice. Bounds are integer, half-open voxel coordinates.
 * Overlaps are unioned; later solids own the color, never duplicate faces.
 * Floor top Y=0; inner north/west boundaries at -2L; walls height L.
 */
export const VOXEL_SIZE = ROOM_LENGTH / 20;
/** Rug footprint and layer: the floor's top voxel layer is recoloured, never raised,
 * so the rug face stays at Y0 and the A2 ground and floor raycast never move.
 */
export const ROOM_RUG = { minX: -22, maxX: 22, minZ: -22, maxZ: 22, layer: -1 } as const;
export function isRugVoxel(x: number, y: number, z: number): boolean {
  return y === ROOM_RUG.layer && x >= ROOM_RUG.minX && x < ROOM_RUG.maxX && z >= ROOM_RUG.minZ && z < ROOM_RUG.maxZ;
}

/** Authored wall height. Kept short on purpose: the overview frames the paw plane
 * against the wall top, so a 30-voxel wall shrank the cat to a fifth of the frame.
 */
export const ROOM_WALL_HEIGHT = 20 * VOXEL_SIZE;
export const ROOM_SOLIDS: readonly Solid[] = [
  { min: [-40, -2, -40], max: [40, 0, 40], surface: "floor" },
  { min: [-42, -2, -42], max: [40, 20, -40], surface: "north" },
  { min: [-42, -2, -40], max: [-40, 20, 40], surface: "west" },
  { min: [-40, 0, -40], max: [40, 3, -39], surface: "baseboard" },
  { min: [-40, 0, -39], max: [-39, 3, 40], surface: "baseboard" },
  { min: [-12, 7, -40], max: [12, 17, -39], surface: "window" },
  { min: [-13, 6, -40], max: [-12, 18, -38], surface: "trim" },
  { min: [12, 6, -40], max: [13, 18, -38], surface: "trim" },
  { min: [-12, 6, -40], max: [12, 7, -38], surface: "trim" },
  { min: [-12, 17, -40], max: [12, 18, -38], surface: "trim" },
];

// Each tangent pair has u × v = outward normal.
const FACES: readonly { n: Triple; u: Triple; v: Triple }[] = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Soft time slice so face meshing does not monopolize the main thread (~8–12 ms). */
export const ROOM_BUILD_SLICE_MS = 10;

export type RoomHandle = {
  mesh: Mesh;
  geometry: BufferGeometry;
  material: MeshLambertMaterial;
  dispose: () => void;
};

export type CreateRoomAsyncOptions = {
  /** Abort check between slices. */
  isCancelled?: () => boolean;
  /** Invoked after each yield (tests assert the build breathes). */
  onYield?: () => void;
  /** Override slice budget (ms). */
  sliceMs?: number;
};

type MeshBuffers = {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
};

function fillVoxels(): Map<string, Surface> {
  const voxels = new Map<string, Surface>();
  for (const solid of ROOM_SOLIDS) {
    for (let x = solid.min[0]; x < solid.max[0]; x++) {
      for (let y = solid.min[1]; y < solid.max[1]; y++) {
        for (let z = solid.min[2]; z < solid.max[2]; z++) voxels.set(key(x, y, z), solid.surface);
      }
    }
  }
  // Rug: recolour the floor's top voxel layer instead of adding geometry, so its
  // visible face is still Y0 and the A2 ground and the floor raycast are untouched.
  for (let x = ROOM_RUG.minX; x < ROOM_RUG.maxX; x++) {
    for (let z = ROOM_RUG.minZ; z < ROOM_RUG.maxZ; z++) {
      const top = key(x, ROOM_RUG.layer, z);
      if (voxels.get(top) === "floor") voxels.set(top, "rug");
    }
  }
  return voxels;
}

function appendExposedFaces(
  voxels: Map<string, Surface>,
  palette: Record<Surface, Color>,
  buffers: MeshBuffers,
  entries: readonly [string, Surface][],
  from: number,
  to: number,
): void {
  const { positions, normals, colors, indices } = buffers;
  for (let i = from; i < to; i++) {
    const [coordinate, surface] = entries[i];
    const p = coordinate.split(",").map(Number);
    for (const { n, u, v } of FACES) {
      const outside = p.map((value, axis) => value + n[axis]);
      if (voxels.has(key(outside[0], outside[1], outside[2]))) continue;
      const start = positions.length / 3;
      const levels: AoLevel[] = [];
      for (const [su, sv] of CORNERS) {
        const occupied = (a: number, b: number) => {
          const sample = outside.map((value, axis) => value + a * u[axis] + b * v[axis]);
          return voxels.has(key(sample[0], sample[1], sample[2]));
        };
        const level = aoLevel(occupied(su, 0), occupied(0, sv), occupied(su, sv));
        levels.push(level);
        for (let axis = 0; axis < 3; axis++) {
          positions.push((p[axis] + 0.5 + (n[axis] + su * u[axis] + sv * v[axis]) / 2) * VOXEL_SIZE);
          normals.push(n[axis]);
        }
        const color = palette[surface];
        colors.push(color.r * AO_FACTORS[level], color.g * AO_FACTORS[level], color.b * AO_FACTORS[level]);
      }
      const diagonal = flipDiagonal(levels as [AoLevel, AoLevel, AoLevel, AoLevel]);
      for (const index of diagonal ? [0, 1, 3, 1, 2, 3] : [0, 1, 2, 0, 2, 3]) indices.push(start + index);
    }
  }
}

function finalizeRoom(buffers: MeshBuffers): RoomHandle {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(buffers.positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(buffers.normals, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(buffers.colors, 3));
  geometry.setIndex(buffers.indices);
  geometry.computeBoundingSphere();
  const material = new MeshLambertMaterial({ vertexColors: true, transparent: false, opacity: 1 });
  const mesh = new Mesh(geometry, material);
  mesh.name = "procedural-room";
  mesh.layers.set(1);
  let disposed = false;
  return {
    mesh, geometry, material,
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      material.dispose();
    },
  };
}

function scheduleSliceYield(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleWindow.requestIdleCallback(() => resolve(), { timeout: 48 });
      return;
    }
    window.setTimeout(() => resolve(), 0);
  });
}

/** Builds an isolated, unregistered room. Caller owns mesh, geometry and material.
 * Add mesh to the caller's scene; on replacement/unmount remove it and dispose().
 * No cache, assets, temporary GPU geometries, runtime cat imports or frame hooks.
 */
export function createRoom(): RoomHandle {
  const voxels = fillVoxels();
  const palette = Object.fromEntries(
    Object.entries(ROOM_PALETTE).map(([name, hex]) => [name, new Color(hex)]),
  ) as Record<Surface, Color>;
  const buffers: MeshBuffers = { positions: [], normals: [], colors: [], indices: [] };
  const entries = [...voxels.entries()];
  appendExposedFaces(voxels, palette, buffers, entries, 0, entries.length);
  return finalizeRoom(buffers);
}

/**
 * Same mesh as `createRoom`, but face meshing yields every ~`sliceMs` so the
 * main thread can handle input/paint between slices (issue #34).
 */
export async function createRoomAsync(options: CreateRoomAsyncOptions = {}): Promise<RoomHandle> {
  const sliceMs = options.sliceMs ?? ROOM_BUILD_SLICE_MS;
  if (options.isCancelled?.()) throw new DOMException("Room build cancelled", "AbortError");
  const voxels = fillVoxels();
  if (options.isCancelled?.()) throw new DOMException("Room build cancelled", "AbortError");
  const palette = Object.fromEntries(
    Object.entries(ROOM_PALETTE).map(([name, hex]) => [name, new Color(hex)]),
  ) as Record<Surface, Color>;
  const buffers: MeshBuffers = { positions: [], normals: [], colors: [], indices: [] };
  const entries = [...voxels.entries()];
  let cursor = 0;
  let sliceStart = typeof performance !== "undefined" ? performance.now() : 0;
  let yielded = false;
  while (cursor < entries.length) {
    if (options.isCancelled?.()) throw new DOMException("Room build cancelled", "AbortError");
    // Process a small batch, then check the time budget.
    const batchEnd = Math.min(cursor + 32, entries.length);
    appendExposedFaces(voxels, palette, buffers, entries, cursor, batchEnd);
    cursor = batchEnd;
    const now = typeof performance !== "undefined" ? performance.now() : sliceStart + sliceMs + 1;
    if (cursor < entries.length && now - sliceStart >= sliceMs) {
      options.onYield?.();
      yielded = true;
      await scheduleSliceYield();
      sliceStart = typeof performance !== "undefined" ? performance.now() : 0;
    }
  }
  // Guarantee at least one yield on large rooms when the environment is fast
  // enough to finish under the budget in one go (still splits attach from paint).
  if (!yielded && entries.length > 0) {
    options.onYield?.();
    await scheduleSliceYield();
  }
  if (options.isCancelled?.()) throw new DOMException("Room build cancelled", "AbortError");
  return finalizeRoom(buffers);
}
