/** @vitest-environment jsdom */
import React, { Profiler } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Euler, Vector3 } from "three";
import { Cat3DModel } from "@/features/pet-home/components/Cat3DModel";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";

const wire = vi.hoisted(() => ({ callback: undefined as unknown as (state: { clock: { getElapsedTime: () => number } }, delta: number) => void,
  frame: vi.fn((_input: unknown) => .42), random: vi.fn((array: Uint32Array) => { array[0] = 123; return array; }) }));
vi.mock("@react-three/fiber", () => ({ useFrame: (callback: typeof wire.callback) => { wire.callback = callback; } }));
vi.mock("@/features/pet-home/cat-idle-frame", () => ({ applyCatIdleFrame: wire.frame }));
const healthy = { hunger: 100, fun: 100, energy: 100, hygiene: 100 };
beforeEach(() => {
  wire.frame.mockClear(); wire.random.mockClear();
  vi.stubGlobal("React", React); vi.stubGlobal("crypto", { getRandomValues: wire.random });
  vi.spyOn(console, "error").mockImplementation((message: unknown, ...args: unknown[]) => {
    if (!/incorrect casing|React does not recognize|non-boolean attribute|unrecognized in this browser/.test(String(message)))
      throw Error([message, ...args].join(" "));
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("connects the real component's root/six refs, current data and returned bounce, without frame rerenders", () => {
  const commits = vi.fn();
  const element = (needs = healthy, design = defaultCatDesign(), pulse = 1) =>
    <Profiler id="model" onRender={commits}><Cat3DModel colors={DEFAULT_GREY_COAT}
      needs={needs} design={design} reactPulse={pulse} /></Profiler>;
  const view = render(element());
  const group = view.container.querySelector("group")!;
  // Connection-only DOM host: vectors let the old root callback run for assertion RED.
  Object.assign(group, { position: new Vector3(), rotation: new Euler(), scale: new Vector3(1, 1, 1) });
  const count = commits.mock.calls.length;
  act(() => wire.callback({ clock: { getElapsedTime: () => 0 } }, .01));
  expect(wire.frame).toHaveBeenCalledTimes(1);
  const first = wire.frame.mock.calls[0][0] as unknown as {
    root: unknown; meshes: Map<string, unknown>; elapsedSeconds: number; deltaSeconds: number;
    bounce: number; seed: number; reducedMotion: boolean; cues: { energyLow: boolean };
    resolved: Map<string, { scale?: number[] }>;
  };
  expect(first.root).toBe(group);
  expect([...first.meshes.keys()].sort()).toEqual(["earL", "earR", "eyeL", "eyeR", "tailMid", "tailTip"]);
  for (const [id, ref] of first.meshes) expect(ref).toBe(view.container.querySelector(`mesh[name="${id}"]`));
  expect(first.elapsedSeconds).toBe(0); expect(first.deltaSeconds).toBe(.01);
  expect(first.bounce).toBe(1); expect(first.seed).toBe(123);
  act(() => wire.callback({ clock: { getElapsedTime: () => 4 } }, .01));
  expect((wire.frame.mock.calls[1][0] as unknown as { bounce: number }).bounce).toBe(.42);
  expect(commits.mock.calls.length).toBe(count);
  view.rerender(element({ hunger: 0, fun: 0, energy: 0, hygiene: 0 }, { ...defaultCatDesign(), earSize: 1.6 }, 1));
  act(() => wire.callback({ clock: { getElapsedTime: () => 4.1 } }, .01));
  const current = wire.frame.mock.calls[2][0] as unknown as typeof first;
  expect(current.seed).toBe(first.seed); expect(wire.random).toHaveBeenCalledTimes(1);
  expect(current.cues.energyLow).toBe(true);
  expect(current.resolved.get("earL")!.scale).toEqual([1.6, 1.6, 1.6]);
  view.unmount();
  render(element()); expect(wire.random).toHaveBeenCalledTimes(2);
  act(() => wire.callback({ clock: { getElapsedTime: () => 123 } }, .01));
  expect((wire.frame.mock.calls[3][0] as unknown as { elapsedSeconds: number }).elapsedSeconds).toBe(0);
});
