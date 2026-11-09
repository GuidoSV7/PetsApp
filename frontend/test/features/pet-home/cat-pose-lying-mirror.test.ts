import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { mirrorCatPoseBase } from "@/features/pet-home/cat-pose-mirror";
import { CAT_JOINT_IDS } from "@/features/pet-home/cat-pose-data";
import { poseScene } from "./cat-pose-fixture";
const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
const paired = (id: string) => id.replace(/[LR]$/, side => side === "L" ? "R" : "L");
describe("rest-aware canonical-side mirror", () => {
  for (const profile of profiles) {
    for (const pose of ["side", "curled", "bellyUp"] as const) it(`${profile.name}/${pose}: involution and immutable source`, () => {
      const rig = poseScene(profile.hunger, profile.design), source = rig.prepareStable(pose).sample().base.slice(), before = source.slice();
      const result = mirrorCatPoseBase(rig.skeleton, mirrorCatPoseBase(rig.skeleton, source));
      expect(source).toEqual(before);
      for (let i = 0; i < 88; i += 4) expect(new Quaternion().fromArray(source, i).angleTo(new Quaternion().fromArray(result, i))).toBeLessThanOrEqual(1e-6);
      expect(result.slice(88)).toEqual(source.slice(88));
    });
    for (const breath of [.99, 1, 1.01]) it(`${profile.name}/D/${breath}: paired actual joints/boxes reflect, real floor preserved`, () => {
      const left = poseScene(profile.hunger, profile.design), right = poseScene(profile.hunger, profile.design);
      const ground = Math.min(...right.corners("pawFL").map(p => p.y));
      const frame = left.prepareStable("side").sample(); frame.bodyBreath = breath;
      left.bind.apply(frame); left.root.updateMatrixWorld(true);
      const mirrored = right.prepareStable("side").sample(), base = mirrorCatPoseBase(right.skeleton, frame.base);
      mirrored.rotations.set(base.subarray(0, 88)); mirrored.rootOffset.set(base.subarray(88, 91)); mirrored.headingDeg = base[91]; mirrored.bodyBreath = breath;
      const before = mirrored.base.slice(), translations = right.skeleton.joints.map(j => [...j.position]);
      right.bind.apply(mirrored); right.root.updateMatrixWorld(true); expect(mirrored.base).toEqual(before);
      expect(right.skeleton.joints.map(j => [...j.position])).toEqual(translations);
      // Tail root is asymmetrically anchored at +X in A1. Do not falsely claim
      // its translations reflect; the paired rigid subrig must reflect exactly.
      for (const id of CAT_JOINT_IDS.filter(id => !id.startsWith("joint-tail"))) {
        const point = left.joints.get(id)!.getWorldPosition(new Vector3()); point.x = -point.x;
        expect(point.distanceTo(right.joints.get(paired(id))!.getWorldPosition(new Vector3())), id).toBeLessThan(1e-12);
      }
      for (const id of ["body", "head", "cheekL", "cheekR", "pawFL", "pawFR", "pawBL", "pawBR", "earL", "earR"]) {
        const a = left.corners(id).map(p => { p.x = -p.x; return p; }), b = right.corners(paired(id));
        for (const point of a) expect(Math.min(...b.map(p => p.distanceTo(point))), id).toBeLessThan(1e-12);
      }
      expect(right.bind.contacts.diagnostics).toEqual({ requestedMask: 0, unreachableFeet: 0, maxFootDrift: null, bodySupportCorrection: null, freeFootCorrection: null, freeFootUnreachable: null });
      expect(Math.min(...right.corners("body").map(p => p.y))).toBeCloseTo(ground, 3);
      for (const [id, node] of right.boxes) if (node.visible) for (const p of right.corners(id)) {
        expect(p.toArray().every(Number.isFinite), id).toBe(true); expect(p.y, `${id}/mirrored floor`).toBeGreaterThanOrEqual(ground - .001);
      }
      for (const node of right.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
    }, 30_000);
  }
});
