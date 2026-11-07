/** @vitest-environment jsdom */
import * as React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Vector3 } from "three";
import { CatPoseDriver } from "@/features/pet-home/components/CatPoseDriver";
import { CatPoseRenderer } from "@/features/pet-home/cat-pose-renderer";
import type { CatPoseFrame } from "@/features/pet-home/cat-pose-simulation";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { lifecycleHost, physicalRig } from "./cat-pose-driver-lifecycle.fixture";

const host = vi.hoisted(() => ({
  value: null as ReturnType<typeof lifecycleHost> | null,
  frames: new Set<(state: ReturnType<typeof lifecycleHost>["state"], delta: number) => void>(),
}));
vi.mock("@react-three/fiber", () => ({
  useThree: (select: (state: ReturnType<typeof lifecycleHost>["state"]) => unknown) => select(host.value!.state),
  useFrame: (callback: (state: ReturnType<typeof lifecycleHost>["state"], delta: number) => void) => {
    React.useLayoutEffect(() => { host.frames.add(callback); return () => { host.frames.delete(callback); }; }, [callback]);
  },
}));
const input = { cues: needVisualCues({ hunger: 100, fun: 100, energy: 100, hygiene: 100 }), reducedMotion: false, reactPulse: 0 };
function snapshot(frame: CatPoseFrame) {
  return { ...frame, base: Array.from(frame.base), rotations: Array.from(frame.rotations), rootOffset: Array.from(frame.rootOffset) };
}
let observed: ReturnType<typeof snapshot>;
let support: { unreachable: number; drift: number | null };
beforeEach(() => {
  vi.stubGlobal("React", React);
  host.value = lifecycleHost();
  const real = CatPoseRenderer.prototype.render;
  vi.spyOn(CatPoseRenderer.prototype, "render").mockImplementation(function (this: CatPoseRenderer, delta) {
    const frame = real.call(this, delta);
    observed = snapshot(frame);
    support = { unreachable: this.diagnostics.unreachableFeet, drift: this.diagnostics.maxFootDrift };
    return frame;
  });
});
afterEach(() => { cleanup(); host.frames.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function advance(delta = 1 / 60) {
  act(() => { for (const callback of host.frames) callback(host.value!.state, delta); });
}
function props() {
  const h = host.value!;
  return { skeleton: h.scene.skeleton, joints: h.scene.joints, boxes: h.scene.boxes, root: h.root,
    interact: h.interact, seed: 13, yawBias: 0, orbiting: false, input };
}
function assertPhysical() {
  const actual = physicalRig(host.value!.scene);
  expect(actual.unit).toBe(true);
  expect(actual.floor).toBeGreaterThanOrEqual(-.291);
  expect(actual.gap, JSON.stringify(actual.worst)).toBeLessThanOrEqual(.001);
  expect(support.unreachable).toBe(0);
  if (observed.supportMask > 0) expect(support.drift).not.toBeNull();
  if (support.drift !== null) expect(support.drift).toBeLessThanOrEqual(.001);
}

it("S4/S10 recalibrates same-node Driver support after ten ticks at scale1 then one at .8", () => {
  const p = props();
  const mounted = render(<CatPoseDriver {...p} modelScale={1} />);
  for (let tick = 0; tick < 10; tick++) advance();
  expect(observed.tick).toBe(10); assertPhysical();
  mounted.rerender(<CatPoseDriver {...p} modelScale={.8} />);
  advance();
  console.info("scale-witness", JSON.stringify({ tick: observed.tick, ...support, scale: host.value!.scene.root.scale.x }));
  expect(observed.tick).toBe(11);
  expect(observed.pose).toBe("seated"); expect(observed.supportMask).toBe(15);
  expect(host.value!.scene.root.scale.x).toBe(.8);
  assertPhysical();
  // Compare public worlds to an authoritative-rest rig prepared at the final
  // scale and sampled at the same time, never to the displayed pre-scale nodes.
  const expected = lifecycleHost().scene;
  expected.root.position.set(0, -.22, 0); expected.root.scale.setScalar(.8);
  const cold = new CatPoseRenderer(expected.skeleton, expected.joints, expected.boxes, input, 13);
  for (let tick = 0; tick < 11; tick++) cold.render(1 / 60);
  for (const [id, node] of host.value!.scene.joints) {
    const reference = expected.joints.get(id)!;
    expect(node.getWorldPosition(new Vector3()).distanceTo(reference.getWorldPosition(new Vector3()))).toBeLessThanOrEqual(.001);
    expect(node.quaternion.angleTo(reference.quaternion)).toBeLessThanOrEqual(1e-6);
  }
});

it.each([.8, 1])("S7/S8 retains fractional clock, sleep intention/deadline and consumed events at scale %s", scale => {
  const p = { ...props(), input: { ...input, careEvent: { action: "sleep" as const, sequence: 1 } } };
  const expected = lifecycleHost().scene;
  expected.root.position.set(0, -.22, 0); expected.root.scale.setScalar(scale);
  const control = new CatPoseRenderer(expected.skeleton, expected.joints, expected.boxes, p.input, 13);
  const mounted = render(<CatPoseDriver {...p} modelScale={1} />);
  // A cold correct-scale control must agree in every public Core/layer field,
  // not just object identity or lack of an exception. Scale is not a new action.
  const step = (delta = 1 / 60) => {
    const reference = snapshot(control.render(delta));
    advance(delta);
    expect(observed).toEqual(reference);
  };
  for (let tick = 0; tick < 600; tick++) step();
  expect(observed.sleeping).toBe(true); expect(observed.pose).toBe("curled");
  step(1 / 120);
  const before = observed;
  // Fresh input objects carry the already-consumed event: it must not replay.
  mounted.rerender(<CatPoseDriver {...p} input={{ ...p.input, careEvent: { ...p.input.careEvent } }} modelScale={scale} />);
  step(0);
  expect(observed).toEqual(before); assertPhysical();
  expect(observed.supportMask).toBe(0); expect(support.drift).toBeNull();
  step(1 / 120);
  expect(observed.tick).toBe(before.tick + 1); assertPhysical();
  let wakeTick = 0;
  for (let tick = 0; tick < 3500; tick++) {
    step();
    if (!observed.sleeping) { wakeTick = observed.tick; break; }
  }
  expect(wakeTick).toBeGreaterThan(3600);
  expect(observed.transitionTo).not.toBe("standing"); assertPhysical();
  // Gaze/touch still reaches the existing clock after the resize/no-op branch.
  act(() => { host.value!.interact.current!(); }); control.touch();
  step(); assertPhysical();
});
