import { Vector3 } from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";

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
