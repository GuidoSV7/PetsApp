import { describe, expect, it } from "vitest";
import { Euler, Group, Matrix3, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { buildCatPartTree, resolveCatPartPose, type CatPartNode } from "@/features/pet-home/cat-part-tree";
import { buildCatSkeleton, type CatJointBind } from "@/features/pet-home/cat-skeleton";
import { defaultCatDesign, type CatDesignTunables } from "@/features/admin/cat-design-settings";
import { resolveCatAnatomy } from "@/features/admin/resolve-cat-design";
import { applyNeedVisualsToAnatomy, needVisualCues } from "@/features/pet-home/need-visuals";
import { boxDistance } from "./cat-pose-joint-zones";

const tails = new Set(["tailBase", "tailMid", "tailTip"]);
const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
function rest(hunger: number, design: CatDesignTunables) {
  const resolved = applyNeedVisualsToAnatomy(resolveCatAnatomy(CAT_ANATOMY, design),
    needVisualCues({ hunger, fun: 100, energy: 100, hygiene: 100 }));
  const skeleton = buildCatSkeleton(resolved), root = new Group(), boxes = new Map<string, Mesh>();
  function add(bind: CatJointBind, parent: Group) {
    const joint = new Group(); joint.position.set(...bind.position); joint.rotation.set(...bind.rotation); joint.scale.set(...bind.scale); parent.add(joint);
    for (const box of bind.boxes) { const mesh = new Mesh(); mesh.position.set(...box.position); mesh.scale.set(...box.scale); joint.add(mesh); boxes.set(box.part.id, mesh); }
    bind.children.forEach(child => add(child, joint));
  }
  skeleton.roots.forEach(bind => add(bind, root)); root.updateMatrixWorld(true);
  // Independent original anatomy hierarchy, before rigid-joint rest binding.
  const originalWorlds = new Map<string, Matrix4>(), parts = new Map(resolved.map(part => [part.id, part]));
  function visit(node: CatPartNode, parent = new Matrix4()) {
    const pose = resolveCatPartPose(node, parts.get(node.part.id)!);
    const world = parent.clone().multiply(new Matrix4().compose(new Vector3(...pose.position), new Quaternion().setFromEuler(new Euler(...pose.rotation)), new Vector3(...pose.scale)));
    originalWorlds.set(node.part.id, world); node.children.forEach(child => visit(child, world));
  }
  buildCatPartTree(CAT_ANATOMY).forEach(node => visit(node));
  function obb(id: string) {
    const part = skeleton.bindings.get(id)!.part;
    return new OBB(new Vector3(), new Vector3(...part.args).multiplyScalar(.5), new Matrix3()).applyMatrix4(boxes.get(id)!.matrixWorld);
  }
  return { skeleton, boxes, originalWorlds, obb };
}

describe("global tail surface rest binding", () => {
  for (const profile of profiles) it(`${profile.name}: transports every tail rest world with the same-hunger default surface`, () => {
    const rig = rest(profile.hunger, profile.design), reference = rest(profile.hunger, defaultCatDesign());
    const body = rig.obb("body"), defaultBody = reference.obb("body");
    const displacement = (body.center.z - body.halfSize.z) - (defaultBody.center.z - defaultBody.halfSize.z);
    for (const part of CAT_ANATOMY) {
      const expected = rig.originalWorlds.get(part.id)!.clone();
      if (tails.has(part.id)) expected.elements[14] += displacement;
      rig.boxes.get(part.id)!.matrixWorld.elements.forEach((value, i) => expect(value, `${part.id}[${i}]`).toBeCloseTo(expected.elements[i], 12));
      expect(rig.skeleton.bindings.get(part.id)!.part.args).toEqual(part.args);
    }
    expect(boxDistance(rig.obb("body"), rig.obb("tailBase"))).toBeLessThanOrEqual(.001);
    expect(rig.skeleton.joints).toHaveLength(22);
    expect(rig.skeleton.anchors.map(anchor => anchor.id)).toEqual(["accessory-neck", "accessory-head", "accessory-back"]);
    for (const joint of rig.skeleton.joints) expect(joint.scale).toEqual([1, 1, 1]);
  });
  for (const hunger of [0, 100]) it(`default hunger ${hunger}: preserves every original A1 rest world`, () => {
    const rig = rest(hunger, defaultCatDesign());
    for (const part of CAT_ANATOMY) rig.boxes.get(part.id)!.matrixWorld.elements.forEach((value, i) =>
      expect(value, `${part.id}[${i}]`).toBeCloseTo(rig.originalWorlds.get(part.id)!.elements[i], 12));
  });
});
