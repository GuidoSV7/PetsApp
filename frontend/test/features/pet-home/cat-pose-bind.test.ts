import { describe, expect, it } from "vitest";
import { Euler, Group, Mesh, Quaternion, Vector3 } from "three";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { buildCatSkeleton, type CatJointBind } from "@/features/pet-home/cat-skeleton";
import { CatPoseBind } from "@/features/pet-home/cat-pose-bind";
import { CatPoseSimulation } from "@/features/pet-home/cat-pose-simulation";
import { CAT_JOINT_IDS } from "@/features/pet-home/cat-pose-data";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { resolveCatAnatomy } from "@/features/admin/resolve-cat-design";
import { applyNeedVisualsToAnatomy, needVisualCues } from "@/features/pet-home/need-visuals";
import { createSupportScratch, createSupportSolution, solveTwoBoneSupport, solveTwoBoneSupportInto } from "@/features/pet-home/cat-support-ik";

/** Same rigid scene ownership as CatSkeletonParts, with actual Three world matrices. */
function scene(hunger = 100) {
  const anatomy = applyNeedVisualsToAnatomy(resolveCatAnatomy(CAT_ANATOMY, defaultCatDesign()),
    needVisualCues({ hunger, fun: 100, energy: 100, hygiene: 100 }));
  const skeleton = buildCatSkeleton(anatomy), root = new Group();
  const joints = new Map<string, Group>(), boxes = new Map<string, Mesh>();
  function add(bind: CatJointBind, parent: Group) {
    const joint = new Group(); joint.name = bind.id;
    joint.position.set(...bind.position); joint.rotation.set(...bind.rotation);
    joints.set(bind.id, joint); parent.add(joint);
    for (const box of bind.boxes) {
      const node = new Mesh(); node.name = box.part.id;
      node.position.set(...box.position); node.scale.set(...box.scale); node.visible = box.visible;
      boxes.set(node.name, node); joint.add(node);
    }
    bind.children.forEach(child => add(child, joint));
  }
  skeleton.roots.forEach(bind => add(bind, root)); root.updateMatrixWorld(true);
  return { skeleton, root, joints, boxes, bind: new CatPoseBind(skeleton, joints, boxes) };
}
const position = (node: Group | Mesh) => node.getWorldPosition(new Vector3());

describe("resolved local FK bind (S4/S10/S12 partial adapter proof)", () => {
  it("retains all39 rest matrices at every integer hunger without changing joint scales or ID order", () => {
    for (let hunger = 0; hunger <= 100; hunger++) {
      const rig = scene(hunger), frame = new CatPoseSimulation({ seed: 13 }).sample();
      const before = [...rig.boxes.values()].map(node => node.matrixWorld.clone());
      rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
      [...rig.boxes.values()].forEach((node, n) => node.matrixWorld.elements.forEach((v, i) => expect(v).toBeCloseTo(before[n].elements[i], 14)));
      expect([...rig.skeleton.bindings.keys()].slice(0, 33)).toEqual(CAT_ANATOMY.map(part => part.id));
      expect(rig.joints.size).toBe(22); expect(rig.skeleton.anchors).toHaveLength(3);
      for (const joint of rig.joints.values()) expect(joint.scale.toArray()).toEqual([1, 1, 1]);
    }
  });
  it("maps by exact IDs, including ears, and carries all torso descendants rigidly", () => {
    const rig = scene(0), frame = new CatPoseSimulation({ seed: 13 }).sample();
    const pivot = position(rig.joints.get("joint-torso")!), old = position(rig.boxes.get("head")!);
    const turn = new Quaternion().setFromEuler(new Euler(.1, -.2, .05));
    turn.toArray(frame.rotations, CAT_JOINT_IDS.indexOf("joint-torso") * 4);
    const ear = new Quaternion().setFromEuler(new Euler(.2, 0, 0));
    ear.toArray(frame.rotations, CAT_JOINT_IDS.indexOf("joint-earL") * 4);
    rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
    expect(position(rig.boxes.get("head")!).distanceTo(old.sub(pivot).applyQuaternion(turn).add(pivot))).toBeLessThan(1e-12);
    const rest = rig.skeleton.joints.find(joint => joint.id === "joint-earL")!;
    const expected = new Quaternion().setFromEuler(new Euler(...rest.rotation)).multiply(ear);
    expect(rig.joints.get("joint-earL")!.quaternion.angleTo(expected)).toBeLessThan(1e-7);
  });
  it.each([.4, .3])("pins actual paw surfaces through %s Hz breathing and a reachable downward body settle", hz => {
    for (const hunger of [0, 100]) {
      const rig = scene(hunger), frame = new CatPoseSimulation({ seed: 13 }).sample();
      const goals = ["pawFL", "pawFR", "pawBL", "pawBR"].map(id => position(rig.boxes.get(id)!));
      for (let tick = 0; tick <= 120; tick++) for (const alpha of [0, .5, 1]) {
        const phase = (tick + alpha) / 60 * Math.PI * 2 * hz;
        frame.rootOffset[1] = -.005 * (1 - Math.cos(phase));
        frame.bodyBreath = 1 + Math.sin(phase) * (hz === .4 ? .01 : .006);
        rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
        ["pawFL", "pawFR", "pawBL", "pawBR"].forEach((id, i) => {
          const paw = rig.boxes.get(id)!, bind = rig.skeleton.bindings.get(id)!;
          expect(position(paw).distanceTo(goals[i]), `${hunger}/${tick}/${alpha}/${id}`).toBeLessThanOrEqual(.001);
          const normal = new Vector3(0, 1, 0).transformDirection(paw.matrixWorld);
          expect(normal.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-10);
          // Actual finite bottom corners, not just an abstract ankle endpoint.
          for (const x of [-1, 1]) for (const z of [-1, 1]) {
            const bottom = new Vector3(x * bind.part.args[0] / 2, -bind.part.args[1] / 2, z * bind.part.args[2] / 2).applyMatrix4(paw.matrixWorld);
            expect(bottom.y).toBeCloseTo(-.29, 10);
          }
        });
        expect(rig.bind.contacts.diagnostics.unreachableFeet).toBe(0);
      }
    }
  });
  it("reports a truly unreachable upward reaction instead of certifying the clamped paws planted", () => {
    const rig = scene(100), frame = new CatPoseSimulation({ seed: 13 }).sample();
    frame.rootOffset[1] = .04;
    rig.bind.apply(frame);
    expect(rig.bind.contacts.diagnostics.requestedMask).toBe(15);
    expect(rig.bind.contacts.diagnostics.unreachableFeet).toBeGreaterThan(0);
    expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeGreaterThan(.001);
    frame.supportMask = -1;
    expect(() => rig.bind.apply(frame)).toThrow("Unresolved support phase");
  });
  it("does not accumulate transformations, reveals only selected extensions, and keeps old blink box-only", () => {
    const rig = scene(), frame = new CatPoseSimulation({ seed: 13 }).sample();
    frame.eyeScale = .1; frame.bodyBreath = 1.01; frame.visibleMask = 3;
    rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
    const before = rig.boxes.get("head")!.matrixWorld.clone();
    for (let n = 0; n < 100; n++) rig.bind.apply(frame);
    rig.root.updateMatrixWorld(true);
    expect(rig.boxes.get("head")!.matrixWorld).toEqual(before);
    expect(rig.boxes.get("eyeL")!.scale.y).toBe(.1);
    expect(rig.boxes.get("pupilL")!.scale.y).toBe(.1);
    expect(rig.boxes.get("body")!.scale.y).toBe(1.01);
    for (const id of ["forearmFL", "forearmFR"]) expect(rig.boxes.get(id)!.visible).toBe(true);
    for (const id of ["shinBL", "shinBR", "jaw", "tongue"]) expect(rig.boxes.get(id)!.visible).toBe(false);
    for (const joint of rig.joints.values()) expect(joint.scale.toArray()).toEqual([1, 1, 1]);
  });
});

describe("allocation-free support interface", () => {
  it("reuses caller-owned solution, tuple and scratch identities while preserving the default solver", () => {
    const scratch = createSupportScratch(), output = createSupportSolution();
    const knee = output.knee, foot = output.foot, quaternion = output.footQuaternion;
    for (const target of [[0, 0, 0], [0, -3, 0], [0, 1, 0]] as const) {
      const input = { root: [0, 1, 0] as const, target, pole: [0, 1, 1] as const, upperLength: .75, lowerLength: .75 };
      expect(solveTwoBoneSupportInto(input, output, scratch)).toBe(output);
      expect(output).toEqual(solveTwoBoneSupport(input));
      expect(output.knee).toBe(knee); expect(output.foot).toBe(foot); expect(output.footQuaternion).toBe(quaternion);
    }
  });
});
