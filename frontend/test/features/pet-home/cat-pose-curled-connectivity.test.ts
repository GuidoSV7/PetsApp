import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { CAT_JOINT_IDS } from "@/features/pet-home/cat-pose-data";
import { createHash } from "node:crypto";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { createCatPoseReference } from "@/features/pet-home/cat-pose-reference";
import { mirrorCatPoseBase } from "@/features/pet-home/cat-pose-mirror";
import { poseScene } from "./cat-pose-fixture";
import { measureRigJointContacts, measureRigJointPenetrations } from "./cat-pose-joint-zones";

const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
describe("S19 connectivity evidence (no SAT acceptance)", () => {
  for (const profile of profiles) {
    it(`${profile.name}/mirror: C body reflection and tail residual involution`, () => {
      const left = poseScene(profile.hunger, profile.design), right = poseScene(profile.hunger, profile.design);
      const a = left.prepareStable("curled").sample(), b = right.prepareStable("curled").sample();
      for (const breath of [.99, 1, 1.01]) {
        const reflected = mirrorCatPoseBase(right.skeleton, a.base);
        a.bodyBreath = b.bodyBreath = breath;
        b.rotations.set(reflected.subarray(0, 88)); b.rootOffset.set(reflected.subarray(88, 91));
        left.bind.apply(a); right.bind.apply(b); left.root.updateMatrixWorld(true); right.root.updateMatrixWorld(true);
        for (const id of CAT_JOINT_IDS.filter(id => !id.startsWith("joint-tail"))) {
          const point = left.joints.get(id)!.getWorldPosition(new Vector3()); point.x = -point.x;
          const paired = id.replace(/[LR]$/, side => side === "L" ? "R" : "L");
          expect(point.distanceTo(right.joints.get(paired)!.getWorldPosition(new Vector3())), id).toBeLessThan(1e-12);
        }
      }
      for (const sign of [1, -1]) {
        const source = a.base.slice(); for (let i = 0; i < 4; i++) source[i] *= sign;
        for (const id of ["joint-tailBase", "joint-tailMid", "joint-tailTip"] as const) {
          const offset = CAT_JOINT_IDS.indexOf(id) * 4;
          new Quaternion().fromArray(source, offset).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 2, 3).normalize(), .02)).toArray(source, offset);
        }
        const before = source.slice(), result = mirrorCatPoseBase(left.skeleton, mirrorCatPoseBase(left.skeleton, source));
        expect(source).toEqual(before);
        for (let i = 0; i < 88; i += 4) expect(new Quaternion().fromArray(source, i).angleTo(new Quaternion().fromArray(result, i))).toBeLessThanOrEqual(1e-6);
        expect(result.slice(88)).toEqual(source.slice(88));
      }
    });
    it(`${profile.name}/preservation: existing prepared outputs`, () => {
      const records = [];
      for (const pose of ["side", "bellyUp"] as const) for (const reflected of [false, true]) {
        const rig = poseScene(profile.hunger, profile.design), simulation = rig.prepareStable(pose);
        for (const breath of [.99, 1, 1.01, .99731, 1.00619]) {
          const frame = simulation.sample(); frame.bodyBreath = breath;
          if (reflected) {
            const base = mirrorCatPoseBase(rig.skeleton, frame.base);
            frame.rotations.set(base.subarray(0, 88)); frame.rootOffset.set(base.subarray(88, 91)); frame.headingDeg = base[91];
          }
          rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
          const output = { base: [...frame.base], joints: [...rig.joints].map(([id, n]) => [id, n.matrixWorld.elements, n.scale.toArray()]), boxes: [...rig.boxes].map(([id, n]) => [id, n.matrixWorld.elements, n.visible]), goals: [...rig.bind.contacts.copyGoalsInto(new Float64Array(12))], revision: rig.bind.contacts.goalRevision, diagnostics: rig.bind.contacts.diagnostics };
          records.push({ pose, reflected, breath, hash: createHash("sha256").update(JSON.stringify(output)).digest("hex") });
        }
      }
      console.info("S19-preservation", JSON.stringify({ profile: profile.name, records }));
      expect(records).toHaveLength(20);
    });
    it(`${profile.name}/neutral: disclose immutable A1 gaps`, () => {
      const rig = poseScene(profile.hunger, profile.design), reference = createCatPoseReference(rig.skeleton);
      // Reference owns the immutable neutral transforms. Use the fixture's OBB
      // construction with its actual boxes temporarily replaced by reference nodes.
      for (const [id, node] of reference.boxes) rig.boxes.get(id)!.matrixWorld.copy(node.matrixWorld);
      for (const [id, node] of reference.joints) rig.joints.get(id)!.matrixWorld.copy(node.matrixWorld);
      const contacts = measureRigJointContacts(rig);
      console.info("S19-neutral", JSON.stringify({ profile: profile.name, contacts, joints: rig.skeleton.joints.filter(j => /neck|head|tail/.test(j.id)), binds: [...rig.skeleton.bindings.values()].filter(b => /^(body|head|tailBase|tailMid|tailTip)$/.test(b.part.id)) }));
      expect(contacts.every(link => Number.isFinite(link.distance))).toBe(true);
    });
    for (const reflected of [false, true]) it(`${profile.name}/${reflected}/connected: actual C all articulations`, () => {
      const rig = poseScene(profile.hunger, profile.design), simulation = rig.prepareStable("curled");
      for (const breath of [.99, 1, 1.01]) {
        const frame = simulation.sample(); frame.bodyBreath = breath;
        if (reflected) {
          const base = mirrorCatPoseBase(rig.skeleton, frame.base);
          frame.rotations.set(base.subarray(0, 88)); frame.rootOffset.set(base.subarray(88, 91)); frame.headingDeg = base[91];
        }
        rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
        const contacts = measureRigJointContacts(rig);
        const tipPart = rig.skeleton.bindings.get("tailTip")!.part;
        const tip = new Vector3(0, tipPart.args[1] / 2, 0).applyMatrix4(rig.boxes.get("tailTip")!.matrixWorld);
        const head = rig.boxes.get("head")!.getWorldPosition(new Vector3());
        console.info("S19-C", JSON.stringify({ profile: profile.name, reflected, breath, tipHeadDistance: tip.distanceTo(head), points: Object.fromEntries(["head", "tailBase", "tailMid", "tailTip"].map(id => [id, rig.boxes.get(id)!.getWorldPosition(new Vector3()).toArray()])), contacts, penetrationDiagnostic: measureRigJointPenetrations(rig) }));
        const decorativeGaps = contacts.filter(link => link.kind === "decorative" && link.distance > .001);
        expect(decorativeGaps.map(link => link.child).sort(), "all immutable decorative gaps explicitly disclosed").toEqual(["nose", "philtrum", "whiskerL1", "whiskerL2", "whiskerR1", "whiskerR2"]);
        for (const link of decorativeGaps) expect(link.distance).toBeCloseTo(link.child.startsWith("whisker") ? .014 : .05, 10);
        expect(contacts.filter(link => link.kind === "structural" && link.distance > .001), "every true structural articulation, with no gap waiver").toEqual([]);
      }
    });
  }
});
