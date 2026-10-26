/** @vitest-environment jsdom */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { Cat3DModel } from "@/features/pet-home/components/Cat3DModel";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import * as legacy from "@/features/pet-home/cat-part-tree";
import * as rig from "@/features/pet-home/cat-skeleton";
import * as frameModule from "@/features/pet-home/cat-idle-frame";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import type { CoatPattern } from "@/features/pet-home/coat-patterns";
import type { FrozenCase, FrozenState } from "./cat-skeleton-baseline.test";

const frame = vi.hoisted(() => ({ current: undefined as undefined | ((state: { clock: { getElapsedTime: () => number } }, delta: number) => void) }));
const observed = vi.hoisted(() => ({ boxes: [] as { name: string; visible: boolean }[] }));
vi.mock("@react-three/fiber", () => ({ useFrame: (callback: typeof frame.current) => { frame.current = callback; } }));
// Observe public React element props; DOM serialization omits boolean visible.
vi.mock("@/features/pet-home/components/CatSkeletonParts", async importOriginal => {
  const original = await importOriginal<typeof import("@/features/pet-home/components/CatSkeletonParts")>();
  return { ...original, CatSkeletonParts: (props: React.ComponentProps<typeof original.CatSkeletonParts>) => original.CatSkeletonParts({ ...props, renderBox: bind => {
    const element = props.renderBox(bind) as React.ReactElement<{ name: string; visible: boolean }>;
    observed.boxes.push(element.props); return element;
  } }) };
});
const fixtures = JSON.parse(gunzipSync(readFileSync("test/fixtures/pet-skeleton/legacy-world.json.gz")).toString()).cases as FrozenCase[];
const colors = { primary: "#6b7280", secondary: "#9ca3af", accent: "#c9a0a8" };
const extras = ["forearmFL", "forearmFR", "shinBL", "shinBR", "jaw", "tongue"];
const vector = (el: Element, key: string, fallback: number[]) => {
  const v = el.getAttribute(key)?.split(",").map(Number) ?? fallback;
  return (key === "scale" && v.length === 1 ? [v[0], v[0], v[0]] : v) as [number, number, number];
};
function world(el: Element): Matrix4 {
  const local = new Matrix4().compose(new Vector3(...vector(el, "position", [0, 0, 0])), new Quaternion().setFromEuler(new Euler(...vector(el, "rotation", [0, 0, 0]))), new Vector3(...vector(el, "scale", [1, 1, 1])));
  const parent = el.parentElement;
  return parent && ["group", "mesh"].includes(parent.tagName.toLowerCase()) ? world(parent).multiply(local) : local;
}
function assertWorlds(doc: ParentNode, state: FrozenState) {
  for (const box of state.boxes) {
    const element = doc.querySelector(`mesh[name="${box.id}"]`)!; expect(element, box.id).not.toBeNull();
    world(element).elements.forEach((v, i) => expect(v, `${box.id}[${i}]`).toBeCloseTo(box.matrix[i], 10));
  }
}
function model(f: FrozenCase) {
  const needs = { hunger: f.need, fun: f.need, energy: f.need, hygiene: f.need };
  return <Cat3DModel colors={{ ...colors, pattern: f.pattern as CoatPattern }} needs={needs} design={f.design ?? defaultCatDesign()} />;
}
function setters(el: Element) {
  for (const key of ["position", "rotation", "scale"]) Object.defineProperty(el, key, { configurable: true, value: {
    set: (...v: number[]) => el.setAttribute(key, v.join(",")), setScalar: (v: number) => el.setAttribute(key, [v, v, v].join(",")),
  } });
}
beforeAll(() => {
  vi.stubGlobal("React", React); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("crypto", { getRandomValues: (v: Uint32Array) => v.fill(13) });
  vi.spyOn(console, "error").mockImplementation((message: unknown, ...args: unknown[]) => {
    if (!/incorrect casing|React does not recognize|non-boolean attribute|is unrecognized in this browser/.test(String(message))) throw new Error([message, ...args].join(" "));
  });
});
afterAll(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("actual A1 renderer and idle route (S2/S4/S9/S11)", () => {
  it("renders unit-scale joints, exact original geometry, six hidden boxes and empty anchors", () => {
    observed.boxes.length = 0;
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(model(fixtures[0])), "text/html");
    expect(doc.querySelectorAll("mesh")).toHaveLength(39);
    const hidden = observed.boxes.filter(p => p.visible === false).map(p => p.name);
    expect(hidden).toEqual(expect.arrayContaining(extras)); expect(hidden).toHaveLength(6);
    expect(doc.querySelectorAll('group[name^="joint-"]')).toHaveLength(22);
    for (const joint of doc.querySelectorAll('group[name^="joint-"]')) {
      expect(vector(joint, "scale", [1, 1, 1])).toEqual([1, 1, 1]); expect(joint.closest("mesh")).toBeNull();
    }
    for (const part of CAT_ANATOMY) {
      const mesh = doc.querySelector(`mesh[name="${part.id}"]`)!;
      expect(mesh.parentElement?.getAttribute("name")).toMatch(/^joint-/);
      expect(mesh.querySelector(":scope > boxgeometry")?.getAttribute("args")).toBe(part.args.join(","));
    }
    for (const name of ["accessory-neck", "accessory-head", "accessory-back"]) expect(doc.querySelector(`group[name="${name}"]`)?.children).toHaveLength(0);
  });
  for (const fixture of fixtures) {
    it(`${fixture.id}: complete actual SSR worlds against frozen browser`, () => {
      const doc = new DOMParser().parseFromString(renderToStaticMarkup(model(fixture)), "text/html"); assertWorlds(doc, fixture.rest);
    });
    it(`${fixture.id}: actual callback follows rigid joints; bind and registry identity are stable`, async () => {
      const container = document.createElement("div"), root = createRoot(container);
      const compile = vi.spyOn(rig, "buildCatSkeleton"), poses = vi.spyOn(legacy, "resolveCatPartPose"), applied = vi.spyOn(frameModule, "applyCatIdleFrame");
      let registry: ReadonlyMap<string, unknown> | undefined;
      try {
        await act(async () => root.render(model(fixture)));
        container.querySelectorAll("mesh,group").forEach(setters);
        const initialPositions = new Map(Array.from(container.querySelectorAll("mesh")).map(e => [e.getAttribute("name"), e.getAttribute("position")]));
        poses.mockClear();
        for (const sample of fixture.idle) {
          frame.current!({ clock: { getElapsedTime: () => 100 + sample.time } }, 0);
          expect(poses).not.toHaveBeenCalled();
          assertWorlds(container, sample.state);
          for (const element of container.querySelectorAll("mesh")) expect(element.getAttribute("position")).toBe(initialPositions.get(element.getAttribute("name")));
          const current = applied.mock.calls.at(-1)![0].meshes;
          if (registry) expect(current).toBe(registry); else registry = current;
          expect([...current.keys()].sort()).toEqual(["eyeL", "eyeR", "earL", "earR", "tailMid", "tailTip"].sort());
        }
        expect(compile).toHaveBeenCalledTimes(1);
      } finally {
        await act(async () => root.unmount()); if (registry) expect(registry.size).toBe(0);
        compile.mockRestore(); poses.mockRestore(); applied.mockRestore();
      }
    });
  }
});
