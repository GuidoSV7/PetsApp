/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { buildCatPartTree, resolveCatPartTransform, type CatPartNode } from "@/features/pet-home/cat-part-tree";
import { CAT_ANATOMY, getCatPart } from "@/features/pet-home/cat-anatomy";
import {
  CAT_DESIGN_STORAGE_KEY,
  clearCatDesign,
  defaultCatDesign,
  loadCatDesign,
  normalizeCatDesign,
  saveCatDesign,
} from "@/features/admin/cat-design-settings";
import {
  resolveCatAnatomy,
  resolveModelScale,
} from "@/features/admin/resolve-cat-design";

describe("cat design settings", () => {
  afterEach(() => {
    clearCatDesign();
  });

  it("normalizes and persists tunables", () => {
    const saved = saveCatDesign(
      normalizeCatDesign({
        modelScale: 0.9,
        bodyDepth: 1.2,
        headHeight: 0.05,
        earSize: 1.1,
      }),
    );
    expect(loadCatDesign()).toEqual(saved);
    expect(window.localStorage.getItem(CAT_DESIGN_STORAGE_KEY)).toBeTruthy();
  });

  it("resolves anatomy overrides while keeping required parts", () => {
    const tunables = normalizeCatDesign({
      bodyDepth: 1.25,
      headHeight: 0.1,
      earSize: 1.3,
      modelScale: 0.85,
    });
    const resolved = resolveCatAnatomy(CAT_ANATOMY, tunables);
    const ids = resolved.map((p) => p.id);
    expect(ids).toContain("body");
    expect(ids).toContain("head");
    expect(ids).toContain("earL");
    expect(ids).toContain("earR");

    const baseBody = getCatPart("body")!;
    const body = resolved.find((p) => p.id === "body")!;
    expect(body.scale![2]).toBeCloseTo(
      (baseBody.scale?.[2] ?? 1) * tunables.bodyDepth,
    );

    const baseHead = getCatPart("head")!;
    const head = resolved.find((p) => p.id === "head")!;
    expect(head.position[1]).toBeCloseTo(
      baseHead.position[1] + tunables.headHeight,
    );

    expect(resolveModelScale(tunables)).toBe(0.85);
    expect(defaultCatDesign().bodyDepth).toBe(1);
  });
});


describe("admin parent-owned hierarchy transforms", () => {
  it.each([0.6, 1, 1.6])("inherits headHeight and earSize=%s once without changing child-own values", (earSize) => {
    const design = { ...defaultCatDesign(), headHeight: 0.1, earSize };
    const resolved = resolveCatAnatomy(CAT_ANATOMY, design);
    for (const id of ["chest", "eyeL", "pupilL", "earInnerL", "earInnerR", "muzzle"]) {
      expect(resolved.find((p) => p.id === id)).toEqual(getCatPart(id));
    }
    const worlds = new Map<string, Matrix4>();
    const visit = (node: CatPartNode, parent = new Matrix4()) => {
      const t = resolveCatPartTransform(node, resolved.find((p) => p.id === node.part.id)!);
      const matrix = parent.clone().multiply(new Matrix4().compose(new Vector3(...t.position),
        new Quaternion().setFromEuler(new Euler(...t.rotation)), new Vector3(...t.scale)));
      worlds.set(node.part.id, matrix); node.children.forEach((child) => visit(child, matrix));
    };
    buildCatPartTree(CAT_ANATOMY).forEach((node) => visit(node));
    for (const id of ["eyeL", "pupilL", "muzzle", "nose"]) {
      expect(new Vector3().setFromMatrixPosition(worlds.get(id)!).y).toBeCloseTo(getCatPart(id)!.position[1] + 0.1, 12);
    }
    for (const side of ["L", "R"]) {
      const ear = getCatPart(`ear${side}`)!;
      const inner = getCatPart(`earInner${side}`)!;
      const world = new Vector3().setFromMatrixPosition(worlds.get(inner.id)!);
      const expected = ear.position.map((v, i) => v + (inner.position[i] - v) * earSize + (i === 1 ? 0.1 : 0));
      expected.forEach((v, i) => expect(world.getComponent(i)).toBeCloseTo(v, 12));
      expect(new Vector3().setFromMatrixScale(worlds.get(inner.id)!).toArray()).toEqual([earSize, earSize, earSize]);
    }
  });
});
