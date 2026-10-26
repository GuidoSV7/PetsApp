import { describe, expect, it } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { CAT_ANATOMY, type CatPart } from "@/features/pet-home/cat-anatomy";
import { buildCatPartTree, resolveCatPartTransform, resolveCatPartPose, type CatPartNode } from "@/features/pet-home/cat-part-tree";

function flatten(nodes: readonly CatPartNode[]): CatPartNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}
const box = (id: string, position: [number, number, number], parent?: string): CatPart => ({
  id, position, kind: "box", role: "primary", args: [1, 1, 1], ...{ parent },
});

describe("base-relative part tree", () => {
  it("keeps the tail joint registered for different nonzero absolute angles", () => {
    const mid = buildCatPartTree(CAT_ANATOMY).find((n) => n.part.id === "tailMid")!;
    const tip = mid.children[0];
    const a = resolveCatPartPose(mid, { ...mid.part, rotation: [0, 0, .25] });
    const b = resolveCatPartPose(tip, { ...tip.part, rotation: [0, 0, -.4] });
    const matrix = (p: typeof a) => new Matrix4().compose(new Vector3(...p.position),
      new Quaternion().setFromEuler(new Euler(...p.rotation)), new Vector3(...p.scale));
    const midWorld = matrix(a), tipWorld = midWorld.clone().multiply(matrix(b));
    const upper = new Vector3(0, mid.part.args[1] / 2, 0).applyMatrix4(midWorld);
    const lower = new Vector3(0, -tip.part.args[1] / 2, 0).applyMatrix4(tipWorld);
    expect(upper.distanceTo(lower)).toBeLessThan(1e-12);
  });
  it("preserves zero-rotation identity while scaled, and hinges full XYZ rotation at the scaled base", () => {
    const nodes = flatten(buildCatPartTree(CAT_ANATOMY));
    for (const id of ["earL", "earR", "tailMid", "tailTip"]) {
      const node = nodes.find((n) => n.part.id === id)!;
      const resolved: CatPart = { ...node.part, scale: [1.6, 1.3, .7] };
      expect(resolveCatPartPose(node, resolved)).toEqual(resolveCatPartTransform(node, resolved));
      const rotated: CatPart = { ...resolved, rotation: [.55, .13, id === "earR" ? -.1375 : .1375] };
      const pose = resolveCatPartPose(node, rotated, { rotation: [.25, 0, 0] });
      const matrix = new Matrix4().compose(new Vector3(...pose.position),
        new Quaternion().setFromEuler(new Euler(...pose.rotation)), new Vector3(...pose.scale));
      const actual = new Vector3(0, -node.part.args[1] / 2, 0).applyMatrix4(matrix);
      const expected = new Vector3(...node.localPosition).add(new Vector3(0, -node.part.args[1] / 2 * 1.3, 0));
      expect(actual.distanceTo(expected), id).toBeLessThan(1e-12);
      expect(pose.rotation).toEqual([.8, .13, rotated.rotation![2]]);
    }
  });
  it("has existing acyclic parents and reconstructs every base position exactly once", () => {
    const nodes = flatten(buildCatPartTree(CAT_ANATOMY));
    expect(nodes).toHaveLength(33);
    expect(new Set(nodes.map((n) => n.part.id)).size).toBe(33);
    for (const part of CAT_ANATOMY) {
      const visited = new Set<string>();
      let current: CatPart | undefined = part;
      while (current) {
        expect(visited.has(current.id)).toBe(false); visited.add(current.id);
        const parent: string | undefined = current.parent;
        current = parent ? CAT_ANATOMY.find((p) => p.id === parent) : undefined;
        if (parent) expect(current).toBeDefined();
      }
    }
    const visit = (node: CatPartNode, parent = new Vector3()) => {
      const world = parent.clone().add(new Vector3(...node.localPosition));
      node.part.position.forEach((v, i) => expect(world.getComponent(i)).toBeCloseTo(v, 12));
      node.children.forEach((child) => visit(child, world));
    };
    buildCatPartTree(CAT_ANATOMY).forEach((node) => visit(node));
  });
  it("builds child-first fixtures without mutation and uses base, not runtime, parent positions", () => {
    const base = [box("child", [2, 4, 6], "parent"), box("parent", [1, 2, 3])];
    const before = structuredClone(base);
    const roots = buildCatPartTree(base);
    expect(roots).toHaveLength(1);
    const child = roots[0].children[0];
    expect(child.localPosition).toEqual([1, 2, 3]);
    expect(resolveCatPartTransform(child, { ...base[0], position: [2, 5, 6] }).position).toEqual([1, 3, 3]);
    expect(base).toEqual(before);
  });
  it("composes nested translation, rotation, scale and child-own deltas once", () => {
    const base = [box("parent", [10, 20, 30]), box("child", [11, 22, 33], "parent"), box("leaf", [12, 23, 34], "child")];
    const runtime: CatPart[] = [
      { ...base[0], position: [15, 20, 30], rotation: [0, 0, Math.PI / 2], scale: [2, 3, 4] },
      { ...base[1], position: [11, 23, 33], scale: [0.5, 1, 2] }, base[2],
    ];
    const worlds = new Map<string, Matrix4>();
    const visit = (node: CatPartNode, parent = new Matrix4()) => {
      const t = resolveCatPartTransform(node, runtime.find((p) => p.id === node.part.id)!);
      const matrix = parent.clone().multiply(new Matrix4().compose(new Vector3(...t.position),
        new Quaternion().setFromEuler(new Euler(...t.rotation)), new Vector3(...t.scale)));
      worlds.set(node.part.id, matrix); node.children.forEach((child) => visit(child, matrix));
    };
    buildCatPartTree(base).forEach((node) => visit(node));
    const child = new Vector3().setFromMatrixPosition(worlds.get("child")!);
    const leaf = new Vector3().setFromMatrixPosition(worlds.get("leaf")!);
    [6, 22, 42].forEach((v, i) => expect(child.getComponent(i)).toBeCloseTo(v, 12));
    [3, 23, 50].forEach((v, i) => expect(leaf.getComponent(i)).toBeCloseTo(v, 12));
  });
});
