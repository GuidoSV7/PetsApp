import { describe, expect, it } from "vitest";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { mirrorCatPoseBase } from "@/features/pet-home/cat-pose-mirror";
import { CAT_POSE_LIBRARY } from "@/features/pet-home/cat-pose-tracks";
import { CatPoseSimulation } from "@/features/pet-home/cat-pose-simulation";
import { poseScene } from "./cat-pose-fixture";

const profiles = [
  { hunger: 0, design: defaultCatDesign() },
  { hunger: 100, design: defaultCatDesign() },
  { hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];

describe("lying head-rest authoring", () => {
  for (const [index, profile] of profiles.entries()) it(`profile ${index}: neutral D head and body share the actual floor`, () => {
    const rig = poseScene(profile.hunger, profile.design);
    const ground = Math.min(...rig.corners("pawFL").map(point => point.y));
    const frame = rig.prepareStable("side").sample(); frame.bodyBreath = 1;
    const before = frame.base.slice(); rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
    expect(frame.base).toEqual(before);
    expect(Math.min(...rig.corners("body").map(point => point.y))).toBeCloseTo(ground, 12);
    expect(Math.min(...["head", "cheekL", "cheekR"].flatMap(id => rig.corners(id).map(point => point.y)))).toBeCloseTo(ground, 12);
    for (const node of rig.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
  });
  for (const [index, profile] of profiles.entries()) it(`profile ${index}: D head remains connected to chest or body`, () => {
    const rig = poseScene(profile.hunger, profile.design), frame = rig.prepareStable("side").sample();
    for (const breath of [.99, 1, 1.01]) {
      frame.bodyBreath = breath; rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
      const head = rig.obb("head");
      expect(head.intersectsOBB(rig.obb("body"), 1e-12) || head.intersectsOBB(rig.obb("chest"), 1e-12)).toBe(true);
    }
  });
  for (const [index, profile] of profiles.entries()) for (const reflected of [false, true]) it(`profile ${index}/${reflected}: D actual tail seams, clearance and stable head contact`, () => {
    const rig = poseScene(profile.hunger, profile.design), simulation = rig.prepareStable("side");
    let witness: ReturnType<typeof rig.corners>[number] | undefined;
    for (const breath of [.99, 1, 1.01, .99731, 1.00619]) {
      const frame = simulation.sample(), base = frame.base.slice();
      if (reflected) {
        const mirrored = mirrorCatPoseBase(rig.skeleton, base);
        frame.rotations.set(mirrored.subarray(0, 88)); frame.rootOffset.set(mirrored.subarray(88, 91));
      }
      frame.bodyBreath = breath; const authoritative = frame.base.slice();
      rig.bind.apply(frame); rig.root.updateMatrixWorld(true); expect(frame.base).toEqual(authoritative);
      const corners = rig.corners("head");
      const contact = corners.reduce((a, b) => a.y < b.y - 1e-12 ? a : b);
      expect(contact.y).toBeCloseTo(-.29, 5);
      if (!witness) witness = contact.clone(); else expect(contact.distanceTo(witness)).toBeLessThanOrEqual(.001);
      for (const [a, b] of [["body", "tailBase"], ["tailBase", "tailMid"], ["tailMid", "tailTip"]]) {
        expect(rig.obb(a).intersectsOBB(rig.obb(b), 1e-12), `${a}/${b}/closed seam`).toBe(true);
      }
      for (const tail of ["tailBase", "tailMid", "tailTip"]) {
        expect(Math.min(...rig.corners(tail).map(point => point.y))).toBeGreaterThanOrEqual(-.291);
        for (const part of ["head", "eyeL", "eyeR", "earL", "earR", "earInnerL", "earInnerR", ...(tail === "tailBase" ? [] : ["body", "chest"])]) {
          const box = rig.obb(tail); box.halfSize.addScalar(-1e-10);
          expect(box.intersectsOBB(rig.obb(part), 0), `${tail}/${part}/clearance`).toBe(false);
        }
      }
    }
  });
  for (const [index, profile] of profiles.entries()) it(`profile ${index}: B mirror preserves its previous tail floor`, () => {
    const rig = poseScene(profile.hunger, profile.design), frame = rig.prepareStable("bellyUp").sample();
    const mirrored = mirrorCatPoseBase(rig.skeleton, frame.base);
    frame.rotations.set(mirrored.subarray(0, 88)); frame.rootOffset.set(mirrored.subarray(88, 91));
    for (const breath of [.99, 1, 1.01]) {
      frame.bodyBreath = breath; rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
      for (const [id, node] of rig.boxes) if (node.visible) {
        expect(Math.min(...rig.corners(id).map(point => point.y)), id).toBeGreaterThanOrEqual(-.291);
      }
    }
  });
  it("rejects out-of-range stable breathing before nodes or support state change", () => {
    const rig = poseScene(0), frame = rig.prepareStable("side").sample();
    rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
    const transforms = () => [...rig.joints.values(), ...rig.boxes.values()].map(node => [...node.position.toArray(), ...node.quaternion.toArray(), ...node.scale.toArray()]);
    const before = transforms(), goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12));
    const revision = rig.bind.contacts.goalRevision, diagnostics = { ...rig.bind.contacts.diagnostics };
    for (const breath of [.98, 1.02, NaN]) {
      frame.bodyBreath = breath;
      expect(() => rig.bind.apply(frame)).toThrowError("Breathing FK input is outside the compiled physical range.");
      expect(transforms()).toEqual(before); expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
      expect(rig.bind.contacts.goalRevision).toBe(revision); expect(rig.bind.contacts.diagnostics).toEqual(diagnostics);
    }
  });
  it("equivalent root quaternion signs choose the same D FK side", () => {
    const a = poseScene(0), b = poseScene(0), sa = a.prepareStable("side"), sb = b.prepareStable("side");
    for (const breath of [.99, 1, 1.01]) {
      const positive = sa.sample(), negative = sb.sample();
      const source = negative.base.slice(); for (let i = 0; i < 4; i++) source[i] = -source[i];
      const pa = mirrorCatPoseBase(a.skeleton, positive.base), pb = mirrorCatPoseBase(b.skeleton, source);
      positive.rotations.set(pa.subarray(0, 88)); positive.rootOffset.set(pa.subarray(88, 91));
      negative.rotations.set(pb.subarray(0, 88)); negative.rootOffset.set(pb.subarray(88, 91));
      positive.bodyBreath = negative.bodyBreath = breath;
      a.bind.apply(positive); b.bind.apply(negative); a.root.updateMatrixWorld(true); b.root.updateMatrixWorld(true);
      for (const [id] of a.boxes) for (const [i, point] of a.corners(id).entries()) expect(point.distanceTo(b.corners(id)[i])).toBeLessThan(1e-12);
    }
  });
  it("omitted stable FK retains the default neutral seated node output", () => {
    const a = poseScene(100), b = poseScene(100), simulation = new CatPoseSimulation({ seed: 13 });
    b.bind.configureLibrary(CAT_POSE_LIBRARY);
    for (const breath of [.99, 1, 1.01]) {
      const frame = simulation.sample(); frame.bodyBreath = breath;
      a.bind.apply(frame); b.bind.apply(frame); a.root.updateMatrixWorld(true); b.root.updateMatrixWorld(true);
      for (const [id, node] of a.joints) expect(b.joints.get(id)!.matrixWorld.elements).toEqual(node.matrixWorld.elements);
      for (const [id, node] of a.boxes) expect(b.boxes.get(id)!.matrixWorld.elements).toEqual(node.matrixWorld.elements);
    }
  });
});
