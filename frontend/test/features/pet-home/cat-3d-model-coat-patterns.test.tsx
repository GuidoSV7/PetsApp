/** @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { Cat3DModel } from "@/features/pet-home/components/Cat3DModel";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { buildCatPartTree, resolveCatPartPose, type CatPartNode } from "@/features/pet-home/cat-part-tree";
import { CAT_IDLE_PART_IDS, sampleCatIdleMotion } from "@/features/pet-home/cat-idle-motion";
import * as idleFrame from "@/features/pet-home/cat-idle-frame";
import { defaultCatDesign, type CatDesignTunables } from "@/features/admin/cat-design-settings";
import { resolveCatAnatomy } from "@/features/admin/resolve-cat-design";
import { COAT_PATTERNS, getCoatPatternBoxes, deriveTabbyStripeColor, type PetCoatInput } from "@/features/pet-home/coat-patterns";
import { applyNeedDirtToCoat, applyNeedVisualsToAnatomy, needVisualCues } from "@/features/pet-home/need-visuals";
import type { PetNeeds } from "@/features/pet-home/pet-stats";

const frame = vi.hoisted(() => ({ current: undefined as undefined | ((state: { clock: { getElapsedTime: () => number } }, delta: number) => void) }));
vi.mock("@react-three/fiber", () => ({ useFrame: (callback: typeof frame.current) => { frame.current = callback; } }));
const clean = { hunger: 100, fun: 100, energy: 100, hygiene: 100 };
const zero = { hunger: 0, fun: 0, energy: 0, hygiene: 0 };
const colors = { primary: "#6b7280", secondary: "#9ca3af", accent: "#c9a0a8" };
const design = defaultCatDesign();
const tuned = { ...design, headHeight: .1, bodyDepth: 1.4, earSize: 1.6, modelScale: .9 };
const mesh = (doc: ParentNode, id: string) => doc.querySelector(`mesh[name="${id}"]`)!;
const child = (el: Element, tag: string) => Array.from(el.children).find(c => c.tagName.toLowerCase() === tag)!;
const vector = (el: Element, key: string, fallback: [number, number, number]) => {
  const values = el.getAttribute(key)?.split(",").map(Number) ?? fallback;
  return (key === "scale" && values.length === 1 ? [values[0], values[0], values[0]] : values) as [number, number, number];
};
function local(el: Element) {
  return new Matrix4().compose(new Vector3(...vector(el, "position", [0, 0, 0])),
    new Quaternion().setFromEuler(new Euler(...vector(el, "rotation", [0, 0, 0]))),
    new Vector3(...vector(el, "scale", [1, 1, 1])));
}
function world(el: Element): Matrix4 {
  const parent = el.parentElement;
  return parent && ["mesh", "group"].includes(parent.tagName.toLowerCase())
    ? world(parent).multiply(local(el)) : local(el);
}
function matrix(pose: ReturnType<typeof resolveCatPartPose>) {
  return new Matrix4().compose(new Vector3(...pose.position),
    new Quaternion().setFromEuler(new Euler(...pose.rotation)), new Vector3(...pose.scale));
}
function expectedWorld(needs: PetNeeds, tunables: CatDesignTunables, elapsed?: number, seed = 0) {
  const cues = needVisualCues(needs);
  const resolved = new Map(applyNeedVisualsToAnatomy(resolveCatAnatomy(CAT_ANATOMY, tunables), cues).map(p => [p.id, p]));
  const motion = elapsed === undefined ? {} : sampleCatIdleMotion(elapsed, cues, { seed, reducedMotion: false });
  const result = new Map<string, Matrix4>();
  const root = new Matrix4().compose(new Vector3(0, -.22 + (elapsed === undefined ? 0 : Math.sin(elapsed * cues.idleSpeed * 1.6) * .03 * cues.idleAmp), 0),
    new Quaternion(), new Vector3().setScalar(tunables.modelScale));
  const visit = (node: CatPartNode, parent: Matrix4) => {
    const composed = parent.clone().multiply(matrix(resolveCatPartPose(node, resolved.get(node.part.id), motion[node.part.id as keyof typeof motion])));
    result.set(node.part.id, composed);
    node.children.forEach(c => visit(c, composed));
  };
  buildCatPartTree(CAT_ANATOMY).forEach(n => visit(n, root));
  return result;
}
function assertMatrix(actual: Matrix4, expected: Matrix4, label: string) {
  actual.elements.forEach((value, i) => expect(value, `${label}[${i}]`).toBeCloseTo(expected.elements[i], 10));
}
function scene(coat: PetCoatInput = colors, needs: PetNeeds = clean, tunables = design) {
  return new DOMParser().parseFromString(renderToStaticMarkup(
    <Cat3DModel colors={coat} design={tunables} needs={needs} />,
  ), "text/html");
}
function assertPatches(doc: ParentNode, pattern: typeof COAT_PATTERNS[number], expected: Map<string, Matrix4>) {
  const boxes = getCoatPatternBoxes(pattern);
  expect(doc.querySelectorAll("mesh")).toHaveLength(39 + boxes.length);
  expect(doc.querySelectorAll("boxgeometry")).toHaveLength(39 + boxes.length);
  expect(doc.querySelectorAll("meshstandardmaterial")).toHaveLength(39 + boxes.length);
  for (const box of boxes) {
    const patch = mesh(doc, box.id);
    expect(patch, box.id).not.toBeNull();
    expect(patch.parentElement, box.id).toBe(mesh(doc, box.anchorId));
    expect(vector(patch, "position", [0, 0, 0])).toEqual(box.position);
    expect(vector(patch, "rotation", [0, 0, 0])).toEqual(box.rotation);
    expect(vector(child(patch, "boxgeometry"), "args", [0, 0, 0])).toEqual(box.args);
    assertMatrix(world(patch), expected.get(box.anchorId)!.clone().multiply(matrix({ ...box, scale: [1, 1, 1] })), box.id);
  }
}

beforeAll(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation((message: unknown, ...args: unknown[]) => {
    if (!/incorrect casing|React does not recognize|non-boolean attribute|is unrecognized in this browser/.test(String(message))) throw new Error([message, ...args].join(" "));
  });
});
afterAll(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("real Cat3DModel coat boxes (S2/S4/S5)", () => {
  for (const pattern of COAT_PATTERNS) {
    for (const [label, needs, tunables] of [["normal", clean, design], ["all-zero", zero, design], ["admin and all-zero", zero, tuned]] as const) {
      it(`${pattern}: direct local geometry and composed matrices at ${label}`, () => {
        const doc = scene({ ...colors, pattern }, needs, tunables);
        const expected = expectedWorld(needs, tunables);
        assertPatches(doc, pattern, expected);
        const solid = scene(colors, needs, tunables);
        for (const part of CAT_ANATOMY) {
          const anchor = mesh(doc, part.id);
          expect(doc.querySelectorAll(`mesh[name="${part.id}"]`)).toHaveLength(1);
          expect(anchor.parentElement?.getAttribute("name")).toBe(mesh(solid, part.id).parentElement?.getAttribute("name"));
          expect(child(anchor, "boxgeometry").outerHTML).toBe(child(mesh(solid, part.id), "boxgeometry").outerHTML);
          expect(child(anchor, "meshstandardmaterial").outerHTML).toBe(child(mesh(solid, part.id), "meshstandardmaterial").outerHTML);
          assertMatrix(world(anchor), expected.get(part.id)!, part.id);
        }
      });
    }
  }
  it.each([undefined, null, "zebra"])("preserves colors-only solid for absent/unknown pattern %s", pattern => {
    const input = { ...colors, pattern } as unknown as PetCoatInput;
    expect(scene(input).body.innerHTML).toBe(scene({ ...colors, pattern: "solid" }).body.innerHTML);
    expect(scene(input).querySelectorAll("mesh")).toHaveLength(39);
  });
});

describe("actual materials after dirt exactly once (S6)", () => {
  for (const pattern of COAT_PATTERNS) {
    for (const needs of [clean, { ...clean, hygiene: 0 }]) {
      it(`${pattern} uses the resolved ink, hygiene ${needs.hygiene}`, () => {
        const doc = scene({ ...colors, pattern }, needs);
        const dirtCoat = applyNeedDirtToCoat(colors, needVisualCues(needs));
        const inks = { ...dirtCoat, stripe: deriveTabbyStripeColor(dirtCoat.primary) };
        expect(child(mesh(doc, "body"), "meshstandardmaterial").getAttribute("color")).toBe(dirtCoat.primary);
        expect(child(mesh(doc, "chest"), "meshstandardmaterial").getAttribute("color")).toBe(dirtCoat.secondary);
        expect(child(mesh(doc, "nose"), "meshstandardmaterial").getAttribute("color")).toBe(colors.accent);
        for (const box of getCoatPatternBoxes(pattern)) {
          const patch = mesh(doc, box.id);
          expect(patch, box.id).not.toBeNull();
          const material = child(patch, "meshstandardmaterial");
          expect(material.getAttribute("color"), box.id).toBe(inks[box.ink]);
          const role = box.ink === "stripe" ? "primary" : box.ink;
          const base = CAT_ANATOMY.find(p => p.role === role)!;
          for (const key of ["roughness", "metalness"]) {
            expect(material.getAttribute(key)).toBe(child(mesh(doc, base.id), "meshstandardmaterial").getAttribute(key));
          }
        }
        if (pattern === "tabby") {
          const stripe = child(mesh(doc, "tabby-head-0"), "meshstandardmaterial").getAttribute("color");
          expect(stripe).toBe(needs.hygiene === 100 ? "#363940" : "#292727");
          expect(stripe).not.toBe(colors.accent);
          if (needs.hygiene === 0) {
            expect(stripe).not.toBe(deriveTabbyStripeColor(applyNeedDirtToCoat(dirtCoat, needVisualCues(needs)).primary));
          }
        }
      });
    }
  }
});

// DOM hosts expose the same absolute vector setters used by the real frame callback.
function attachThreeSetters(el: Element) {
  for (const key of ["position", "rotation", "scale"]) {
    Object.defineProperty(el, key, { configurable: true, value: {
      set: (...values: number[]) => el.setAttribute(key, values.join(",")),
      setScalar: (value: number) => el.setAttribute(key, [value, value, value].join(",")),
    } });
  }
}
it("retains keyed anchors, idle origin/seed/registry, ear tic and tail hinges across pattern switches (S5/S7)", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const spy = vi.spyOn(idleFrame, "applyCatIdleFrame");
  const render = async (pattern: typeof COAT_PATTERNS[number]) => {
    await act(async () => root.render(<Cat3DModel colors={{ ...colors, pattern }} needs={zero} design={tuned} orbiting />));
  };
  try {
    await render("solid");
    const anchors = new Map(CAT_ANATOMY.map(p => [p.id, mesh(container, p.id)]));
    container.querySelectorAll("mesh,group").forEach(attachThreeSetters);
    frame.current!({ clock: { getElapsedTime: () => 100 } }, 0);
    const initial = spy.mock.calls.at(-1)![0];
    const cues = needVisualCues(zero);
    // Find a deterministic actual ear-tic sample without copying the sampler's PRNG.
    let ticTime = 0;
    for (let t = 10; t < 17; t += .01) {
      const motion = sampleCatIdleMotion(t, cues, { seed: initial.seed, reducedMotion: false });
      if (motion.earL || motion.earR) { ticTime = t; break; }
    }
    expect(ticTime).toBeGreaterThan(0);
    for (const pattern of ["pointed", "tabby", "tuxedo", "calico", "solid"] as const) {
      await render(pattern);
      frame.current!({ clock: { getElapsedTime: () => 100 + ticTime } }, 0);
      const input = spy.mock.calls.at(-1)![0];
      expect(input.seed).toBe(initial.seed);
      expect(input.elapsedSeconds).toBeCloseTo(ticTime);
      expect(input.meshes).toBe(initial.meshes);
      expect([...input.meshes.keys()].sort()).toEqual([...CAT_IDLE_PART_IDS].sort());
      for (const part of CAT_ANATOMY) expect(mesh(container, part.id), part.id).toBe(anchors.get(part.id));
      const expected = expectedWorld(zero, tuned, ticTime, initial.seed);
      assertPatches(container, pattern, expected);
      for (const id of CAT_IDLE_PART_IDS) assertMatrix(world(mesh(container, id)), expected.get(id)!, id);
    }
  } finally {
    await act(async () => root.unmount());
    spy.mockRestore();
  }
});
