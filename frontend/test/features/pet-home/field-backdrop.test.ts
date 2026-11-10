import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import {
  fieldBackdropGeometry,
  latticePathData,
  platePointsAttribute,
  type FramePoint,
} from "@/features/pet-home/field-backdrop";
import {
  dioramaCameraPose,
  FIELD_VIEW,
  overviewFraming,
  type Vec3,
} from "@/features/pet-home/field-view";
import { FIELD_HALF, FIELD_SIZE } from "@/features/pet-home/room-grid";
import { CAT_MODEL_SCALE, PET_FRAME, catGroundY } from "@/features/pet-home/pet-layout";

const PLATE_Y = catGroundY(CAT_MODEL_SCALE);
const homePose = () =>
  dioramaCameraPose({
    ...overviewFraming(),
    yawDeg: FIELD_VIEW.yawDeg,
    elevationDeg: FIELD_VIEW.elevationDeg,
  });

/** Independent reference: project with the renderer's own perspective camera. */
function referenceFramePoint(pose: { position: Vec3; target: Vec3 }, point: Vec3): FramePoint {
  const camera = new PerspectiveCamera(
    FIELD_VIEW.fovDeg,
    PET_FRAME.aspectWidth / PET_FRAME.aspectHeight,
    0.05,
    200,
  );
  camera.position.fromArray([...pose.position]);
  camera.lookAt(new Vector3().fromArray([...pose.target]));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const projected = new Vector3().fromArray([...point]).project(camera);
  return { x: (projected.x + 1) * 50, y: (1 - projected.y) * 50 };
}

const corner = (x: number, z: number): Vec3 => [x, PLATE_Y, z];

/** Convex point containment with a consistent winding, as SVG fills it. */
function insidePlate(point: FramePoint, plate: readonly FramePoint[]) {
  let sign = 0;
  for (let index = 0; index < plate.length; index++) {
    const a = plate[index];
    const b = plate[(index + 1) % plate.length];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) < 1e-9) continue;
    const current = Math.sign(cross);
    if (sign === 0) sign = current;
    else if (current !== sign) return false;
  }
  return true;
}

describe("loading placeholder geometry (S6: the loading field and the loaded field share framing)", () => {
  it("projects the plate with the same pinhole camera the field is rendered with", () => {
    const pose = homePose();
    const { plate } = fieldBackdropGeometry(pose, PLATE_Y);
    // The far corner is the authored top anchor of the overview framing: it lands
    // on the upper NDC band, which keeps a margin of sky above the field.
    const far = referenceFramePoint(pose, corner(-FIELD_HALF, -FIELD_HALF));
    expect(far.y).toBeCloseTo((1 - FIELD_VIEW.upperNdcY) * 50, 6);
    expect(plate[0].x).toBeCloseTo(far.x, 1);
    expect(plate[0].y).toBeCloseTo(far.y, 1);
    // The plate runs under the camera, so it is closed at the camera plane and
    // stays a convex silhouette of 4–5 vertices.
    expect(plate.length).toBeGreaterThanOrEqual(4);
    expect(plate.length).toBeLessThanOrEqual(5);
    for (const point of plate) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
    // The two shoulders are the projected side corners of the plate.
    expect(plate[1].x).toBeCloseTo(referenceFramePoint(pose, corner(FIELD_HALF, -FIELD_HALF)).x, 1);
    expect(plate.at(-1)!.x).toBeCloseTo(referenceFramePoint(pose, corner(-FIELD_HALF, FIELD_HALF)).x, 1);
    // The field covers the whole bottom of the frame (no visible near edge, so it
    // reads as an open field) and leaves sky only above the far corner.
    for (const point of [{ x: 50, y: 99 }, { x: 1, y: 99 }, { x: 99, y: 99 }, { x: 50, y: 60 }]) {
      expect(insidePlate(point, plate)).toBe(true);
    }
    for (const point of [{ x: 50, y: 1 }, { x: 1, y: 1 }, { x: 99, y: 1 }]) {
      expect(insidePlate(point, plate)).toBe(false);
    }
  });

  it("draws one lattice line per cell edge as a single path (17 + 17 segments)", () => {
    const { lattice } = fieldBackdropGeometry(homePose(), PLATE_Y);
    expect(lattice).toHaveLength(2 * (FIELD_SIZE + 1));
    for (const segment of lattice) {
      expect(Number.isFinite(segment.from.x)).toBe(true);
      expect(Number.isFinite(segment.from.y)).toBe(true);
      expect(segment.from).not.toEqual(segment.to);
    }
    const path = latticePathData(lattice);
    expect((path.match(/M /g) ?? [])).toHaveLength(2 * (FIELD_SIZE + 1));
    expect((path.match(/L /g) ?? [])).toHaveLength(2 * (FIELD_SIZE + 1));
    // The lattice spans the whole plate, well past every edge of the frame.
    const xs = lattice.flatMap((segment) => [segment.from.x, segment.to.x]);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(100);
  });

  it("serialises the plate as an SVG points attribute in frame percentages", () => {
    const { plate } = fieldBackdropGeometry(homePose(), PLATE_Y);
    const attribute = platePointsAttribute(plate);
    expect(attribute.split(" ")).toHaveLength(plate.length);
    for (const pair of attribute.split(" ")) {
      const [x, y] = pair.split(",").map(Number);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
    expect(attribute.startsWith(`${plate[0].x.toFixed(2)},${plate[0].y.toFixed(2)}`)).toBe(true);
  });
});
