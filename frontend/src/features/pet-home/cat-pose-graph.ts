import { Euler, MathUtils, Quaternion } from "three";
import { CAT_JOINT_IDS, CAT_POSES } from "./cat-pose-data";
import type { CatJointId, CatPoseEdge, CatPoseId, CatPoseWaypoint, CompiledCatPose, PoseQuaternion, PoseVec3 } from "./cat-pose-types";

const front = CAT_JOINT_IDS.filter(id => /shoulder|elbow|wrist/.test(id));
const hind = CAT_JOINT_IDS.filter(id => /hip|knee|ankle/.test(id));
const tail = CAT_JOINT_IDS.filter(id => /tail/.test(id));
function stage(at: number, pose: CatPoseId, joints: readonly CatJointId[], height = false): CatPoseWaypoint {
  return { at, rotationDeg: Object.fromEntries(joints.map(id => [id, CAT_POSES[pose].rotationDeg[id]])),
    ...(height ? { rootOffset: CAT_POSES[pose].rootOffset } : {}) };
}
const roll = (at: number, z: number): CatPoseWaypoint => ({ at, rotationDeg: { "joint-root": [0, 0, z] } });
function edge(from: CatPoseId, to: CatPoseId, durationTicks: number,
  waypoints: readonly CatPoseWaypoint[], easing: CatPoseEdge["easing"] = "smootherstep"): CatPoseEdge {
  return Object.freeze({ from, to, durationTicks, easing, waypoints: Object.freeze(waypoints.map(w => Object.freeze({
    ...w, ...(w.rotationDeg ? { rotationDeg: Object.freeze(Object.fromEntries(Object.entries(w.rotationDeg).map(
      ([id, v]) => [id, Object.freeze([...v])],
    ))) } : {}), ...(w.rootOffset ? { rootOffset: Object.freeze([...w.rootOffset]) as PoseVec3 } : {}),
  }))) });
}

/** Directed only: there is intentionally no sphinx -> standing shortcut. */
export const CAT_POSE_EDGES: readonly CatPoseEdge[] = Object.freeze([
  edge("seated", "standing", 51, [stage(.2, "seated", hind, true), stage(.8, "standing", front)]),
  edge("standing", "seated", 57, [
    stage(.25, "standing", hind), stage(.45, "seated", ["joint-torso"], true),
    stage(.5, "standing", front), stage(.7, "seated", hind),
    stage(.8, "standing", tail), stage(.85, "seated", front),
  ]),
  edge("standing", "sphinx", 54, [stage(.3, "standing", hind), stage(.7, "sphinx", front)]),
  edge("sphinx", "seated", 54, [stage(.35, "seated", ["joint-torso"], true), stage(.8, "seated", hind)]),
  edge("sphinx", "side", 51, [roll(.5, 45), stage(.7, "side", ["joint-head"])], "smoothstep"),
  edge("side", "sphinx", 51, [stage(.2, "sphinx", ["joint-head"]), roll(.5, 45)], "smoothstep"),
  edge("side", "curled", 57, [
    stage(.4, "curled", [...front, ...hind]), stage(.5, "side", tail),
    stage(.65, "curled", ["joint-tailBase"]), stage(.8, "curled", ["joint-tailMid"]),
  ]),
  edge("curled", "side", 57, [stage(.2, "side", ["joint-tailTip"]), stage(.4, "side", tail), stage(.8, "side", [...front, ...hind])]),
  edge("side", "bellyUp", 66, [roll(.5, 135), stage(.65, "side", [...front, ...hind])]),
  edge("bellyUp", "side", 66, [stage(.2, "side", ["joint-head"]), roll(.5, 135)]),
  edge("seated", "loaf", 45, [stage(.6, "loaf", [...front, ...hind], true), stage(.6, "seated", tail)]),
  edge("loaf", "seated", 48, [stage(.3, "seated", tail), stage(.6, "seated", front)]),
  edge("seated", "sphinx", 54, [stage(.35, "sphinx", front), stage(.35, "seated", ["joint-torso"], true)]),
]);

/** Stable breadth-first routing; includes both endpoints, including a singleton stay. */
export function findCatPoseRoute(from: CatPoseId, to: CatPoseId): readonly CatPoseId[] {
  const queue: CatPoseId[][] = [[from]], visited = new Set<CatPoseId>([from]);
  for (let i = 0; i < queue.length; i++) {
    const route = queue[i], last = route[route.length - 1];
    if (last === to) return route;
    for (const e of CAT_POSE_EDGES) if (e.from === last && !visited.has(e.to)) {
      visited.add(e.to); queue.push([...route, e.to]);
    }
  }
  return [];
}

const quaternion = (v: PoseQuaternion) => new Quaternion(...v);
const fromDegrees = (v: PoseVec3): PoseQuaternion => new Quaternion().setFromEuler(
  new Euler(MathUtils.degToRad(v[0]), MathUtils.degToRad(v[1]), MathUtils.degToRad(v[2]), "XYZ"),
).normalize().toArray();
const ease = (t: number, easing: CatPoseEdge["easing"]) => easing === "smoothstep"
  ? t * t * (3 - 2 * t) : t * t * t * (t * (t * 6 - 15) + 10);
type Key<T> = { at: number; value: T };
function interval<T>(keys: readonly Key<T>[], progress: number): readonly [Key<T>, Key<T>] {
  const right = keys.findIndex(k => k.at >= progress);
  return [keys[Math.max(0, right - 1)], keys[Math.max(1, right)]];
}
const lerpVector = (a: PoseVec3, b: PoseVec3, t: number): PoseVec3 => [
  a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t,
];

/** Sparse waypoint tracks hold only the named joints; never Euler-blend rotation deltas.
 * Heading deliberately uses raw progress, independently of local easing/stage timing.
 * Intermediate supports are not declared planted: the integration contact planner owns
 * phase-specific world goals. This sampler alone cannot certify contact or visibility pops.
 */
export function sampleCatPoseTransition(from: CompiledCatPose, to: CompiledCatPose, edge: CatPoseEdge, progress: number): CompiledCatPose {
  const t = Math.max(0, Math.min(1, progress));
  const rotations = Object.fromEntries(CAT_JOINT_IDS.map(id => {
    const keys: Key<PoseQuaternion>[] = [{ at: 0, value: from.rotations[id] }];
    for (const w of edge.waypoints) if (w.rotationDeg?.[id]) keys.push({ at: w.at, value: fromDegrees(w.rotationDeg[id]!) });
    keys.push({ at: 1, value: to.rotations[id] });
    // Guard even inactive intervals: interrupted/custom authoring must insert waypoints.
    for (let i = 1; i < keys.length; i++) if (quaternion(keys[i - 1].value).angleTo(quaternion(keys[i].value)) > MathUtils.degToRad(150) + 1e-10) {
      throw new RangeError(`Joint ${id} exceeds 150 degrees; add an explicit waypoint`);
    }
    const [a, b] = interval(keys, t);
    const local = ease((t - a.at) / (b.at - a.at), edge.easing);
    const q: PoseQuaternion = local === 0 ? [...a.value] : local === 1 ? [...b.value]
      : quaternion(a.value).slerp(quaternion(b.value), local).normalize().toArray();
    return [id, q];
  })) as CompiledCatPose["rotations"];
  const positions: Key<PoseVec3>[] = [{ at: 0, value: from.rootOffset }];
  for (const w of edge.waypoints) if (w.rootOffset) positions.push({ at: w.at, value: w.rootOffset });
  positions.push({ at: 1, value: to.rootOffset });
  const [a, b] = interval(positions, t);
  const endpoint = t === 1 ? to : from;
  return { id: endpoint.id, rotations,
    rootOffset: lerpVector(a.value, b.value, ease((t - a.at) / (b.at - a.at), edge.easing)),
    headingDeg: from.headingDeg + (to.headingDeg - from.headingDeg) * t,
    visibleParts: t === 0 || t === 1 ? [...endpoint.visibleParts] : [...new Set([...from.visibleParts, ...to.visibleParts])],
    supports: t === 0 || t === 1 || from.id === to.id ? [...endpoint.supports] : [],
  };
}
