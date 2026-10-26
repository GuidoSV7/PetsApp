import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { Box3, BoxGeometry, Group, Mesh, Vector3 } from "three";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { buildCatSkeleton, applyCatSkeletonMotion, type CatSkeleton } from "@/features/pet-home/cat-skeleton";
import * as legacy from "@/features/pet-home/cat-part-tree";
import { sampleCatIdleMotion } from "@/features/pet-home/cat-idle-motion";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { resolveCatAnatomy } from "@/features/admin/resolve-cat-design";
import { applyNeedVisualsToAnatomy, needVisualCues } from "@/features/pet-home/need-visuals";
import { getCoatPatternBoxes, type CoatPattern } from "@/features/pet-home/coat-patterns";
import type { FrozenCase, FrozenState } from "./cat-skeleton-baseline.test";

const fixtures = JSON.parse(gunzipSync(readFileSync(new URL("../../fixtures/pet-skeleton/legacy-world.json.gz", import.meta.url))).toString()).cases as FrozenCase[];
const healthy = { hunger: 100, fun: 100, energy: 100, hygiene: 100 };
const extraIds = ["forearmFL", "forearmFR", "shinBL", "shinBR", "jaw", "tongue"];
function resolved(needs = healthy, design = defaultCatDesign()) {
  return applyNeedVisualsToAnatomy(resolveCatAnatomy(CAT_ANATOMY, design), needVisualCues(needs));
}
function scene(skeleton: CatSkeleton, pattern: CoatPattern = "solid") {
  const root = new Group(), joints = new Map<string, Group>(), boxes = new Map<string, Mesh>();
  for (const joint of skeleton.joints) {
    const node = new Group(); node.name = joint.id;
    node.position.set(...joint.position); node.rotation.set(...joint.rotation); node.scale.set(...joint.scale);
    (joint.parent ? joints.get(joint.parent)! : root).add(node); joints.set(joint.id, node);
  }
  for (const bind of skeleton.bindings.values()) {
    const node = new Mesh(new BoxGeometry(...bind.part.args)); node.name = bind.part.id; node.visible = bind.visible;
    node.position.set(...bind.position); node.scale.set(...bind.scale);
    joints.get(bind.jointId)!.add(node); boxes.set(node.name, node);
  }
  for (const patch of getCoatPatternBoxes(pattern)) {
    const node = new Mesh(new BoxGeometry(...patch.args)); node.name = patch.id;
    node.position.set(...patch.position); node.rotation.set(...patch.rotation);
    boxes.get(patch.anchorId)!.add(node); boxes.set(node.name, node);
  }
  return { root, joints, boxes };
}
function rootPose(root: Group, state: FrozenState) {
  root.position.fromArray(state.root.position); root.rotation.set(...state.root.rotation as [number, number, number]); root.scale.fromArray(state.root.scale);
}
/** Declared exact dimensions, not Float32 buffer vertices rounded by BoxGeometry. */
function bounds(mesh: Mesh) {
  const { width, height, depth } = (mesh.geometry as BoxGeometry).parameters;
  const points = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => new Vector3(x * width / 2, y * height / 2, z * depth / 2).applyMatrix4(mesh.matrixWorld))));
  return new Box3().setFromPoints(points);
}
function parity(root: Group, boxes: Map<string, Mesh>, state: FrozenState) {
  root.updateMatrixWorld(true);
  for (const expected of state.boxes) {
    const actual = boxes.get(expected.id); expect(actual, expected.id).toBeDefined();
    actual!.matrixWorld.elements.forEach((v, i) => expect(v, `${expected.id}[${i}]`).toBeCloseTo(expected.matrix[i], 10));
  }
}

describe("A1 rigid graph and static bind compiler (S1–S4/S9)", () => {
  it("defines the exact22-joint chains, unit scales and three empty anchors", () => {
    const skeleton = buildCatSkeleton(resolved());
    expect(skeleton.joints).toHaveLength(22);
    const expected: Record<string, string | undefined> = {
      root: undefined, torso: "root", neck: "torso", head: "neck", jaw: "head",
      shoulderFL: "torso", elbowFL: "shoulderFL", wristFL: "elbowFL", shoulderFR: "torso", elbowFR: "shoulderFR", wristFR: "elbowFR",
      hipBL: "torso", kneeBL: "hipBL", ankleBL: "kneeBL", hipBR: "torso", kneeBR: "hipBR", ankleBR: "kneeBR",
      tailBase: "torso", tailMid: "tailBase", tailTip: "tailMid", earL: "head", earR: "head",
    };
    expect(Object.fromEntries(skeleton.joints.map(j => [j.id, j.parent]))).toEqual(Object.fromEntries(Object.entries(expected).map(([id, parent]) => ["joint-" + id, parent && "joint-" + parent])));
    for (const joint of skeleton.joints) expect(joint.scale).toEqual([1, 1, 1]);
    expect(skeleton.anchors.map(a => [a.id, a.parent])).toEqual([["accessory-neck", "joint-neck"], ["accessory-head", "joint-head"], ["accessory-back", "joint-torso"]]);
  });
  it("keeps33 original boxes intact and appends exactly six hidden contained boxes", () => {
    const skeleton = buildCatSkeleton(resolved());
    expect([...skeleton.bindings.keys()]).toEqual([...CAT_ANATOMY.map(p => p.id), ...extraIds]);
    for (const part of CAT_ANATOMY) {
      const bind = skeleton.bindings.get(part.id)!;
      expect(bind.visible).toBe(true); expect(bind.part.args).toEqual(part.args); expect(bind.part.role).toBe(part.role);
    }
    const { root, boxes } = scene(skeleton); root.updateMatrixWorld(true);
    const hosts = ["legFL", "legFR", "hipL", "hipR", "muzzle", "jaw"];
    extraIds.forEach((id, index) => {
      const box = boxes.get(id)!; expect(box.visible).toBe(false);
      const outer = bounds(boxes.get(hosts[index])!).expandByScalar(1e-12);
      const inner = bounds(box); expect(outer.containsBox(inner), id).toBe(true);
    });
  });
  it("keeps surface anchors and actual limb/body contacts across hunger0–100", () => {
    for (let hunger = 0; hunger <= 100; hunger++) {
      const skeleton = buildCatSkeleton(resolved({ ...healthy, hunger }));
      expect(skeleton.joints).toHaveLength(22);
      const { root, joints, boxes } = scene(skeleton); root.updateMatrixWorld(true);
      const body = bounds(boxes.get("body")!);
      for (const [joint, axis, face] of [["neck", "y", "max"], ["shoulderFL", "y", "min"], ["shoulderFR", "y", "min"], ["hipBL", "x", "min"], ["hipBR", "x", "max"]] as const) {
        const pivot = joints.get("joint-" + joint)!.getWorldPosition(new Vector3());
        expect(pivot[axis]).toBeCloseTo(body[face][axis], 12);
      }
      for (const [a, b] of [["body", "chest"], ["body", "head"], ["body", "legFL"], ["body", "legFR"], ["body", "hipL"], ["body", "hipR"], ["legFL", "pawFL"], ["legFR", "pawFR"], ["hipL", "pawBL"], ["hipR", "pawBR"], ["body", "tailBase"]]) {
        expect(bounds(boxes.get(a)!).expandByScalar(1e-12).intersectsBox(bounds(boxes.get(b)!)), `${hunger}:${a}/${b}`).toBe(true);
      }
    }
  });
  for (const fixture of fixtures) it(`${fixture.id}: static binds, complete frozen worlds and idle invariance`, () => {
    const needs = { hunger: fixture.need, fun: fixture.need, energy: fixture.need, hygiene: fixture.need };
    const skeleton = buildCatSkeleton(resolved(needs, fixture.design ?? defaultCatDesign()));
    expect(skeleton.bindings.size).toBe(39);
    const before = JSON.stringify([...skeleton.bindings]);
    const { root, joints, boxes } = scene(skeleton, fixture.pattern as CoatPattern);
    rootPose(root, fixture.rest); parity(root, boxes, fixture.rest);
    const spy = vi.spyOn(legacy, "resolveCatPartPose");
    try {
      for (const sample of fixture.idle) {
        applyCatSkeletonMotion(skeleton, joints, boxes, sampleCatIdleMotion(sample.time, needVisualCues(needs), { seed: 13, reducedMotion: false }));
        rootPose(root, sample.state); parity(root, boxes, sample.state);
        expect(JSON.stringify([...skeleton.bindings])).toBe(before);
        for (const bind of skeleton.bindings.values()) expect(boxes.get(bind.part.id)!.position.toArray()).toEqual(bind.position);
        for (const joint of joints.values()) expect(joint.scale.toArray()).toEqual([1, 1, 1]);
        const mid = boxes.get("tailMid")!, tip = boxes.get("tailTip")!;
        expect(mid.localToWorld(new Vector3(0, .16, 0)).distanceTo(tip.localToWorld(new Vector3(0, -.06, 0)))).toBeLessThan(1e-12);
      }
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
});
