import { CAT_ANATOMY } from "./cat-anatomy";
import { CAT_MODEL_SCALE, PET_FRAME, catGroundY, catPartWorldY } from "./pet-layout";
import { FIELD_HALF } from "./room-grid";

/** Three-free home-camera contract (S1/S2).
 *
 * The open field is framed by the same bounded three-quarter diorama as the old
 * room: yaw 45° ±20°, elevation 35°, one bounded focus tween. Keeping this module
 * free of `three` lets the pre-3D loading placeholder project the plate with the
 * very same camera (`projectToFrame`, S6) without pulling the 3D chunk into the
 * placeholder bundle.
 */
export type Vec3 = readonly [number, number, number];

export const FIELD_VIEW = {
  fovDeg: 35,
  yawDeg: 45,
  yawLimitDeg: 20,
  yawStepDeg: 10,
  elevationDeg: 35,
  elevationLimitDeg: 5,
  zoomRange: [0.8, 1.2] as readonly [number, number],
  zoomStep: 0.1,
  focusMs: 250,
  /** Paws land on the lower third; the field's far corner keeps a 10% top margin. */
  lowerNdcY: -0.45,
  upperNdcY: 0.9,
  /** Head close-up after a cat tap: symmetric band, so the visible face is
   * framed with the eyes just under the centre and the ear tips in frame. */
  focusLowerNdcY: -0.62,
  focusUpperNdcY: 0.62,
} as const;

const WORLD_UP: Vec3 = [0, 1, 0];

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]);
  return length === 0 ? [0, 0, 0] : [a[0] / length, a[1] / length, a[2] / length];
}

/** Unit vector from the orbit target back to the camera. */
export function dioramaDirection(yawDeg: number, elevationDeg: number): Vec3 {
  const yaw = (yawDeg * Math.PI) / 180;
  const elevation = (elevationDeg * Math.PI) / 180;
  return [
    Math.sin(yaw) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(yaw) * Math.cos(elevation),
  ];
}

/** Camera up axis for a look-at with world up, independent of the target. */
function dioramaUp([dx, dy, dz]: Vec3): Vec3 {
  const x = -dx * dy;
  const y = 1 - dy * dy;
  const z = -dz * dy;
  return normalize([x, y, z]);
}

export type DioramaFraming = {
  radius: number;
  targetX: number;
  targetY: number;
  targetZ: number;
};

/** Solves the camera distance and target height that put `lower` at `lowerNdcY`
 * and `upper` at `upperNdcY` in the 4:5 frame. NDC y projects a point as
 * `(P - T)·up / (tan(fov/2) * (R - (P - T)·dir))`, which is linear in R and the
 * target height, so the two anchors give one exact 2×2 solution.
 */
export function solveDioramaFraming(input: {
  lower: Vec3;
  upper: Vec3;
  yawDeg: number;
  elevationDeg: number;
  lowerNdcY: number;
  upperNdcY: number;
  targetX?: number;
  targetZ?: number;
  fovDeg?: number;
}): DioramaFraming {
  const dir = dioramaDirection(input.yawDeg, input.elevationDeg);
  const up = dioramaUp(dir);
  const tan = Math.tan(((input.fovDeg ?? FIELD_VIEW.fovDeg) * Math.PI) / 360);
  const origin: Vec3 = [input.targetX ?? 0, 0, input.targetZ ?? 0];
  const row = (point: Vec3, ndcY: number) => {
    const offset = sub(point, origin);
    const k = ndcY * tan;
    return {
      s: dot(offset, up) + k * dot(offset, dir),
      c: up[1] + k * dir[1],
      k,
    };
  };
  const lower = row(input.lower, input.lowerNdcY);
  const upper = row(input.upper, input.upperNdcY);
  const radius = (lower.s * upper.c - upper.s * lower.c) /
    (lower.k * upper.c - upper.k * lower.c);
  return {
    radius,
    targetX: origin[0],
    targetY: (lower.s - lower.k * radius) / lower.c,
    targetZ: origin[2],
  };
}

const partById = (id: string) => {
  const part = CAT_ANATOMY.find((candidate) => candidate.id === id);
  if (!part) throw new RangeError(`Missing canonical cat part: ${id}`);
  return part;
};
const frontPaw = partById("pawFL");
const headPart = partById("head");
const earPart = partById("earL");
const eyePart = partById("eyeL");

/** World anchor of the field's far (north-west) corner, at the plate surface.
 * Low yaw values keep this corner the highest point of the plate in frame.
 */
export const FAR_FIELD_CORNER: Vec3 = [-FIELD_HALF, 0, -FIELD_HALF];

/** Whole diorama: the open 16 × 16 field and the rig paw plane.
 *
 * S1 removed the walls, so the overview band is no longer anchored on a wall
 * top: the far corner of the plate defines the top of the frame and the plate
 * runs past the sides and the bottom, which reads as an open field instead of a
 * small rug. The paw plane still sits on the lower third, and at this radius the
 * cat covers ~30% of the frame height, more than the walled room did.
 */
export function overviewFraming(modelScale: number = CAT_MODEL_SCALE): DioramaFraming {
  const floorY = catGroundY(modelScale);
  return solveDioramaFraming({
    lower: [0, floorY, frontPaw.position[2] * modelScale],
    upper: [FAR_FIELD_CORNER[0], floorY, FAR_FIELD_CORNER[2]],
    yawDeg: FIELD_VIEW.yawDeg,
    elevationDeg: FIELD_VIEW.elevationDeg,
    lowerNdcY: FIELD_VIEW.lowerNdcY,
    upperNdcY: FIELD_VIEW.upperNdcY,
  });
}

/** Head close-up after a cat tap: anchor the visible face (the head's front
 * plane, not its mid plane) on the lower band and the ear tips on the upper
 * band, so the whole head stays inside the frame with the eyes readable just
 * under the centre. Anchors come from the rig root via `catPartWorldY`; taking
 * them from the paw plane was the defect that pushed the head out of frame.
 */
export function focusFraming(modelScale: number = CAT_MODEL_SCALE): DioramaFraming {
  const faceZ = (headPart.position[2] + headPart.args[2] / 2) * modelScale;
  return solveDioramaFraming({
    lower: [0, catPartWorldY(headPart.position[1] - headPart.args[1] / 2, modelScale), faceZ],
    upper: [
      0,
      catPartWorldY(earPart.position[1] + earPart.args[1] / 2, modelScale),
      earPart.position[2] * modelScale,
    ],
    yawDeg: FIELD_VIEW.yawDeg,
    elevationDeg: FIELD_VIEW.elevationDeg,
    lowerNdcY: FIELD_VIEW.focusLowerNdcY,
    upperNdcY: FIELD_VIEW.focusUpperNdcY,
    // Look straight at the eye plane, or the face slides to the frame edge.
    targetZ: eyePart.position[2] * modelScale,
  });
}

/** The resolved home camera state: the frame the viewer applies and the frame the
 * loading backdrop projects against stay one single source of truth (S6). */
export type HomeCameraView = DioramaFraming & { yawDeg: number };

export function homeCameraView(input: {
  yawDeg: number;
  zoom: number;
  focus: boolean;
  modelScale?: number;
}): HomeCameraView {
  const base = input.focus ? focusFraming(input.modelScale) : overviewFraming(input.modelScale);
  return { ...base, radius: resolveDioramaRadius(base.radius, input.zoom), yawDeg: input.yawDeg };
}

export function nextDioramaYaw(current: number, step: number): number {
  if (!Number.isFinite(step)) return current;
  const next = current + step;
  const minimum = FIELD_VIEW.yawDeg - FIELD_VIEW.yawLimitDeg;
  const maximum = FIELD_VIEW.yawDeg + FIELD_VIEW.yawLimitDeg;
  return Math.min(maximum, Math.max(minimum, next));
}

export function nextDioramaZoom(current: number, step: number): number {
  if (!Number.isFinite(step)) return current;
  const next = current + step;
  return Math.min(FIELD_VIEW.zoomRange[1], Math.max(FIELD_VIEW.zoomRange[0], next));
}

export function resolveDioramaRadius(baseRadius: number, zoom: number): number {
  const clamped = Math.min(FIELD_VIEW.zoomRange[1], Math.max(FIELD_VIEW.zoomRange[0], zoom));
  return baseRadius * clamped;
}

/** 0 → 1 over `focusMs`; reduced motion cuts straight to the final camera. */
export function tweenProgress(startedAt: number, now: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  const elapsed = now - startedAt;
  if (!Number.isFinite(elapsed) || elapsed >= FIELD_VIEW.focusMs) return 1;
  return Math.max(0, elapsed / FIELD_VIEW.focusMs);
}

export function dioramaCameraPose(
  framing: DioramaFraming & { yawDeg: number; elevationDeg: number },
): { position: Vec3; target: Vec3 } {
  const dir = dioramaDirection(framing.yawDeg, framing.elevationDeg);
  return {
    position: [
      framing.targetX + dir[0] * framing.radius,
      framing.targetY + dir[1] * framing.radius,
      framing.targetZ + dir[2] * framing.radius,
    ],
    target: [framing.targetX, framing.targetY, framing.targetZ],
  };
}

/** A point in the authored 4:5 home frame, as percentages from the top-left. */
export type FramePoint = { x: number; y: number };

/** Projects a world point through the same pinhole camera the renderer uses.
 * Returns `null` for points behind the camera plane.
 */
export function projectToFrame(
  point: Vec3,
  pose: { position: Vec3; target: Vec3 },
  fovDeg: number = FIELD_VIEW.fovDeg,
): FramePoint | null {
  const zAxis = normalize(sub(pose.position, pose.target));
  const xAxis = normalize(cross(WORLD_UP, zAxis));
  const yAxis = cross(zAxis, xAxis);
  const toPoint = sub(point, pose.position);
  const depth = -dot(toPoint, zAxis);
  if (!(depth > 1e-6)) return null;
  const tan = Math.tan(((fovDeg * Math.PI) / 360));
  const aspect = PET_FRAME.aspectWidth / PET_FRAME.aspectHeight;
  const ndcX = dot(toPoint, xAxis) / (depth * tan * aspect);
  const ndcY = dot(toPoint, yAxis) / (depth * tan);
  return { x: (ndcX + 1) * 50, y: (1 - ndcY) * 50 };
}
