import { CAT_JOINT_IDS, CAT_POSE_IDS, CAT_POSES, compileCatPose } from "./cat-pose-data";
import { CAT_POSE_EDGES, findCatPoseRoute, sampleCatPoseTransition } from "./cat-pose-graph";
import type { CatPoseId, CompiledCatPose } from "./cat-pose-types";

export const BASE_SIZE = CAT_JOINT_IDS.length * 4 + 4;
const extensions = ["forearmFL", "forearmFR", "shinBL", "shinBR", "jaw", "tongue"] as const;
const legs = ["FL", "FR", "BL", "BR"] as const;
export type StablePose = {
  base: Float64Array;
  visible: number;
  supports: number;
  /** Optional setup-authored stable FK; it never changes Core's base pose. */
  breathFK?: PoseBreathFK;
  mirroredBreathFK?: PoseBreathFK;
};
export const stable = {} as Record<CatPoseId, StablePose>;
const compiled = {} as Record<CatPoseId, CompiledCatPose>;
function pack(pose: CompiledCatPose, output: Float64Array, offset = 0) {
  for (let i = 0; i < CAT_JOINT_IDS.length; i++) {
    const q = pose.rotations[CAT_JOINT_IDS[i]];
    for (let j = 0; j < 4; j++) output[offset + i * 4 + j] = q[j];
  }
  for (let i = 0; i < 3; i++) output[offset + 88 + i] = pose.rootOffset[i];
  output[offset + 91] = pose.headingDeg;
}
for (const id of CAT_POSE_IDS) {
  compiled[id] = compileCatPose(CAT_POSES[id]);
  const base = new Float64Array(BASE_SIZE);
  pack(compiled[id], base);
  stable[id] = {
    base,
    visible: extensions.reduce((mask, part, i) => mask | (compiled[id].visibleParts.includes(part) ? 1 << i : 0), 0),
    supports: legs.reduce((mask, leg, i) => mask | (compiled[id].supports.includes(leg) ? 1 << i : 0), 0),
  };
}
/** Cached FK samples; breathing stays additive and never enters Core.base. */
export type PoseBreathFK = {
  minimum: number;
  maximum: number;
  jointMask: number;
  variants: readonly Float64Array[];
};
export type PoseTrack = {
  from: CatPoseId;
  to: CatPoseId;
  duration: number;
  frames: Float64Array;
  phaseEnds: readonly number[];
  /** Optional per-fixed-tick posture-extension mask, authored with a rig track. */
  visibility?: Uint8Array;
  /** Setup-authored local body expansion pivot, sampled with the FK track. */
  breathAnchors?: Float64Array;
  breathFK?: PoseBreathFK;
};
export const tracks = {} as Record<CatPoseId, Partial<Record<CatPoseId, PoseTrack>>>;
export const routes = {} as Record<CatPoseId, Record<CatPoseId, readonly CatPoseId[]>>;
for (const from of CAT_POSE_IDS) {
  tracks[from] = {};
  routes[from] = {} as Record<CatPoseId, readonly CatPoseId[]>;
  for (const to of CAT_POSE_IDS) routes[from][to] = findCatPoseRoute(from, to);
}
for (const edge of CAT_POSE_EDGES) {
  const frames = new Float64Array((edge.durationTicks + 1) * BASE_SIZE);
  for (let tick = 0; tick <= edge.durationTicks; tick++) {
    pack(sampleCatPoseTransition(compiled[edge.from], compiled[edge.to], edge, tick / edge.durationTicks), frames, tick * BASE_SIZE);
  }
  tracks[edge.from][edge.to] = {
    from: edge.from, to: edge.to, duration: edge.durationTicks, frames,
    phaseEnds: [...new Set([...edge.waypoints.map(point => Math.round(point.at * edge.durationTicks)), edge.durationTicks])].sort((a, b) => a - b),
  };
}

/** Renderer-free lookup boundary. Omitted injection retains these exact tables. */
export type CatPoseLibrary = { stable: typeof stable; tracks: typeof tracks; routes: typeof routes; playJumpFK?: PoseBreathFK };
export const CAT_POSE_LIBRARY: CatPoseLibrary = { stable, tracks, routes };
