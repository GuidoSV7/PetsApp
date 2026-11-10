import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshBasicMaterial } from "three";
import { CELL_SIZE, FIELD_HALF, FIELD_LINE_HALF, FIELD_SIZE } from "./room-grid";

/** Owner art direction (S1/S2): «todo sea un campo verde abierto», squared and
 * readable like Minecraft. Two surfaces only — the walls, baseboard and window of
 * the fixed room shell are gone from the default world and come back as placeable
 * items (`room-geometry.ts` still builds them).
 */
export const FIELD_PALETTE = {
  ground: "#5b9b52",
  line: "#4a8643",
} as const;

/** The lines sit just above the plate so the ground draw never z-fights them. */
export const FIELD_LINE_LIFT = CELL_SIZE * 0.004;

const GROUND_Y = 0;

type Quad = { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number; readonly surface: keyof typeof FIELD_PALETTE };

/** One quad per painted surface, all in the plate plane: the bounding plate plus
 * one strip per lattice line in both directions (17 + 17 for 16 tiles).
 * Corners run counter-clockwise seen from above, so every triangle faces +Y.
 */
function quads(): Quad[] {
  const all: Quad[] = [{ x0: -FIELD_HALF, x1: FIELD_HALF, z0: -FIELD_HALF, z1: FIELD_HALF, surface: "ground" }];
  for (let edge = 0; edge <= FIELD_SIZE; edge++) {
    // Boundary lines are pulled inside the plate so the silhouette stays square.
    const orthogonal = -FIELD_HALF + edge * CELL_SIZE;
    const centre = edge === 0
      ? -FIELD_HALF + FIELD_LINE_HALF
      : edge === FIELD_SIZE ? FIELD_HALF - FIELD_LINE_HALF : orthogonal;
    all.push({
      x0: centre - FIELD_LINE_HALF, x1: centre + FIELD_LINE_HALF,
      z0: -FIELD_HALF, z1: FIELD_HALF, surface: "line",
    });
    all.push({
      x0: -FIELD_HALF, x1: FIELD_HALF,
      z0: centre - FIELD_LINE_HALF, z1: centre + FIELD_LINE_HALF, surface: "line",
    });
  }
  return all;
}

/** Builds an isolated, unregistered field. Caller owns mesh, geometry and material.
 * One geometry, one material, no groups: a single draw with no per-frame work and
 * no voxelisation (the 16 × 16 floor is never fed through `createRoom`).
 */
export function createField() {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  // Color(hex) performs sRGB -> Linear-sRGB conversion with Three color management.
  const palette = Object.fromEntries(
    Object.entries(FIELD_PALETTE).map(([name, hex]) => [name, new Color(hex)]),
  ) as Record<keyof typeof FIELD_PALETTE, Color>;
  for (const quad of quads()) {
    const y = quad.surface === "ground" ? GROUND_Y : GROUND_Y + FIELD_LINE_LIFT;
    const corners = [
      [quad.x0, y, quad.z0],
      [quad.x0, y, quad.z1],
      [quad.x1, y, quad.z1],
      [quad.x1, y, quad.z0],
    ] as const;
    const start = positions.length / 3;
    const color = palette[quad.surface];
    for (const corner of corners) {
      positions.push(corner[0], corner[1], corner[2]);
      colors.push(color.r, color.g, color.b);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  // Unlit on purpose: the ground emits FIELD_PALETTE.ground exactly, which is the
  // green the CSS loading placeholder paints (S6), and it is the cheapest material.
  const material = new MeshBasicMaterial({ vertexColors: true, transparent: false, opacity: 1, toneMapped: false });
  const mesh = new Mesh(geometry, material);
  mesh.name = "procedural-field";
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
