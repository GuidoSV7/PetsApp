import { describe, expect, it } from "vitest";
import { Euler, Quaternion, Vector3 } from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CAT_JOINT_IDS } from "@/features/pet-home/cat-pose-data";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { poseScene } from "./cat-pose-fixture";
import { measureRigJointContacts } from "./cat-pose-joint-zones";

export const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
type Rig = ReturnType<typeof poseScene>;
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
export function measureLyingRig(rig: Rig, base: Float64Array) {
  const center = (id: string) => rig.boxes.get(id)!.getWorldPosition(new Vector3());
  const b = rig.joints.get("joint-tailBase")!.getWorldPosition(new Vector3()), m = rig.joints.get("joint-tailMid")!.getWorldPosition(new Vector3()), t = rig.joints.get("joint-tailTip")!.getWorldPosition(new Vector3());
  const tipRadius = Math.max(...rig.corners("tailTip").map(p => p.distanceTo(t)));
  const headFloor = Math.min(...["head", "cheekL", "cheekR"].flatMap(id => rig.corners(id).map(p => p.y)));
  const pairs = [["tailBase", "tailMid"], ["tailMid", "tailTip"], ["body", "tailBase"], ["chest", "head"], ["body", "head"]];
  const tails = ["tailBase", "tailMid", "tailTip"], protectedParts = ["head", "body", "chest", "eyeL", "eyeR", "earL", "earR", "earInnerL", "earInnerR"];
  return { headFloor, noseTipDistance: boxDistance(rig.obb("nose"), rig.obb("tailTip")), noseTipOverlap: boxOverlap(rig.obb("nose"), rig.obb("tailTip")),
    b: b.toArray(), m: m.toArray(), t: t.toArray(), firstLever: b.distanceTo(m), secondLever: m.distanceTo(t), tipRadius,
    reachCeiling: b.distanceTo(m) + m.distanceTo(t) + tipRadius, noseFromBase: center("nose").distanceTo(b),
    seams: pairs.map(([a, b]) => ({ a, b, distance: boxDistance(rig.obb(a), rig.obb(b)), overlap: boxOverlap(rig.obb(a), rig.obb(b)) })),
    foldedSilhouette: ["pawFL", "pawFR", "pawBL", "pawBR"].map(id => ({ id, bodyDistance: boxDistance(rig.obb(id), rig.obb("body")) })),
    chainSeams: [["body", "legFL"], ["body", "legFR"], ["body", "hipL"], ["body", "hipR"], ["legFL", "forearmFL"], ["legFR", "forearmFR"], ["hipL", "shinBL"], ["hipR", "shinBR"], ["forearmFL", "pawFL"], ["forearmFR", "pawFR"], ["shinBL", "pawBL"], ["shinBR", "pawBR"]].map(([a, b]) => ({ a, b, distance: boxDistance(rig.obb(a), rig.obb(b)) })),
    clearance: tails.flatMap(a => protectedParts.map(b => ({ a, b, distance: boxDistance(rig.obb(a), rig.obb(b)), overlap: boxOverlap(rig.obb(a), rig.obb(b)) }))),
    jointDegrees: Object.fromEntries(CAT_JOINT_IDS.map((id, i) => { const e = new Euler().setFromQuaternion(new Quaternion().fromArray(base, i * 4), "XYZ"); return [id, [e.x, e.y, e.z].map(v => v * 180 / Math.PI)]; })),
  };
}
function headSupport(rig: Rig, ground: number) {
  const floor = Math.min(...["head", "cheekL", "cheekR"].flatMap(id => rig.corners(id).map(p => p.y)));
  expect(Math.abs(floor - ground), "actual D cheek/head support").toBeLessThanOrEqual(.001);
}
function curlContact(rig: Rig) {
  // S19: SAT/zone values are diagnostic, never pose acceptance.
  expect(measureRigJointContacts(rig).filter(link => link.kind === "structural" && link.distance > .001), "S19 C/all structural articulations (decorative A1 gaps reported separately)").toEqual([]);
  for (const [a, b] of [["body", "tailBase"], ["tailBase", "tailMid"], ["tailMid", "tailTip"]]) expect(boxDistance(rig.obb(a), rig.obb(b)), `${a}/${b}/closed seam`).toBeLessThanOrEqual(.001);
  expect(Math.min(boxDistance(rig.obb("head"), rig.obb("chest")), boxDistance(rig.obb("head"), rig.obb("body"))), "connected head/chest/body").toBeLessThanOrEqual(.001);
}

describe("approved lying semantics, not body support alone", () => {
  it("checks oriented feature-distance/SAT measurements against analytic box cases", () => {
    const a = new OBB(new Vector3(), new Vector3(1, 1, 1));
    const b = a.clone(); b.center.x = 3; expect(boxDistance(a, b)).toBeCloseTo(1, 12);
    b.center.set(3, 3, 3); expect(boxDistance(a, b)).toBeCloseTo(Math.sqrt(3), 12);
    b.center.set(1.5, 0, 0); expect(boxDistance(a, b)).toBe(0); expect(boxOverlap(a, b)).toBeCloseTo(.5, 12);
    b.center.set(3, 0, 0); b.rotation.set(Math.SQRT1_2, -Math.SQRT1_2, 0, Math.SQRT1_2, Math.SQRT1_2, 0, 0, 0, 1);
    expect(boxDistance(a, b)).toBeCloseTo(2 - Math.SQRT2, 12);
  });
  for (const profile of profiles) for (const pose of ["side", "curled"] as const) {
    for (const breath of [.99, 1, 1.01]) it(`${profile.name}/${pose}/${breath}: actual head-rest or nose/clearance`, () => {
      const rig = poseScene(profile.hunger, profile.design), ground = Math.min(...rig.corners("pawFL").map(p => p.y));
      const frame = rig.prepareStable(pose).sample(); frame.bodyBreath = breath; rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
      if (breath === 1) console.info("lying-semantics-current", JSON.stringify({ profile: profile.name, pose, ...measureLyingRig(rig, frame.base) }));
      if (pose === "side") headSupport(rig, ground); else curlContact(rig);
    }, 30_000);
    for (const sleeping of [false, true]) it(`${profile.name}/${pose}/${sleeping ? "sleep .3Hz" : "Core awake"}: 120ticks/all alphas/contact stable`, async () => {
      const rig = poseScene(profile.hunger, profile.design), ground = Math.min(...rig.corners("pawFL").map(p => p.y)), simulation = rig.prepareStable(pose);
      let witness: { id: string; index: number; point: Vector3 } | undefined;
      for (let tick = 0; tick < 120; tick++) {
        simulation.step();
        for (const alpha of [0, .25, .5, .75, 1]) {
          const frame = simulation.sample(alpha), base = frame.base.slice();
          if (sleeping) frame.bodyBreath = 1 + Math.sin((tick + alpha) / 60 * 2 * Math.PI * .3 + 1.7) * .006;
          rig.bind.apply(frame); rig.root.updateMatrixWorld(true); expect(frame.base).toEqual(base);
          if (pose === "side") {
            headSupport(rig, ground);
            if (!witness) {
              const candidates = ["head", "cheekL", "cheekR"].flatMap(id => rig.corners(id).map((point, index) => ({ id, index, point })));
              witness = candidates.reduce((a, b) => a.point.y < b.point.y ? a : b);
            }
            expect(rig.corners(witness.id)[witness.index].distanceTo(witness.point), "designated head/cheek contact world drift").toBeLessThanOrEqual(.001);
          } else curlContact(rig);
        }
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    }, 30_000);
  }
});
