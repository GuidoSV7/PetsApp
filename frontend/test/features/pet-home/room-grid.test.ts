import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { CAT_MODEL_SCALE } from "@/features/pet-home/pet-layout";
import { ROOM_LENGTH, CELL_SIZE, ROOM_HALF, cellCenter, pointToCell, orientationY } from "@/features/pet-home/room-grid";

describe("frozen room grid", () => {
  it("derives L independently from all 33 canonical neutral box corners", () => {
    expect(CAT_ANATOMY).toHaveLength(33);
    const corners = CAT_ANATOMY.flatMap((part) => {
      expect(part.rotation).toBeUndefined();
      expect(part.scale).toBeUndefined();
      return [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => ({
        id: part.id,
        point: part.position.map((p, axis) => p + [x, y, z][axis] * part.args[axis] / 2),
      }))));
    });
    const min = Math.min(...corners.map((c) => c.point[2]));
    const max = Math.max(...corners.map((c) => c.point[2]));
    expect(min).toBeCloseTo(-0.65, 14);
    expect(max).toBeCloseTo(0.52, 14);
    expect([...new Set(corners.filter((c) => c.point[2] === min).map((c) => c.id))].sort()).toEqual(["tailMid", "tailTip"]);
    expect([...new Set(corners.filter((c) => c.point[2] === max).map((c) => c.id))]).toEqual(["nose"]);
    expect(CAT_MODEL_SCALE).toBe(0.78);
    expect(ROOM_LENGTH).toBeCloseTo((max - min) * CAT_MODEL_SCALE, 14);
    expect(ROOM_LENGTH).toBe(0.9126);
    expect(CELL_SIZE).toBe(ROOM_LENGTH / 2);
    expect(ROOM_HALF * 2).toBe(4 * ROOM_LENGTH);
  });

  it("round trips every center with east/north increasing indices", () => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      expect(cellCenter(i, j)).toEqual({ x: -ROOM_HALF + (i + 0.5) * CELL_SIZE, y: 0, z: ROOM_HALF - (j + 0.5) * CELL_SIZE });
      expect(pointToCell(cellCenter(i, j)!)).toEqual({ i, j });
    }
    for (let k = 1; k < 8; k++) {
      expect(pointToCell({ x: -ROOM_HALF + k * CELL_SIZE, z: 0 })).toEqual({ i: k, j: 4 });
      expect(pointToCell({ x: 0, z: ROOM_HALF - k * CELL_SIZE })).toEqual({ i: 4, j: k });
    }
  });

  it("uses half-open outer edges without clamping exterior points", () => {
    expect(pointToCell({ x: -ROOM_HALF, z: ROOM_HALF })).toEqual({ i: 0, j: 0 });
    for (const point of [{ x: ROOM_HALF, z: 0 }, { x: 0, z: -ROOM_HALF }, { x: -ROOM_HALF - Number.EPSILON, z: 0 }, { x: 0, z: ROOM_HALF + Number.EPSILON }]) expect(pointToCell(point)).toBeNull();
    for (const n of [-1, 8, 0.5, NaN, Infinity, -Infinity]) {
      expect(cellCenter(n, 0)).toBeNull();
      expect(cellCenter(0, n)).toBeNull();
    }
    for (const n of [NaN, Infinity, -Infinity]) {
      expect(pointToCell({ x: n, z: 0 })).toBeNull();
      expect(pointToCell({ x: 0, z: n })).toBeNull();
    }
  });

  it("maps application quarter turns to actual Three forward vectors", () => {
    const directions = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]];
    [0, 90, 180, 270].forEach((angle, index) => {
      const forward = new Vector3(0, 0, 1).applyAxisAngle(new Vector3(0, 1, 0), orientationY(angle)!);
      forward.toArray().forEach((n, axis) => expect(n).toBeCloseTo(directions[index][axis], 14));
    });
    for (const n of [-90, 45, 360, NaN, Infinity]) expect(orientationY(n)).toBeNull();
  });
});
