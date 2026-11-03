import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshLambertMaterial } from "three";
import { ROOM_LENGTH } from "./room-grid";
import { AO_FACTORS, aoLevel, flipDiagonal, type AoLevel } from "./room-ao";

type Triple = readonly [number, number, number];
export const ROOM_PALETTE = {
  floor: "#8da185",
  north: "#c9d4c3",
  west: "#b5c6ad",
  baseboard: "#5f7568",
  window: "#e4efd7",
  trim: "#3dff8a",
} as const;
type Surface = keyof typeof ROOM_PALETTE;
type Solid = { readonly min: Triple; readonly max: Triple; readonly surface: Surface };

/** Fixed L/20 authoring lattice. Bounds are integer, half-open voxel coordinates.
 * Overlaps are unioned; later solids own the color, never duplicate faces.
 * Floor top Y=0; inner north/west boundaries at -2L; walls height 1.5L.
 */
export const VOXEL_SIZE = ROOM_LENGTH / 20;
export const ROOM_SOLIDS: readonly Solid[] = [
  { min: [-40, -2, -40], max: [40, 0, 40], surface: "floor" },
  { min: [-42, -2, -42], max: [40, 30, -40], surface: "north" },
  { min: [-42, -2, -40], max: [-40, 30, 40], surface: "west" },
  { min: [-40, 0, -40], max: [40, 3, -39], surface: "baseboard" },
  { min: [-40, 0, -39], max: [-39, 3, 40], surface: "baseboard" },
  { min: [-12, 12, -40], max: [12, 24, -39], surface: "window" },
  { min: [-13, 11, -40], max: [-12, 25, -38], surface: "trim" },
  { min: [12, 11, -40], max: [13, 25, -38], surface: "trim" },
  { min: [-12, 11, -40], max: [12, 12, -38], surface: "trim" },
  { min: [-12, 24, -40], max: [12, 25, -38], surface: "trim" },
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

/** Builds an isolated, unregistered room. Caller owns mesh, geometry and material.
 * Add mesh to the caller's scene; on replacement/unmount remove it and dispose().
 * No cache, assets, temporary GPU geometries, runtime cat imports or frame hooks.
 */
export function createRoom() {
  const voxels = new Map<string, Surface>();
  for (const solid of ROOM_SOLIDS) {
    for (let x = solid.min[0]; x < solid.max[0]; x++) {
      for (let y = solid.min[1]; y < solid.max[1]; y++) {
        for (let z = solid.min[2]; z < solid.max[2]; z++) voxels.set(key(x, y, z), solid.surface);
      }
    }
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  // Color(hex) performs sRGB -> Linear-sRGB conversion with Three color management.
  const palette = Object.fromEntries(Object.entries(ROOM_PALETTE).map(([name, hex]) => [name, new Color(hex)])) as Record<Surface, Color>;
  for (const [coordinate, surface] of voxels) {
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
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
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
