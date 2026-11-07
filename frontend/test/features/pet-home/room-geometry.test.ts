import { expect, it, vi } from "vitest";
import { Color, PerspectiveCamera, Raycaster, Vector3 } from "three";
import { createRoom, isRugVoxel, ROOM_SOLIDS, ROOM_PALETTE, ROOM_WALL_HEIGHT, VOXEL_SIZE } from "@/features/pet-home/room-geometry";
import { ROOM_LENGTH, cellCenter, pointToCell } from "@/features/pet-home/room-grid";

it("builds one caller-owned opaque mesh with no groups, caches, or shared resources", () => {
  const room = createRoom();
  const other = createRoom();
  try {
    expect(room.mesh.geometry).toBe(room.geometry);
    expect(room.mesh.material).toBe(room.material);
    expect(room.mesh.layers.mask).toBe(2);
    expect(room.geometry.groups).toEqual([]);
    expect(room.material.vertexColors).toBe(true);
    expect(room.material.transparent).toBe(false);
    expect(room.material.opacity).toBe(1);
    expect(room.geometry.getAttribute("position").count).toBe(room.geometry.getAttribute("color").count);
    expect(room.geometry).not.toBe(other.geometry);
    expect(room.material).not.toBe(other.material);
    room.geometry.computeBoundingBox();
    // The wall height is an art choice; the rule is that the mesh tops out exactly at it.
    expect(room.geometry.boundingBox!.max.y).toBeCloseTo(ROOM_WALL_HEIGHT, 6);
    const geometryDisposed = vi.fn();
    const materialDisposed = vi.fn();
    const otherDisposed = vi.fn();
    room.geometry.addEventListener("dispose", geometryDisposed);
    room.material.addEventListener("dispose", materialDisposed);
    other.geometry.addEventListener("dispose", otherDisposed);
    room.dispose();
    room.dispose();
    expect(geometryDisposed).toHaveBeenCalledTimes(1);
    expect(materialDisposed).toHaveBeenCalledTimes(1);
    expect(otherDisposed).not.toHaveBeenCalled();
  } finally { room.dispose(); other.dispose(); }
}, 20000);

it("bakes real exposed-face AO, corner darkening, seamless coplanar edges and chosen diagonals", () => {
  const room = createRoom();
  try {
    const position = room.geometry.getAttribute("position");
    const normal = room.geometry.getAttribute("normal");
    const color = room.geometry.getAttribute("color");
    const index = room.geometry.getIndex()!;
    const step = VOXEL_SIZE;
    const occupied = (p: Vector3) => ROOM_SOLIDS.some((s) => p.toArray().every((n, axis) => n / step > s.min[axis] + 1e-4 && n / step < s.max[axis] - 1e-4));
    const seen = new Map<string, number[]>();
    const levels = new Set<number>();
    const surfaces = new Set<string>();
    let seamChecks = 0;
    let flips = 0;
    let colorErrors = 0;
    let seamErrors = 0;
    let indexErrors = 0;
    let hiddenFaces = 0;
    for (let start = 0; start < position.count; start += 4) {
      const points = [0, 1, 2, 3].map((k) => new Vector3().fromBufferAttribute(position, start + k));
      const n = new Vector3().fromBufferAttribute(normal, start);
      const u = points[1].clone().sub(points[0]).normalize();
      const v = points[3].clone().sub(points[0]).normalize();
      const center = points[0].clone().add(points[2]).multiplyScalar(0.5).addScaledVector(n, -step / 2);
      const solid: { surface: keyof typeof ROOM_PALETTE } = isRugVoxel(
      Math.floor(center.x / step), Math.floor(center.y / step), Math.floor(center.z / step))
      ? { surface: "rug" }
      : [...ROOM_SOLIDS].reverse().find((s) => center.toArray().every((p, axis) => p / step > s.min[axis] + 1e-4 && p / step < s.max[axis] - 1e-4))!;
      if (!solid) throw new Error("Face has no procedural solid owner");
      surfaces.add(solid.surface);
      const base = new Color(ROOM_PALETTE[solid.surface]);
      const ao = points.map((p, corner) => {
        const su = corner === 0 || corner === 3 ? -1 : 1;
        const sv = corner < 2 ? -1 : 1;
        const sample = (a: number, b: number) => occupied(p.clone().addScaledVector(n, step / 2).addScaledVector(u, a * step / 2).addScaledVector(v, b * step / 2));
        const s1 = sample(su, -sv), s2 = sample(-su, sv), diagonal = sample(su, sv);
        const level = s1 && s2 ? 0 : 3 - Number(s1) - Number(s2) - Number(diagonal);
        levels.add(level);
        const actual = [color.getX(start + corner), color.getY(start + corner), color.getZ(start + corner)];
        base.toArray().forEach((channel, axis) => {
          if (Math.abs(actual[axis] - channel * [0.55, 0.7, 0.85, 1][level]) > 1e-6) colorErrors++;
        });
        const key = `${p.toArray().map((x) => x.toFixed(5))}/${n.toArray()}/${solid.surface}`;
        const previous = seen.get(key);
        if (previous) {
          if (actual.some((value, axis) => value !== previous[axis])) seamErrors++;
          seamChecks++;
        }
        seen.set(key, actual);
        return level;
      });
      const flipped = ao[0] + ao[2] > ao[1] + ao[3];
      if (flipped) flips++;
      const expected = flipped ? [0, 1, 3, 1, 2, 3] : [0, 1, 2, 0, 2, 3];
      if (expected.some((value, k) => index.getX(start / 4 * 6 + k) - start !== value)) indexErrors++;
      if (occupied(center.clone().addScaledVector(n, step))) hiddenFaces++;
    }
    expect({ colorErrors, seamErrors, indexErrors, hiddenFaces }).toEqual({ colorErrors: 0, seamErrors: 0, indexErrors: 0, hiddenFaces: 0 });
    expect([...levels].sort()).toEqual([0, 1, 2, 3]);
    expect([...surfaces].sort()).toEqual(Object.keys(ROOM_PALETTE).sort());
    expect(seamChecks).toBeGreaterThan(100);
    expect(flips).toBeGreaterThan(0);
  } finally { room.dispose(); }
}, 20000);

it("is excluded by mask1, included by mask3, and raycasts the Y0 floor back into the grid", () => {
  const room = createRoom();
  try {
    const main = new PerspectiveCamera();
    main.layers.enable(1);
    const shadow = new PerspectiveCamera();
    expect(main.layers.mask).toBe(3);
    expect(main.layers.test(room.mesh.layers)).toBe(true);
    expect(shadow.layers.mask).toBe(1);
    expect(shadow.layers.test(room.mesh.layers)).toBe(false);
    const center = cellCenter(4, 4)!;
    room.mesh.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(center.x, ROOM_LENGTH, center.z), new Vector3(0, -1, 0));
    expect(ray.intersectObject(room.mesh)).toEqual([]);
    ray.layers.enable(1);
    expect(ray.layers.mask).toBe(3);
    const hit = ray.intersectObject(room.mesh)[0];
    expect(hit).toBeDefined();
    expect(hit.point.y).toBeCloseTo(0, 7);
    hit.face!.normal.toArray().forEach((value, axis) => expect(value).toBeCloseTo([0, 1, 0][axis], 14));
    expect(pointToCell(hit.point)).toEqual({ i: 4, j: 4 });
  } finally { room.dispose(); }
});
