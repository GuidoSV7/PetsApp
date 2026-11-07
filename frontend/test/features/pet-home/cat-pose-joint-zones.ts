import { Matrix3, Vector3, type Object3D } from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import type { CatSkeleton } from "@/features/pet-home/cat-skeleton";
import { createCatPoseReference } from "@/features/pet-home/cat-pose-reference";

function vertices(box: OBB) {
  return [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => new Vector3(x * box.halfSize.x, y * box.halfSize.y, z * box.halfSize.z).applyMatrix3(box.rotation).add(box.center))));
}
function edges(points: Vector3[]) {
  return points.flatMap((p, i) => [1, 2, 4].filter(bit => !(i & bit)).map(bit => [p, points[i | bit]] as const));
}
function segmentDistance(p: Vector3, q: Vector3, r: Vector3, s: Vector3) {
  const u = q.clone().sub(p), v = s.clone().sub(r), w = p.clone().sub(r);
  const a = u.dot(u), b = u.dot(v), c = u.dot(w), e = v.dot(v), f = v.dot(w), denominator = a * e - b * b;
  const clamp = (t: number) => Math.max(0, Math.min(1, t));
  let x = denominator > 1e-24 ? clamp((b * f - c * e) / denominator) : 0, y = (b * x + f) / e;
  if (y < 0) { y = 0; x = clamp(-c / a); } else if (y > 1) { y = 1; x = clamp((b - c) / a); }
  return p.clone().addScaledVector(u, x).distanceTo(r.clone().addScaledVector(v, y));
}
/** Exact convex-box feature distance: vertex/face and all edge/edge pairs. */
export function boxDistance(a: OBB, b: OBB) {
  if (a.intersectsOBB(b, 1e-12)) return 0;
  const av = vertices(a), bv = vertices(b), scratch = new Vector3(); let distance = Infinity;
  for (const p of av) distance = Math.min(distance, p.distanceTo(b.clampPoint(p, scratch)));
  for (const p of bv) distance = Math.min(distance, p.distanceTo(a.clampPoint(p, scratch)));
  for (const [p, q] of edges(av)) for (const [r, s] of edges(bv)) distance = Math.min(distance, segmentDistance(p, q, r, s));
  return distance;
}
/** Minimum SAT overlap; negative means separated. Not an AABB proxy. */
export function boxOverlap(a: OBB, b: OBB) {
  const axes = (box: OBB) => [0, 1, 2].map(i => new Vector3().fromArray(box.rotation.elements, i * 3));
  const aa = axes(a), ba = axes(b), delta = b.center.clone().sub(a.center); let minimum = Infinity;
  for (const axis of [...aa, ...ba, ...aa.flatMap(x => ba.map(y => x.clone().cross(y)))]) {
    if (axis.lengthSq() < 1e-20) continue; axis.normalize();
    const radius = (box: OBB, basis: Vector3[]) => basis.reduce((sum, v, i) => sum + Math.abs(v.dot(axis)) * box.halfSize.getComponent(i), 0);
    minimum = Math.min(minimum, radius(a, aa) + radius(b, ba) - Math.abs(delta.dot(axis)));
  }
  return minimum;
}

/** Diagnostic intersection arithmetic only; never an S19 pose-acceptance gate. */
export const JOINT_NUMERICAL_EPSILON = 1e-10;
export type JointLink = { parent: string; child: string; pivot: string; source: string };
export type JointZone = JointLink & {
  radius: number | null; vertexCount: number; wholeChild: boolean;
};
export type ZoneRig = {
  skeleton: CatSkeleton; obb(id: string): OBB;
  joints: ReadonlyMap<string, Object3D>; boxes: ReadonlyMap<string, Object3D>;
};
const basis = (box: OBB) => [0, 1, 2].map(i => new Vector3().fromArray(box.rotation.elements, i * 3));
function inside(box: OBB, point: Vector3) {
  const delta = point.clone().sub(box.center);
  return basis(box).every((axis, i) => Math.abs(axis.dot(delta)) <= box.halfSize.getComponent(i) + JOINT_NUMERICAL_EPSILON);
}
/** Vertices of the actual convex intersection, including face/edge contacts. */
export function boxIntersectionVertices(a: OBB, b: OBB): Vector3[] {
  if (boxOverlap(a, b) < -JOINT_NUMERICAL_EPSILON) return [];
  const points: Vector3[] = [], av = vertices(a), bv = vertices(b);
  function add(point: Vector3) {
    if (inside(a, point) && inside(b, point) && !points.some(p => p.distanceToSquared(point) <= JOINT_NUMERICAL_EPSILON ** 2)) points.push(point.clone());
  }
  av.forEach(add); bv.forEach(add);
  for (const [pointsOnBox, other] of [[av, b], [bv, a]] as const) {
    for (const [start, end] of edges(pointsOnBox)) {
      const direction = end.clone().sub(start);
      for (const [i, axis] of basis(other).entries()) {
        const denominator = axis.dot(direction);
        if (Math.abs(denominator) < 1e-15) continue;
        for (const side of [-1, 1]) {
          const t = (axis.dot(other.center.clone().sub(start)) + side * other.halfSize.getComponent(i)) / denominator;
          if (t >= -JOINT_NUMERICAL_EPSILON && t <= 1 + JOINT_NUMERICAL_EPSILON) add(start.clone().addScaledVector(direction, Math.max(0, Math.min(1, t))));
        }
      }
    }
  }
  return points;
}
/** Smallest PIVOT-CENTERED sphere containing the neutral intersection.
 * This is not an unconstrained minimum-enclosing sphere with a movable center.
 * A true gap has no region; a touching face is an existing geometric junction.
 */
export function measureJointZone(link: JointLink, a: OBB, b: OBB, pivot: Vector3): JointZone {
  const intersection = boxIntersectionVertices(a, b);
  const radius = intersection.length ? Math.max(...intersection.map(p => p.distanceTo(pivot))) : null;
  return { ...link, radius, vertexCount: intersection.length,
    wholeChild: radius !== null && vertices(b).every(p => p.distanceTo(pivot) <= radius + JOINT_NUMERICAL_EPSILON) };
}
/** Explicit visible-piece tree, NOT an owner-group cross product. */
export function jointTopology(skeleton: CatSkeleton): JointLink[] {
  const links = new Map<string, JointLink>();
  function add(parent: string, child: string, pivot: string, source: string) {
    if (!skeleton.bindings.has(parent) || !skeleton.bindings.has(child) || !skeleton.joints.some(j => j.id === pivot)) throw new Error("Unknown A1 articulation: " + parent + "/" + child + "/" + pivot);
    const key = parent + "/" + child, old = links.get(key);
    if (old && old.pivot !== pivot) throw new Error("Conflicting A1 articulation: " + key);
    links.set(key, { parent, child, pivot, source });
  }
  for (const [id, bind] of skeleton.bindings) if (bind.part.parent) {
    // Intrinsic attachments have no separate joint: transport at the shared owner.
    add(bind.part.parent, id, bind.jointId, "A1 part.parent");
  }
  add("body", "head", "joint-neck", "empty neck bridge; proximal attachment pivot");
  for (const side of ["L", "R"]) {
    for (const [parent, child, joint] of [
      ["body", "legF" + side, "shoulderF" + side],
      ["forearmF" + side, "pawF" + side, "wristF" + side],
      ["body", "hip" + side, "hipB" + side],
      ["shinB" + side, "pawB" + side, "ankleB" + side],
    ]) add(parent, child, "joint-" + joint, "A1 consecutive box-bearing structural joint");
  }
  add("body", "tailBase", "joint-tailBase", "A1 torso/tail attachment");
  add("tailBase", "tailMid", "joint-tailMid", "A1 consecutive box-bearing joint");
  // Existing extension hosts; no inferred facial siblings or ancestor shortcuts.
  for (const [parent, child, pivot] of [
    ["legFL", "forearmFL", "joint-elbowFL"], ["legFR", "forearmFR", "joint-elbowFR"],
    ["hipL", "shinBL", "joint-kneeBL"], ["hipR", "shinBR", "joint-kneeBR"],
    ["muzzle", "jaw", "joint-jaw"], ["jaw", "tongue", "joint-jaw"],
  ]) add(parent, child, pivot, "A1 extension bind host");
  return [...links.values()];
}
const measured = new WeakMap<CatSkeleton, JointZone[]>();
export function measureJointZones(skeleton: CatSkeleton): JointZone[] {
  const cached = measured.get(skeleton);
  if (cached) return cached;
  // Immutable compiler-owned A1 neutral reference, never displayed/current nodes.
  const reference = createCatPoseReference(skeleton);
  const obb = (id: string) => new OBB(new Vector3(), new Vector3(...skeleton.bindings.get(id)!.part.args).multiplyScalar(.5), new Matrix3()).applyMatrix4(reference.boxes.get(id)!.matrixWorld);
  const zones = jointTopology(skeleton).map(link => Object.freeze(measureJointZone(link, obb(link.parent), obb(link.child), reference.joints.get(link.pivot)!.getWorldPosition(new Vector3()))));
  measured.set(skeleton, zones); return zones;
}
export function classifyJointPair(a: OBB, b: OBB, pivot?: Vector3, zone?: JointZone) {
  const overlap = boxOverlap(a, b);
  if (overlap <= JOINT_NUMERICAL_EPSILON) return { allowed: true, reason: "no positive penetration", excess: 0, overlap };
  if (!zone || !pivot) return { allowed: false, reason: "nonadjacent penetration", excess: Infinity, overlap };
  if (zone.radius === null) return { allowed: false, reason: "no neutral joint intersection", excess: Infinity, overlap };
  const intersection = boxIntersectionVertices(a, b);
  if (!intersection.length) return { allowed: false, reason: "unmeasurable intersection", excess: Infinity, overlap };
  const excess = Math.max(...intersection.map(p => p.distanceTo(pivot))) - zone.radius;
  return { allowed: excess <= JOINT_NUMERICAL_EPSILON, reason: excess > JOINT_NUMERICAL_EPSILON ? "outside measured joint region" : "inside measured joint region", excess, overlap };
}
/** All seams, with structural articulations distinguished from same-owner
 * decorative bookkeeping. No link is omitted from the report. Pivot-based
 * articulationDistance is DIAGNOSTIC ONLY, not containment/acceptance: an empty
 * neck lever need not put the pivot inside both boxes.
 */
export function measureRigJointContacts(rig: ZoneRig) {
  return jointTopology(rig.skeleton).map(link => {
    const parent = rig.obb(link.parent), child = rig.obb(link.child);
    const pivot = rig.joints.get(link.pivot)!.getWorldPosition(new Vector3());
    const onParent = parent.clampPoint(pivot, new Vector3());
    const onChild = child.clampPoint(pivot, new Vector3());
    const articulationDistance = Math.min(
      onParent.distanceTo(child.clampPoint(onParent, new Vector3())),
      onChild.distanceTo(parent.clampPoint(onChild, new Vector3())),
    );
    const kind = rig.skeleton.bindings.get(link.parent)!.jointId === rig.skeleton.bindings.get(link.child)!.jointId ? "decorative" : "structural";
    return { ...link, kind, distance: boxDistance(parent, child), articulationDistance };
  });
}
const pairKey = (a: string, b: string) => [a, b].sort().join("/");
function effectivelyVisible(node: Object3D) {
  for (let current: Object3D | null = node; current; current = current.parent) if (!current.visible) return false;
  return true;
}
function bounds(box: OBB) {
  const axes = basis(box);
  const half = new Vector3(...[0,1,2].map(i => axes.reduce((r,v,k) => r + Math.abs(v.getComponent(i)) * box.halfSize.getComponent(k),0)) as [number,number,number]);
  return { min:box.center.clone().sub(half), max:box.center.clone().add(half) };
}
/** AABB is negative broad-phase only; positive decisions always use true OBBs. */
export function measureRigJointPenetrations(rig: ZoneRig) {
  const zones = new Map(measureJointZones(rig.skeleton).map(z => [pairKey(z.parent,z.child), z]));
  const parts = [...rig.skeleton.bindings.keys()].filter(id => effectivelyVisible(rig.boxes.get(id)!)).map(id => {
    const box = rig.obb(id); return { id, box, bounds:bounds(box) };
  });
  const violations: { a:string; b:string; reason:string; overlap:number; excess:number; pivot?:string; radius?:number|null }[] = [];
  const penetrations: { a: string; b: string; overlap: number }[] = [];
  let allowedJointOverlaps = 0;
  for (let i=0;i<parts.length;i++) for(let j=i+1;j<parts.length;j++) {
    const a=parts[i], b=parts[j];
    if ([0,1,2].some(k => a.bounds.max.getComponent(k) < b.bounds.min.getComponent(k)-JOINT_NUMERICAL_EPSILON || b.bounds.max.getComponent(k) < a.bounds.min.getComponent(k)-JOINT_NUMERICAL_EPSILON)) continue;
    const zone=zones.get(pairKey(a.id,b.id)), pivot=zone ? rig.joints.get(zone.pivot)! : undefined;
    const scale=pivot?.getWorldScale(new Vector3());
    if(scale && (Math.abs(scale.x-scale.y)>JOINT_NUMERICAL_EPSILON || Math.abs(scale.x-scale.z)>JOINT_NUMERICAL_EPSILON)) throw new Error("Joint-zone transport requires the unchanged uniform-scale rig.");
    const transported=zone && scale ? {...zone,radius:zone.radius===null?null:zone.radius*scale.x}:zone;
    const result=classifyJointPair(a.box,b.box,pivot?.getWorldPosition(new Vector3()),transported);
    if (result.overlap > JOINT_NUMERICAL_EPSILON) penetrations.push({ a: a.id, b: b.id, overlap: result.overlap });
    if(!result.allowed) violations.push({a:a.id,b:b.id,...result,pivot:zone?.pivot,radius:transported?.radius});
    else if(result.overlap>JOINT_NUMERICAL_EPSILON) allowedJointOverlaps++;
  }
  return { visibleParts:parts.length, allowedJointOverlaps, violations, penetrations };
}
