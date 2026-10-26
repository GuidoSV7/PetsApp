/** @vitest-environment jsdom */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { Cat3DModel } from "@/features/pet-home/components/Cat3DModel";
import { CAT_ANATOMY, getCatPart } from "@/features/pet-home/cat-anatomy";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { resolveCatAnatomy } from "@/features/admin/resolve-cat-design";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";

vi.mock("@react-three/fiber", () => ({ useFrame: vi.fn() }));
const healthy = { hunger: 100, fun: 100, energy: 100, hygiene: 100 };
const vector = (el: Element, key: string, fallback: number[]) =>
  (el.getAttribute(key)?.split(",").map(Number) ?? fallback);
function scene(overrides = {}) {
  const design = { ...defaultCatDesign(), ...overrides };
  const document = new DOMParser().parseFromString(renderToStaticMarkup(
    <Cat3DModel colors={DEFAULT_GREY_COAT} design={design} needs={healthy} />,
  ), "text/html");
  const resolved = resolveCatAnatomy(CAT_ANATOMY, design);
  const mesh = (id: string) => document.querySelector(`mesh[name="${id}"]`) ??
    Array.from(document.querySelectorAll("mesh")).find((node) =>
      node.getAttribute("position") === resolved.find((p) => p.id === id)!.position.join(","))!;
  return { document, mesh };
}
function world(mesh: Element): Matrix4 {
  const ancestors: Element[] = [];
  for (let p: Element | null = mesh; p?.tagName.toLowerCase() === "mesh"; p = p.parentElement) ancestors.unshift(p);
  return ancestors.reduce((matrix, el) => matrix.multiply(new Matrix4().compose(
    new Vector3(...vector(el, "position", [0, 0, 0]) as [number, number, number]),
    new Quaternion().setFromEuler(new Euler(...vector(el, "rotation", [0, 0, 0]) as [number, number, number])),
    new Vector3(...vector(el, "scale", [1, 1, 1]) as [number, number, number]),
  )), new Matrix4());
}

beforeAll(() => {
  vi.stubGlobal("React", React);
  // DOM serialization of Three intrinsic tags emits casing warnings, not GPU errors.
  vi.spyOn(console, "error").mockImplementation((message: unknown, ...args: unknown[]) => {
    if (!/incorrect casing|React does not recognize|non-boolean attribute/.test(String(message))) throw new Error([message, ...args].join(" "));
  });
});
afterAll(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("actual Model scene hierarchy", () => {
  it("preserves the existing per-role palette on each mesh", () => {
    const { mesh } = scene();
    const colors = { ...DEFAULT_GREY_COAT, eye: "#1c1c1c", pupil: "#8dffb2", whisker: "#f3efe8" };
    for (const part of CAT_ANATOMY) {
      const material = Array.from(mesh(part.id).children).find((child) => child.tagName.toLowerCase() === "meshstandardmaterial")!;
      expect(material.getAttribute("color"), part.id).toBe(colors[part.role]);
    }
  });
  it("renders each base part once with box geometry", () => {
    const { document } = scene();
    expect(document.querySelectorAll("mesh")).toHaveLength(33);
    expect(document.querySelectorAll("boxgeometry")).toHaveLength(33);
    expect(document.querySelectorAll("meshstandardmaterial")).toHaveLength(33);
  });
  it("nests head children, eye pupils and inner ears inside their carriers", () => {
    const { mesh } = scene();
    for (const [child, parent] of [["eyeL", "head"], ["pupilL", "eyeL"], ["earL", "head"], ["earInnerL", "earL"], ["chest", "body"], ["tailTip", "tailMid"], ["padFL", "pawFL"]]) {
      expect(mesh(child).parentElement?.closest("mesh"), child).toBe(mesh(parent));
    }
  });
  it("uses base-table child-minus-parent offsets rather than world positions", () => {
    const { mesh } = scene();
    for (const [child, parent] of [["eyeL", "head"], ["earInnerL", "earL"], ["chest", "body"]]) {
      const expected = getCatPart(child)!.position.map((v, axis) => v - getCatPart(parent)!.position[axis]);
      expect(vector(mesh(child), "position", []), child).toEqual(expected);
    }
  });
  it("composes parent translation once instead of cancelling it in children", () => {
    const normal = scene(); const raised = scene({ headHeight: 0.1 });
    for (const id of ["eyeL", "pupilL", "earInnerL", "muzzle", "nose"]) {
      const a = new Vector3().setFromMatrixPosition(world(normal.mesh(id)));
      const b = new Vector3().setFromMatrixPosition(world(raised.mesh(id)));
      expect(b.y - a.y, id).toBeCloseTo(0.1);
    }
  });
  it("composes outer-ear scale once in the inner ear", () => {
    const normal = scene(); const larger = scene({ earSize: 1.6 });
    for (const id of ["earInnerL", "earInnerR"]) {
      const a = new Vector3().setFromMatrixScale(world(normal.mesh(id)));
      const b = new Vector3().setFromMatrixScale(world(larger.mesh(id)));
      expect(b.toArray(), id).toEqual(a.multiplyScalar(1.6).toArray());
    }
  });
});
