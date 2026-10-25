import { describe, expect, it } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { buildCatPartTree, resolveCatPartPose, type CatPartNode } from "@/features/pet-home/cat-part-tree";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { resolveCatAnatomy } from "@/features/admin/resolve-cat-design";
import { applyNeedVisualsToAnatomy, needVisualCues } from "@/features/pet-home/need-visuals";

const EPS = 1e-6;
const pair = (left: string, ...rights: string[]) => rights.map((right) => [left, right] as const);
const contacts = [
  ...pair("body", "head", "chest", "hipL", "hipR", "legFL", "legFR", "tailBase"),
  ...pair("head", "cheekL", "cheekR", "muzzle", "earL", "earR", "eyeL", "eyeR"),
  ...pair("muzzle", "nose", "philtrum", "whiskerL1", "whiskerL2", "whiskerR1", "whiskerR2"),
  ...pair("tailBase", "tailMid"), ...pair("tailMid", "tailTip"),
  ...["L", "R"].flatMap((s) => [
    ...pair(`hip${s}`, `pawB${s}`), ...pair(`legF${s}`, `pawF${s}`),
    ...pair(`pawF${s}`, `padF${s}`), ...pair(`eye${s}`, `pupil${s}`),
    ...pair(`ear${s}`, `earInner${s}`),
  ]),
];
function corners(id: string, matrix: Matrix4) {
  const dims = CAT_ANATOMY.find((p) => p.id === id)!.args;
  return [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) =>
    new Vector3(x * dims[0] / 2, y * dims[1] / 2, z * dims[2] / 2).applyMatrix4(matrix))));
}
/** Convex box SAT; supports rotated/scaled parallelepipeds, not inflated AABBs. */
function touching(a: Vector3[], b: Vector3[]) {
  const edges = (c: Vector3[]) => [4, 2, 1].map((i) => c[i].clone().sub(c[0]));
  const ea = edges(a), eb = edges(b);
  const normals = (e: Vector3[]) => [e[0].clone().cross(e[1]), e[1].clone().cross(e[2]), e[2].clone().cross(e[0])];
  const axes = [...normals(ea), ...normals(eb), ...ea.flatMap((x) => eb.map((y) => x.clone().cross(y)))];
  return axes.every((axis) => {
    if (axis.lengthSq() < 1e-18) return true;
    axis.normalize();
    const pa = a.map((p) => p.dot(axis)), pb = b.map((p) => p.dot(axis));
    return Math.max(...pa) >= Math.min(...pb) - EPS && Math.max(...pb) >= Math.min(...pa) - EPS;
  });
}
/** Clip the actual ear BASE quadrilateral against the head's six local planes. */
function baseTouchesHead(earId: string, ear: Matrix4, head: Matrix4) {
  const [w, h, d] = CAT_ANATOMY.find((p) => p.id === earId)!.args;
  const headSize = CAT_ANATOMY.find((p) => p.id === "head")!.args;
  const relative = head.clone().invert().multiply(ear);
  let polygon = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) =>
    new Vector3(x * w / 2, -h / 2, z * d / 2).applyMatrix4(relative));
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    const clipped: Vector3[] = [];
    const distance = (p: Vector3) => sign * p.getComponent(axis) - headSize[axis] / 2 - EPS;
    polygon.forEach((current, i) => {
      const previous = polygon[(i + polygon.length - 1) % polygon.length];
      const a = distance(previous), b = distance(current);
      if ((a <= 0) !== (b <= 0)) clipped.push(previous.clone().lerp(current, a / (a - b)));
      if (b <= 0) clipped.push(current);
    });
    polygon = clipped;
  }
  return polygon.length > 0;
}

const cases = [100, 0].flatMap((need) => [1, 0.6, 1.6].flatMap((earSize) =>
  [1, 0.1].flatMap((blink) => [0, 0.25].map((tic) => ({ need, earSize, blink, tic })))));

describe("composed voxel contacts", () => {
  it.each(["earL", "earR"])("contains ALL four %s base vertices in the head at max need droop+tic", (id) => {
    const resolved = applyNeedVisualsToAnatomy(resolveCatAnatomy(CAT_ANATOMY, defaultCatDesign()),
      needVisualCues({ hunger: 0, fun: 0, energy: 0, hygiene: 0 }));
    const worlds = new Map<string, Matrix4>();
    const visit = (node: CatPartNode, parent = new Matrix4()) => {
      const pose = resolveCatPartPose(node, resolved.find((p) => p.id === node.part.id)!,
        node.part.id === id ? { rotation: [.25, 0, 0] } : undefined);
      const world = parent.clone().multiply(new Matrix4().compose(new Vector3(...pose.position),
        new Quaternion().setFromEuler(new Euler(...pose.rotation)), new Vector3(...pose.scale)));
      worlds.set(node.part.id, world); node.children.forEach((c) => visit(c, world));
    };
    buildCatPartTree(CAT_ANATOMY).forEach((n) => visit(n));
    const relative = worlds.get("head")!.clone().invert().multiply(worlds.get(id)!);
    const [w, h, d] = CAT_ANATOMY.find((p) => p.id === id)!.args;
    const head = CAT_ANATOMY.find((p) => p.id === "head")!.args;
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const vertex = new Vector3(x * w / 2, -h / 2, z * d / 2).applyMatrix4(relative);
      head.forEach((size, axis) => expect(Math.abs(vertex.getComponent(axis)), id).toBeLessThanOrEqual(size / 2 + EPS));
    }
  });
  it.each(cases)("needs=$need earSize=$earSize blink=$blink tic=$tic", ({ need, earSize, blink, tic }) => {
    const needs = { hunger: need, fun: need, energy: need, hygiene: need };
    const resolved = applyNeedVisualsToAnatomy(resolveCatAnatomy(CAT_ANATOMY,
      { ...defaultCatDesign(), earSize }), needVisualCues(needs)).map((part) => {
      if (part.id === "earL" || part.id === "earR") {
        const r = part.rotation ?? [0, 0, 0];
        return { ...part, rotation: [r[0] + tic, r[1], r[2]] as const };
      }
      if (part.id === "eyeL" || part.id === "eyeR") {
        const s = part.scale ?? [1, 1, 1];
        return { ...part, scale: [s[0], s[1] * blink, s[2]] as const };
      }
      return part;
    });
    const worlds = new Map<string, Matrix4>();
    const visit = (node: CatPartNode, parent = new Matrix4()) => {
      const t = resolveCatPartPose(node, resolved.find((p) => p.id === node.part.id)!);
      const matrix = parent.clone().multiply(new Matrix4().compose(new Vector3(...t.position),
        new Quaternion().setFromEuler(new Euler(...t.rotation)), new Vector3(...t.scale)));
      worlds.set(node.part.id, matrix); node.children.forEach((child) => visit(child, matrix));
    };
    buildCatPartTree(CAT_ANATOMY).forEach((node) => visit(node));
    for (const [a, b] of contacts) expect(touching(corners(a, worlds.get(a)!), corners(b, worlds.get(b)!)), `${a}↔${b}`).toBe(true);
    for (const id of ["earL", "earR"]) expect(baseTouchesHead(id, worlds.get(id)!, worlds.get("head")!), `${id} base`).toBe(true);
    const limits = [[-0.5, 0.5], [-0.32, 1.25], [-0.72, 0.6]];
    for (const part of CAT_ANATOMY) for (const corner of corners(part.id, worlds.get(part.id)!)) {
      limits.forEach(([min, max], axis) => {
        expect(corner.getComponent(axis), `${part.id} axis${axis}`).toBeGreaterThanOrEqual(min - EPS);
        expect(corner.getComponent(axis), `${part.id} axis${axis}`).toBeLessThanOrEqual(max + EPS);
      });
    }
    // Chest and inner ears carry no own cue transform; eye blink/pupil cue compose once.
    for (const id of ["chest", "earInnerL", "earInnerR"]) {
      expect(resolved.find((p) => p.id === id)!.scale).toBeUndefined();
      expect(resolved.find((p) => p.id === id)!.rotation).toBeUndefined();
    }
  });
});
