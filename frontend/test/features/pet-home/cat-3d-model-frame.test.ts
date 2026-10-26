import { describe, expect, it } from "vitest";
import { Group, Mesh, Vector3 } from "three";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { buildCatPartTree, type CatPartNode, resolveCatPartPose } from "@/features/pet-home/cat-part-tree";
import { applyCatIdleFrame, type CatIdleFrame } from "@/features/pet-home/cat-idle-frame";
import { resolveCatAnatomy } from "@/features/admin/resolve-cat-design";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { applyNeedVisualsToAnatomy, needVisualCues } from "@/features/pet-home/need-visuals";

function scene(need = 100, design = defaultCatDesign()) {
  const cues = needVisualCues({ hunger: need, fun: need, energy: need, hygiene: need });
  const parts = applyNeedVisualsToAnatomy(resolveCatAnatomy(CAT_ANATOMY, design), cues);
  const resolved = new Map(parts.map((p) => [p.id, p]));
  const nodes = new Map<string, CatPartNode>(), meshes = new Map<string, Mesh>(), root = new Group();
  const visit = (node: CatPartNode, parent: Group | Mesh) => {
    nodes.set(node.part.id, node);
    const mesh = new Mesh(); mesh.name = node.part.id;
    const pose = resolveCatPartPose(node, resolved.get(node.part.id)!);
    mesh.position.set(...pose.position); mesh.rotation.set(...pose.rotation); mesh.scale.set(...pose.scale);
    meshes.set(mesh.name, mesh); parent.add(mesh);
    node.children.forEach((c) => visit(c, mesh));
  };
  buildCatPartTree(CAT_ANATOMY).forEach((n) => visit(n, root));
  const input: CatIdleFrame = { root, meshes, nodes, resolved, cues, elapsedSeconds: 0,
    deltaSeconds: 0, seed: 0, reducedMotion: false, orbiting: false,
    yawBias: .2, modelScale: design.modelScale, bounce: 0 };
  return { input, meshes, root };
}
const run = (input: CatIdleFrame, t: number) => applyCatIdleFrame({ ...input, elapsedSeconds: t });
const pose = (mesh: Mesh | Group) => [mesh.position.toArray(), mesh.rotation.toArray(), mesh.scale.toArray()];

describe("actual Three frame body", () => {
  it("suppresses root idle under reduced motion while retaining intentional bounce", () => {
    const { input, root } = scene();
    run({ ...input, reducedMotion: true, bounce: .5 }, 2);
    expect(root.rotation.y).toBe(input.yawBias);
    expect(root.position.y).toBeCloseTo(-.12);
    expect(root.scale.x).toBeCloseTo(input.modelScale * 1.05);
  });
  it("preserves root yaw/bob/orbit and action bounce/squash controls", () => {
    const { input, root } = scene();
    run(input, 2);
    expect(root.rotation.y).toBeCloseTo(.2 + Math.sin(2 * .45) * .22);
    expect(root.position.y).toBeCloseTo(-.22 + Math.sin(2 * 1.6) * .03);
    run({ ...input, orbiting: true }, 2); expect(root.rotation.y).toBe(.2);
    const bounce = applyCatIdleFrame({ ...input, elapsedSeconds: 2, deltaSeconds: .1, bounce: 1 });
    expect(bounce).toBe(.76);
    expect(root.position.y).toBeCloseTo(-.22 + Math.sin(3.2) * .03 + Math.sin(.76 * Math.PI) * .1);
    expect(root.scale.toArray()).toEqual(Array(3).fill(input.modelScale * (1 + Math.sin(.76 * Math.PI) * .05)));
  });
  it("writes all six meshes/root from scratch, does not accumulate and resets blink/tic", () => {
    const { input, meshes, root } = scene();
    const pupil = pose(meshes.get("pupilL")!);
    for (const id of ["eyeL", "eyeR", "tailMid", "tailTip", "earL", "earR"]) {
      const mesh = meshes.get(id)!;
      mesh.position.set(8, 9, 10); mesh.rotation.set(1, 2, 3); mesh.scale.set(4, 5, 6);
    }
    root.position.set(8, 9, 10); root.rotation.set(1, 2, 3);
    run(input, 3.75);
    expect(meshes.get("eyeL")!.scale.toArray()).toEqual([1, .1, 1]);
    expect(root.position.x).toBe(0); expect(root.position.z).toBe(0);
    expect(root.rotation.x).toBe(0); expect(root.rotation.z).toBe(0);
    const snapshot = [...meshes].map(([id, mesh]) => [id, pose(mesh)]);
    run(input, 3.75); expect([...meshes].map(([id, mesh]) => [id, pose(mesh)])).toEqual(snapshot);
    expect(pose(meshes.get("pupilL")!)).toEqual(pupil);
    run(input, 3.8282039185334); expect(meshes.get("eyeL")!.scale.y).toBe(1);
    run(input, 6.1); expect(meshes.get("earR")!.rotation.x).toBe(.25);
    run(input, 6.223996755033731); expect(meshes.get("earR")!.rotation.x).toBe(0);
  });
  it("uses current admin+need base and inherits pupil/inner-ear transforms once", () => {
    const original = scene();
    const fresh = scene(0, { ...defaultCatDesign(), earSize: 1.6, headHeight: .1 });
    const input = { ...fresh.input, root: original.root, meshes: original.meshes, reducedMotion: true };
    run(input, 2.5);
    expect(original.meshes.get("earL")!.scale.toArray()).toEqual([1.6, 1.6, 1.6]);
    expect(original.meshes.get("earL")!.rotation.toArray().slice(0, 3)).toEqual([.55, 0, .1375]);
    expect(original.meshes.get("eyeL")!.scale.y).toBe(.1);
    // Unanimated base props are React-owned; simulate their current committed props.
    for (const id of ["head", "pupilL", "earInnerL"]) {
      const source = fresh.meshes.get(id)!, target = original.meshes.get(id)!;
      target.position.copy(source.position); target.rotation.copy(source.rotation); target.scale.copy(source.scale);
    }
    original.root.updateMatrixWorld(true);
    const local = original.meshes.get("pupilL")!.scale.clone();
    expect(local.y).toBe(.65);
    expect(original.meshes.get("pupilL")!.getWorldScale(new Vector3()).y).toBeCloseTo(input.modelScale * .65 * .1);
    original.meshes.get("earInnerL")!.getWorldScale(new Vector3()).toArray()
      .forEach((axis) => expect(axis).toBeCloseTo(input.modelScale * 1.6, 12));
  });
  it("clears tail/tic/root idle on reduction, keeps blink and intentional bounce, resumes without drift", () => {
    const { input, meshes, root } = scene();
    run(input, 6.1);
    expect(meshes.get("earR")!.rotation.x).toBe(.25);
    run({ ...input, reducedMotion: true }, 3.75);
    expect(root.rotation.y).toBe(.2); expect(root.position.y).toBe(-.22);
    expect(meshes.get("eyeL")!.scale.y).toBe(.1);
    for (const id of ["tailMid", "tailTip", "earL", "earR"]) expect(meshes.get(id)!.rotation.toArray()).toEqual([0, 0, 0, "XYZ"]);
    run({ ...input, reducedMotion: true, bounce: .5 }, 3.75);
    expect(root.position.y).toBeCloseTo(-.12);
    expect(root.scale.x).toBeCloseTo(input.modelScale * 1.05);
    run(input, 6.1); const after = pose(meshes.get("tailTip")!);
    const other = scene(); run(other.input, 6.1);
    expect(after).toEqual(pose(other.meshes.get("tailTip")!));
  });
  it("keeps actual tail face centers together at multiple phases/current needs and absolute caps", () => {
    for (const need of [100, 0]) for (const t of [0, .2, .8, 1.5, 2.7, 6, 12, 25]) {
      const { input, meshes, root } = scene(need);
      run(input, t); root.updateMatrixWorld(true);
      const mid = meshes.get("tailMid")!, tip = meshes.get("tailTip")!;
      const a = new Vector3(0, .16, 0).applyMatrix4(mid.matrixWorld);
      const b = new Vector3(0, -.06, 0).applyMatrix4(tip.matrixWorld);
      expect(a.distanceTo(b)).toBeLessThan(1e-12);
      // A shared point on BOTH finite face polygons proves actual face contact.
      const onTip = tip.worldToLocal(a.clone()), onMid = mid.worldToLocal(b.clone());
      expect(onTip.y).toBeCloseTo(-.06, 12); expect(onMid.y).toBeCloseTo(.16, 12);
      for (const point of [onTip, onMid]) {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(.05 + 1e-12);
        expect(Math.abs(point.z)).toBeLessThanOrEqual(.05 + 1e-12);
      }
      const m = Math.sin(t * 2 * input.cues.idleSpeed) * .25 * input.cues.idleAmp;
      const q = Math.sin(t * 2 * input.cues.idleSpeed - .6) * .325 * input.cues.idleAmp;
      expect(mid.rotation.z).toBeCloseTo(m, 12);
      expect(mid.rotation.z + tip.rotation.z).toBeCloseTo(q, 12);
      expect(Math.abs(mid.rotation.z)).toBeLessThanOrEqual(.35);
      expect(Math.abs(mid.rotation.z + tip.rotation.z)).toBeLessThanOrEqual(.46);
    }
  });
});
