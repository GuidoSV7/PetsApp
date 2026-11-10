import { CELL_SIZE, FIELD_HALF, FIELD_LINE_HALF, FIELD_SIZE } from "./room-grid";
import { projectToFrame, type FramePoint, type Vec3 } from "./field-view";

export type { FramePoint };

/** Three-free projection of the field plate into the authored 4:5 home frame.
 *
 * S6: the stage must never show an empty green rectangle while the 3D chunk and
 * the first WebGL frame arrive. The loading placeholder paints this plate (and its
 * lattice) with the same camera pose the field is rendered with, so arriving at
 * the field is not a visual jump.
 */
export type FieldBackdropGeometry = {
  /** Plate silhouette in frame percentages, seen from above the north-west corner.
   * Closed at the camera's near plane, because the plate runs under the camera. */
  plate: readonly FramePoint[];
  /** One segment per painted lattice line, in frame percentages. */
  lattice: readonly { from: FramePoint; to: FramePoint }[];
};

/** Camera plane used for clipping; matches the home camera's `near`. */
const NEAR_PLANE = 0.05;

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** The plate runs under and past the camera, so its near corner sits behind the
 * camera plane and cannot be projected. Clipping in world space first keeps the
 * silhouette faithful instead of producing a mirrored artefact.
 */
function nearPlaneClipper(pose: { position: Vec3; target: Vec3 }) {
  const forward = sub(pose.target, pose.position);
  const length = Math.hypot(forward[0], forward[1], forward[2]);
  const unit = [forward[0] / length, forward[1] / length, forward[2] / length] as Vec3;
  const depth = (point: Vec3) => dot(sub(point, pose.position), unit);
  const clip = (points: readonly Vec3[]): Vec3[] => {
    const clipped: Vec3[] = [];
    for (let index = 0; index < points.length; index++) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const from = depth(current);
      const to = depth(next);
      if (from >= NEAR_PLANE) clipped.push(current);
      if ((from >= NEAR_PLANE) !== (to >= NEAR_PLANE)) {
        clipped.push(lerp(current, next, (NEAR_PLANE - from) / (to - from)));
      }
    }
    return clipped;
  };
  const clipSegment = (a: Vec3, b: Vec3): { from: Vec3; to: Vec3 } | null => {
    const dA = depth(a);
    const dB = depth(b);
    if (dA < NEAR_PLANE && dB < NEAR_PLANE) return null;
    const from = dA < NEAR_PLANE ? lerp(a, b, (NEAR_PLANE - dA) / (dB - dA)) : a;
    const to = dB < NEAR_PLANE ? lerp(a, b, (NEAR_PLANE - dA) / (dB - dA)) : b;
    return { from, to };
  };
  return { clip, clipSegment };
}

/** `plateY` is the world Y of the plate surface: the same rig ground the 3D field
 * mesh is positioned on, so the placeholder and the field share framing exactly.
 */
export function fieldBackdropGeometry(
  pose: { position: Vec3; target: Vec3 },
  plateY: number,
): FieldBackdropGeometry {
  const { clip, clipSegment } = nearPlaneClipper(pose);
  const project = (point: Vec3): FramePoint => {
    const projected = projectToFrame(point, pose);
    // Everything reaching this point is in front of the clipped near plane.
    return projected ?? { x: 0, y: 0 };
  };
  const plate = clip([
    [-FIELD_HALF, plateY, -FIELD_HALF],
    [FIELD_HALF, plateY, -FIELD_HALF],
    [FIELD_HALF, plateY, FIELD_HALF],
    [-FIELD_HALF, plateY, FIELD_HALF],
  ]).map(project);

  const lattice: { from: FramePoint; to: FramePoint }[] = [];
  for (let edge = 0; edge <= FIELD_SIZE; edge++) {
    const orthogonal = -FIELD_HALF + edge * CELL_SIZE;
    const centre = edge === 0
      ? -FIELD_HALF + FIELD_LINE_HALF
      : edge === FIELD_SIZE ? FIELD_HALF - FIELD_LINE_HALF : orthogonal;
    const segments = [
      { from: [centre, plateY, -FIELD_HALF] as Vec3, to: [centre, plateY, FIELD_HALF] as Vec3 },
      { from: [-FIELD_HALF, plateY, centre] as Vec3, to: [FIELD_HALF, plateY, centre] as Vec3 },
    ];
    for (const segment of segments) {
      const visible = clipSegment(segment.from, segment.to);
      if (visible) lattice.push({ from: project(visible.from), to: project(visible.to) });
    }
  }
  return { plate, lattice };
}

/** SVG `points` attribute for the plate, in frame percentages. */
export function platePointsAttribute(plate: readonly FramePoint[]): string {
  return plate.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

/** One SVG path carrying every lattice segment. */
export function latticePathData(
  lattice: readonly { from: FramePoint; to: FramePoint }[],
): string {
  return lattice
    .map(({ from, to }) => `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} L ${to.x.toFixed(2)} ${to.y.toFixed(2)}`)
    .join(" ");
}
