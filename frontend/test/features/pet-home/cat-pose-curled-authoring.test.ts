import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { mirrorCatPoseBase } from "@/features/pet-home/cat-pose-mirror";
import { poseScene } from "./cat-pose-fixture";
import { measureRigJointContacts } from "./cat-pose-joint-zones";

const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
// Measured cap-center to actual head-center distances from connected C at
// neutral breath. .005 model units covers the existing .0025 neck attachment
// excursion plus a small regression margin; this is not a reach/nasal target.
const tipHeadReference = [
  [.13301922857312184, .21486498691139988],
  [.062022997429165054, .3214860748156952],
  [.23477503959570334, .22184941634115743],
  [.287046199492847, .5361661855732496],
];
type Rig = ReturnType<typeof poseScene>;
type Frame = ReturnType<ReturnType<Rig["prepareStable"]>["sample"]>;
// Existing setup mirror seam. This is not a new runtime side selector.
function apply(rig: Rig, frame: Frame, reflected: boolean) {
  const authoritative = frame.base.slice();
  if (reflected) {
    const base = mirrorCatPoseBase(rig.skeleton, authoritative);
    frame.rotations.set(base.subarray(0, 88)); frame.rootOffset.set(base.subarray(88, 91)); frame.headingDeg = base[91];
  }
  const rotations = frame.rotations.slice(), root = frame.rootOffset.slice();
  rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
  expect(frame.base).toEqual(authoritative);
  expect(frame.rotations).toEqual(rotations); expect(frame.rootOffset).toEqual(root);
}
function headTowardHips(rig: Rig) {
  const hips = rig.joints.get("joint-hipBL")!.getWorldPosition(new Vector3())
    .add(rig.joints.get("joint-hipBR")!.getWorldPosition(new Vector3())).multiplyScalar(.5);
  const head = rig.boxes.get("head")!.getWorldPosition(new Vector3());
  const direction = new Vector3(0,0,1).transformDirection(rig.joints.get("joint-head")!.matrixWorld);
  const towardHips = hips.sub(head);
  const torsoForward = new Vector3(0,0,1).transformDirection(rig.joints.get("joint-torso")!.matrixWorld);
  expect(direction.dot(towardHips), "S18 actual face turns toward hips, not anterior nasal plane").toBeGreaterThan(0);
  expect(direction.dot(torsoForward) * towardHips.dot(torsoForward), "S18 face points hipward along the rigid torso, not just sideways into its chest").toBeGreaterThan(0);
}
function tailTowardHeadOnSameSide(rig: Rig, reference?: number) {
  const body = rig.boxes.get("body")!.getWorldPosition(new Vector3());
  const head = rig.boxes.get("head")!.getWorldPosition(new Vector3());
  const part = rig.skeleton.bindings.get("tailTip")!.part;
  const tip = new Vector3(0,part.args[1]/2,0).applyMatrix4(rig.boxes.get("tailTip")!.matrixWorld);
  const hinge = rig.joints.get("joint-tailTip")!.getWorldPosition(new Vector3());
  expect(tip.clone().sub(hinge).dot(head.clone().sub(hinge)), "S19 real distal cap progresses toward actual head").toBeGreaterThan(0);
  if (reference !== undefined) expect(Math.abs(tip.distanceTo(head) - reference), "measured connected C tip/head regression, not a reach target").toBeLessThanOrEqual(.005);
  const forward = new Vector3(0,0,1).transformDirection(rig.joints.get("joint-torso")!.matrixWorld);
  forward.y = 0; forward.normalize();
  const lateral = new Vector3(0,1,0).cross(forward).normalize();
  const distance = tip.distanceTo(head);
  expect(head.sub(body).dot(lateral) * tip.sub(body).dot(lateral), "S19 head and distal tail on same ground-plane body side").toBeGreaterThan(0);
  return distance;
}
function contactAndSupport(rig: Rig) {
  const contacts = measureRigJointContacts(rig);
  expect(contacts.filter(link => link.kind === "structural" && link.distance > .001), "S19 every articulated structural parent/child contacts; decorative gaps reported separately").toEqual([]);
  expect(Math.min(...rig.corners("body").map(p => p.y)), "unchanged body support").toBeCloseTo(-.29, 3);
  for (const [id, node] of rig.boxes) if (node.visible) for (const p of rig.corners(id)) {
    expect(p.toArray().every(Number.isFinite), id).toBe(true);
    expect(p.y, `${id}/floor`).toBeGreaterThanOrEqual(-.291);
  }
  expect(rig.bind.contacts.diagnostics).toEqual({ requestedMask: 0, unreachableFeet: 0, maxFootDrift: null, bodySupportCorrection: null, freeFootCorrection: null, freeFootUnreachable: null });
  for (const node of rig.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
}
describe("S19 rigid-torso curl, connected articulations and unchanged support", () => {
  for (const [profileIndex, profile] of profiles.entries()) for (const reflected of [false,true]) {
    const reference = tipHeadReference[profileIndex][Number(reflected)];
    for (const breath of [.99,1,1.01]) for (const rule of ["head","tail","contact"] as const) {
      it(`${profile.name}/${reflected}/${breath}/${rule}`, () => {
        const rig=poseScene(profile.hunger,profile.design), frame=rig.prepareStable("curled").sample();
        frame.bodyBreath=breath; apply(rig,frame,reflected);
        if(rule==="head") headTowardHips(rig); else if(rule==="tail") tailTowardHeadOnSameSide(rig, reference); else contactAndSupport(rig);
      });
    }
    for(const sleeping of [false,true]) it(`${profile.name}/${reflected}/${sleeping}: stable C 120ticks/all alphas/contact`,async()=>{
      const rig=poseScene(profile.hunger,profile.design), simulation=rig.prepareStable("curled");
      const goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12)), revision = rig.bind.contacts.goalRevision;
      const widths: number[] = [], distances: number[] = [];
      for(let tick=0;tick<120;tick++) {
        simulation.step();
        for(const alpha of [0,.25,.5,.75,1]) {
          const frame=simulation.sample(alpha);
          if(sleeping) frame.bodyBreath=1+Math.sin((tick+alpha)/60*2*Math.PI*.3+1.7)*.006;
          apply(rig,frame,reflected);contactAndSupport(rig);
          headTowardHips(rig); distances.push(tailTowardHeadOnSameSide(rig));
          expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
          expect(rig.bind.contacts.goalRevision).toBe(revision);
          widths.push(rig.boxes.get("body")!.scale.y);
        }
        await new Promise<void>(resolve=>setImmediate(resolve));
      }
      expect(Math.max(...widths) - Math.min(...widths), "real breathing not suppressed").toBeGreaterThan(.001);
      console.info("S19-live-distance", JSON.stringify({ profile: profile.name, reflected, sleeping, minimum: Math.min(...distances), maximum: Math.max(...distances) }));
    },30_000);
  }
});
