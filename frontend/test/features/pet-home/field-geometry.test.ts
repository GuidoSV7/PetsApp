import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { Color, Vector3 } from "three";
import { createField, FIELD_LINE_LIFT, FIELD_PALETTE } from "@/features/pet-home/field-geometry";
import { CELL_SIZE, FIELD_HALF, FIELD_LINE_HALF, FIELD_SIZE } from "@/features/pet-home/room-grid";

/** One plate quad plus one strip per lattice line in both directions. */
const QUADS = 1 + 2 * (FIELD_SIZE + 1);

const css = readFileSync(
  new URL("../../../src/features/pet-home/components/pet-home.module.css", import.meta.url),
  "utf8",
);
const declarations = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing selector ${selector}`);
  return css.slice(start, css.indexOf("}", start));
};

it("builds the default world as one flat, caller-owned, single-draw field (S1/S2)", () => {
  const field = createField();
  const other = createField();
  try {
    expect(field.mesh.geometry).toBe(field.geometry);
    expect(field.mesh.material).toBe(field.material);
    // Layer 1 keeps the field out of the cat's contact-shadow depth pass.
    expect(field.mesh.layers.mask).toBe(2);
    expect(field.geometry.groups).toEqual([]);
    expect(Array.isArray(field.mesh.material)).toBe(false);
    expect(field.material.vertexColors).toBe(true);
    expect(field.material.transparent).toBe(false);
    expect(field.material.opacity).toBe(1);
    expect(field.geometry).not.toBe(other.geometry);
    expect(field.material).not.toBe(other.material);

    // One cheap draw: 4 plate vertices plus 34 line strips, never the voxel room.
    expect(field.geometry.getAttribute("position").count).toBe(4 * QUADS);
    expect(field.geometry.getIndex()!.count).toBe(6 * QUADS);

    field.geometry.computeBoundingBox();
    const box = field.geometry.boundingBox!;
    // Buffers are Float32, so the extents are exact to single precision only.
    expect(box.min.x).toBeCloseTo(-FIELD_HALF, 5);
    expect(box.max.x).toBeCloseTo(FIELD_HALF, 5);
    expect(box.min.z).toBeCloseTo(-FIELD_HALF, 5);
    expect(box.max.z).toBeCloseTo(FIELD_HALF, 5);
    // S1: nothing stands on the field. Walls, baseboards and the window are gone;
    // the tallest thing left is a painted lattice line.
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(box.max.y).toBeCloseTo(FIELD_LINE_LIFT, 5);

    const geometryDisposed = vi.fn();
    const materialDisposed = vi.fn();
    const otherDisposed = vi.fn();
    field.geometry.addEventListener("dispose", geometryDisposed);
    field.material.addEventListener("dispose", materialDisposed);
    other.geometry.addEventListener("dispose", otherDisposed);
    field.dispose();
    field.dispose();
    expect(geometryDisposed).toHaveBeenCalledTimes(1);
    expect(materialDisposed).toHaveBeenCalledTimes(1);
    expect(otherDisposed).not.toHaveBeenCalled();
  } finally {
    field.dispose();
    other.dispose();
  }
});

it("paints the flat plate upward and bakes the two field colours as vertex colours", () => {
  const field = createField();
  try {
    const position = field.geometry.getAttribute("position");
    const color = field.geometry.getAttribute("color");
    const index = field.geometry.getIndex()!;
    expect(color.count).toBe(position.count);
    expect(field.geometry.getAttribute("normal")).toBeUndefined();

    const ground = new Color(FIELD_PALETTE.ground);
    const line = new Color(FIELD_PALETTE.line);
    const expected = (quad: number) => (quad === 0 ? ground : line);
    const seen = { ground: 0, line: 0 };
    for (let quad = 0; quad < QUADS; quad++) {
      const base = quad * 4;
      for (let corner = 0; corner < 4; corner++) {
        const actual = [color.getX(base + corner), color.getY(base + corner), color.getZ(base + corner)];
        const target = expected(quad);
        // Unlit material: the renderer emits this exact sRGB value, which is what
        // lets the CSS placeholder use the very same green (S6).
        actual.forEach((channel, axis) => expect(channel).toBeCloseTo(target.toArray()[axis], 6));
      }
      seen[quad === 0 ? "ground" : "line"]++;
    }
    expect(seen).toEqual({ ground: 1, line: 2 * (FIELD_SIZE + 1) });

    // Every triangle faces up: a plate, not a room.
    let upward = 0;
    for (let triangle = 0; triangle < index.count; triangle += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(position, index.getX(triangle + k)));
      const normal = b.clone().sub(a).cross(c.clone().sub(a));
      expect(normal.y).toBeGreaterThan(0);
      expect(Math.abs(normal.x)).toBeLessThan(1e-9);
      expect(Math.abs(normal.z)).toBeLessThan(1e-9);
      upward++;
    }
    expect(upward).toBe(QUADS * 2);
  } finally {
    field.dispose();
  }
});

it("spaces the visible lattice one line per cell across all 16 tiles (S2)", () => {
  const field = createField();
  try {
    const position = field.geometry.getAttribute("position");
    const centres: { x: number[]; z: number[] } = { x: [], z: [] };
    const inset = (k: number) => {
      const orthogonal = -FIELD_HALF + k * CELL_SIZE;
      if (k === 0) return -FIELD_HALF + FIELD_LINE_HALF;
      if (k === FIELD_SIZE) return FIELD_HALF - FIELD_LINE_HALF;
      return orthogonal;
    };
    const expected = Array.from({ length: FIELD_SIZE + 1 }, (_, k) => inset(k));
    for (let quad = 1; quad < QUADS; quad++) {
      const base = (quad - 1) * 4 + 4;
      const x = [0, 1, 2, 3].map((corner) => position.getX(base + corner));
      const z = [0, 1, 2, 3].map((corner) => position.getZ(base + corner));
      const widthX = Math.max(...x) - Math.min(...x);
      const widthZ = Math.max(...z) - Math.min(...z);
      if (widthX < widthZ) centres.x.push((Math.max(...x) + Math.min(...x)) / 2);
      else centres.z.push((Math.max(...z) + Math.min(...z)) / 2);
    }
    const sorted = (values: number[]) => values.sort((a, b) => a - b);
    expect(centres.x).toHaveLength(expected.length);
    expect(centres.z).toHaveLength(expected.length);
    sorted(centres.x).forEach((value, index) => expect(value).toBeCloseTo(expected[index], 5));
    sorted(centres.z).forEach((value, index) => expect(value).toBeCloseTo(expected[index], 5));
    // 16 tiles means 17 lines per direction, one cell apart in the interior.
    const interior = expected.slice(1, -1);
    for (let k = 1; k < interior.length; k++) expect(interior[k] - interior[k - 1]).toBeCloseTo(CELL_SIZE, 9);
  } finally {
    field.dispose();
  }
});

it("exposes one ground colour and one lattice colour, and the CSS placeholder reuses them (S1/S6)", () => {
  // No wall, baseboard or window surface survives in the default world palette.
  expect(Object.keys(FIELD_PALETTE).sort()).toEqual(["ground", "line"]);
  const backdrop = declarations(".fieldBackdrop");
  expect(backdrop).toContain(`--field-ground: ${FIELD_PALETTE.ground};`);
  expect(backdrop).toContain(`--field-line: ${FIELD_PALETTE.line};`);
  expect(declarations(".fieldPlate")).toMatch(/fill:\s*var\(--field-ground\)/);
  expect(declarations(".fieldLine")).toMatch(/stroke:\s*var\(--field-line\)/);
});
