/** @vitest-environment jsdom */
import * as React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Cat3DModel } from "@/features/pet-home/components/Cat3DModel";
import { CatPoseDriver } from "@/features/pet-home/components/CatPoseDriver";
import { CatPoseMountContext } from "@/features/pet-home/cat-pose-mount-context";
import { CatPoseRenderer } from "@/features/pet-home/cat-pose-renderer";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { lifecycleHost, physicalRig, publicFrame } from "./cat-pose-driver-lifecycle.fixture";
import { Vector3 } from "three";

const adapter = vi.hoisted(() => ({
  host: null as ReturnType<typeof lifecycleHost> | null,
  skeletons: [] as React.ComponentProps<typeof CatPoseDriver>["skeleton"][],
  frames: new Set<(state: ReturnType<typeof lifecycleHost>["state"], delta: number) => void>(),
}));
vi.mock("@react-three/fiber", () => ({
  useThree: (select: (state: ReturnType<typeof lifecycleHost>["state"]) => unknown) => select(adapter.host!.state),
  useFrame: (callback: (state: ReturnType<typeof lifecycleHost>["state"], delta: number) => void) => {
    React.useLayoutEffect(() => { adapter.frames.add(callback); return () => { adapter.frames.delete(callback); }; }, [callback]);
  },
}));
// React DOM supplies effects/ref lifetime, not a Three/WebGL reconciler. Model
// anatomy/skeleton derivation is real; its host nodes are replaced with the
// existing poseScene factory's real rig. No renderer or simulation is mocked.
// Keep actual Model geometry/material props observable through the DOM host.
// Driver still receives poseScene's real nodes rather than these DOM refs.
vi.mock("@/features/pet-home/components/CatPoseDriver", async original => {
  const real = await original<typeof import("@/features/pet-home/components/CatPoseDriver")>();
  return { CatPoseDriver: (props: React.ComponentProps<typeof real.CatPoseDriver>) => {
    adapter.skeletons.push(props.skeleton);
    const host = adapter.host!;
    if (host.scene.skeleton.bindings.get("body")!.scale[0] !== props.skeleton.bindings.get("body")!.scale[0]) {
      const next = lifecycleHost(props.input.cues.hungerLow ? 0 : 100);
      // Endpoint scenarios must actually supply matching new geometry/nodes.
      expect(next.scene.skeleton).toEqual(props.skeleton);
      host.scene = next.scene; host.root.current = next.scene.root;
    }
    return <real.CatPoseDriver {...props} joints={host.scene.joints} boxes={host.scene.boxes} root={host.root} interact={host.interact} />;
  } };
});

const needs = { hunger: 100, fun: 100, energy: 100, hygiene: 100 };
const dirty = { ...needs, hygiene: 0 };
const careEvent = { action: "sleep" as const, sequence: 1 };
let observed: ReturnType<typeof publicFrame>;
let support: { unreachable: number; drift: number | null };

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.spyOn(crypto, "getRandomValues").mockImplementation(array => {
    (array as Uint32Array).fill(13); return array;
  });
  adapter.host = lifecycleHost(); adapter.skeletons.length = 0;
  const real = CatPoseRenderer.prototype.render;
  vi.spyOn(CatPoseRenderer.prototype, "render").mockImplementation(function (this: CatPoseRenderer, seconds) {
    const frame = real.call(this, seconds);
    observed = publicFrame(frame);
    support = { unreachable: this.diagnostics.unreachableFeet, drift: this.diagnostics.maxFootDrift };
    return frame;
  });
});
afterEach(() => { cleanup(); adapter.frames.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function advance(ticks: number, delta = 1 / 60) {
  act(() => { for (let i = 0; i < ticks; i++) for (const callback of adapter.frames) callback(adapter.host!.state, delta); });
}
function assertPhysical() {
  const actual = physicalRig(adapter.host!.scene);
  expect(actual.unit).toBe(true); expect(actual.floor).toBeGreaterThanOrEqual(-.291);
  expect(actual.gap, JSON.stringify({ frame: observed, actual })).toBeLessThanOrEqual(.001); expect(support.unreachable).toBe(0);
  if (observed.supportMask > 0) expect(support.drift).not.toBeNull();
  if (support.drift !== null) expect(support.drift).toBeLessThanOrEqual(.001);
}
function assertSleepHold() {
  expect(observed.sleeping).toBe(true);
  expect(observed.pose).toBe("curled");
  expect(observed.transitionFrom).toBeNull(); expect(observed.transitionTo).toBeNull();
  expect(support.unreachable).toBe(0);
  // Curled uses body support, not planted feet: foot drift is inapplicable.
  expect(observed.supportMask).toBe(0); expect(support.drift).toBeNull();
}
function assertContinuity(before: ReturnType<typeof publicFrame>) {
  expect.soft(observed.tick, "ordinary needs updates must not restart the fixed clock").toBe(before.tick + 1);
  expect.soft(observed.sleeping, "hygiene is not a wake action").toBe(true);
  expect.soft(observed.pose, "sleep hold must not snap to seated REST").toBe(before.pose);
  expect.soft(observed.supportMask).toBe(before.supportMask);
  expect.soft(observed.transitionFrom).toBeNull(); expect.soft(observed.transitionTo).toBeNull();
  expect.soft(observed.rootOffset).toEqual(before.rootOffset);
  expect.soft(support.unreachable).toBe(0);
  if (support.drift !== null) expect.soft(support.drift).toBeLessThanOrEqual(.001);
}

it("preserves sleep hold across hygiene-only needs updates", () => {
  const design = defaultCatDesign();
  const model = (value: typeof needs) => <CatPoseMountContext.Provider value={{ careEvent }}>
    <Cat3DModel colors={DEFAULT_GREY_COAT} design={design} needs={value} />
  </CatPoseMountContext.Provider>;
  const mounted = render(model(needs));
  advance(600); assertSleepHold(); // ten real simulation seconds, far below the 60s hold deadline
  const before = observed!, oldRig = adapter.skeletons.at(-1)!;
  mounted.rerender(model(dirty));
  const newRig = adapter.skeletons.at(-1)!;
  // Preserve behavior whether an equal rig is reused or recreated.
  expect(newRig).toEqual(oldRig); // hygiene changes dirt, not anatomy/geometry
  advance(1);
  console.info("needs-replacement-witness", JSON.stringify({ rigWasRecreated: newRig !== oldRig, before, after: observed!, support: support! }));
  assertContinuity(before);
});

it("genuine morphology preserves sleeping hold and its original timeout", () => {
  const design = defaultCatDesign();
  const model = (hunger: number) => <CatPoseMountContext.Provider value={{ careEvent }}>
    <Cat3DModel colors={DEFAULT_GREY_COAT} design={design} needs={{ ...needs, hunger }} />
  </CatPoseMountContext.Provider>;
  const control = lifecycleHost();
  const runtime = new CatPoseRenderer(control.scene.skeleton, control.scene.joints, control.scene.boxes,
    { cues: needVisualCues(needs), reducedMotion: false, reactPulse: 0, careEvent }, 13);
  let deadline = 0, slept = false;
  for (let i = 0; i < 4000; i++) {
    const frame = runtime.render(1 / 60);
    if (frame.sleeping) slept = true;
    else if (slept) { deadline = frame.tick; break; }
  }
  expect(deadline).toBeGreaterThan(3600);
  const mounted = render(model(100)); advance(600); assertSleepHold();
  for (const hunger of [0, 100]) {
    const before = observed!, scale = adapter.host!.scene.boxes.get("body")!.scale.x;
    advance(1, 1 / 120); // retain a real half-tick through rest recalibration
    mounted.rerender(model(hunger)); advance(1, 1 / 120);
    console.info("genuine-rig-sleep", JSON.stringify({ hunger, before, after: observed! }));
    expect(adapter.host!.scene.boxes.get("body")!.scale.x).not.toBe(scale);
    expect.soft(observed.tick).toBe(before.tick + 1);
    expect.soft(observed.pose).toBe("curled"); expect.soft(observed.sleeping).toBe(true);
    expect.soft(observed.supportMask).toBe(0); expect.soft(observed.transitionTo).toBeNull();
    assertPhysical();
    // Compare to a cold new-rest renderer at the SAME clock/sample, not an
    // adjacent old-shape frame: geometry is legitimately different across rigs.
    const actual = adapter.host!.scene, expected = lifecycleHost(hunger).scene;
    expected.root.position.copy(actual.root.position); expected.root.scale.copy(actual.root.scale);
    const cold = new CatPoseRenderer(expected.skeleton, expected.joints, expected.boxes,
      { cues: needVisualCues({ ...needs, hunger }), reducedMotion: false, reactPulse: 0, careEvent }, 13);
    const saved = observed!, savedSupport = support;
    for (let tick = 0; tick < saved.tick; tick++) cold.render(1 / 60);
    for (const [id, node] of actual.joints) {
      const reference = expected.joints.get(id)!;
      expect(node.getWorldPosition(new Vector3()).distanceTo(reference.getWorldPosition(new Vector3()))).toBeLessThanOrEqual(.001);
      expect(node.quaternion.angleTo(reference.quaternion)).toBeLessThanOrEqual(1e-6);
    }
    observed = saved; support = savedSupport;
  }
  while (observed.tick < deadline - 1) advance(1);
  expect(observed.sleeping).toBe(true);
  advance(1);
  expect(observed.sleeping).toBe(false);
  expect(observed.transitionTo).not.toBe("standing");
}, 30_000);

it("genuine morphology preserves active sleep-route progress and reduced-motion cuts", () => {
  const design = defaultCatDesign();
  const model = (hunger: number) => <CatPoseMountContext.Provider value={{ careEvent }}>
    <Cat3DModel colors={DEFAULT_GREY_COAT} design={design} needs={{ ...needs, hunger }} />
  </CatPoseMountContext.Provider>;
  const mounted = render(model(100)); advance(25);
  const before = observed!;
  expect(before.transitionTo).toBe("sphinx");
  mounted.rerender(model(0)); advance(1, 0);
  expect(observed.tick).toBe(before.tick);
  expect(observed.transitionFrom).toBe(before.transitionFrom); expect(observed.transitionTo).toBe(before.transitionTo);
  expect(observed.transitionProgress).toBe(before.transitionProgress); assertPhysical();
  for (let tick = 0; tick < 160; tick++) { advance(1); assertPhysical(); }
  expect(observed.sleeping).toBe(true);
  // Existing public preference ordering still cuts to the active intention.
  const host = adapter.host!;
  const renderer = new CatPoseRenderer(host.scene.skeleton, host.scene.joints, host.scene.boxes,
    { cues: needVisualCues({ ...needs, hunger: 0 }), reducedMotion: true, reactPulse: 0, careEvent }, 13);
  const reduced = publicFrame(renderer.render(1 / 60));
  expect(reduced.pose).toBe("curled"); expect(reduced.sleeping).toBe(true);
  expect(reduced.bodyBreath).toBe(1); expect(reduced.bounce).toBe(0);
  const next = lifecycleHost(100).scene;
  renderer.rebind(next.skeleton, next.joints, next.boxes);
  const rebound = publicFrame(renderer.render(1 / 60));
  expect(rebound.tick).toBe(reduced.tick + 1); expect(rebound.pose).toBe("curled");
  expect(rebound.sleeping).toBe(true); expect(rebound.bodyBreath).toBe(1); expect(rebound.bounce).toBe(0);
});

it("genuine morphology preserves flight and the latest deferred sleep intention", () => {
  const design = defaultCatDesign();
  const model = (hunger: number, action: "play" | "sleep", sequence: number) => <CatPoseMountContext.Provider value={{ careEvent: { action, sequence } }}>
    <Cat3DModel colors={DEFAULT_GREY_COAT} design={design} needs={{ ...needs, hunger }} />
  </CatPoseMountContext.Provider>;
  const mounted = render(model(100, "play", 1)); advance(17);
  expect(observed.jumpPhase).toBe("airborne");
  mounted.rerender(model(100, "sleep", 2)); advance(1);
  const before = observed!;
  mounted.rerender(model(0, "sleep", 2)); advance(1);
  console.info("genuine-rig-flight", JSON.stringify({ before, after: observed! }));
  expect.soft(observed.tick).toBe(before.tick + 1);
  expect.soft(observed.jumpPhase).toBe("airborne"); expect.soft(observed.supportMask).toBe(0);
  expect.soft(observed.bounce).toBeGreaterThan(0); expect.soft(observed.sleeping).toBe(false);
  assertPhysical();
  for (let tick = 0; tick < 40; tick++) { advance(1); assertPhysical(); }
  advance(560); assertSleepHold(); assertPhysical();
});

it("true unmount clears interaction and local queue; a new seed selects a fresh sleep", () => {
  const design = defaultCatDesign();
  const model = () => <CatPoseMountContext.Provider value={{ careEvent }}>
    <Cat3DModel colors={DEFAULT_GREY_COAT} design={design} needs={needs} />
  </CatPoseMountContext.Provider>;
  const first = render(model()); advance(600); assertSleepHold();
  first.unmount(); expect(adapter.host!.interact.current).toBeNull(); expect(adapter.frames.size).toBe(0);
  vi.mocked(crypto.getRandomValues).mockImplementation(array => { (array as Uint32Array).fill(14); return array; });
  render(model()); advance(1);
  expect(observed.tick).toBe(1); expect(observed.sleeping).toBe(false);
  advance(599);
  expect(observed.pose).toBe("side"); expect(observed.sleeping).toBe(true); assertPhysical();
});

it("keeps hygiene color updates and hunger/admin morphology updates live", () => {
  const design = defaultCatDesign();
  const model = (value = needs, settings = design) => <Cat3DModel colors={DEFAULT_GREY_COAT} design={settings} needs={value} />;
  const mounted = render(model());
  const body = () => mounted.container.querySelector('mesh[name="body"]')!;
  const color = () => body().querySelector("meshstandardmaterial")!.getAttribute("color");
  const initialScale = body().getAttribute("scale"), initialColor = color();
  mounted.rerender(model(dirty));
  expect(body().getAttribute("scale")).toBe(initialScale);
  expect(color()).not.toBe(initialColor);
  mounted.rerender(model({ ...needs, hunger: 0 }));
  expect(body().getAttribute("scale")).not.toBe(initialScale);
  mounted.rerender(model());
  expect(body().getAttribute("scale")).toBe(initialScale);
  const head = () => mounted.container.querySelector('group[name="joint-head"]')!.getAttribute("position");
  const initialHead = head();
  mounted.rerender(model(needs, { ...design, headHeight: .1 }));
  expect(head()).not.toBe(initialHead);
});

it("preserves existing same-rig sleep synchronization without replaying consumed care", () => {
  const host = adapter.host!;
  const props = { skeleton: host.scene.skeleton, joints: host.scene.joints, boxes: host.scene.boxes,
    root: host.root, interact: host.interact, modelScale: 1, seed: 13, yawBias: 0, orbiting: false };
  const input = { cues: needVisualCues(needs), reducedMotion: false, reactPulse: 0, careEvent };
  const mounted = render(<CatPoseDriver {...props} input={input} />);
  advance(600); assertSleepHold(); const before = observed!;
  mounted.rerender(<CatPoseDriver {...props} input={{ ...input, cues: needVisualCues(dirty) }} />);
  advance(1);
  console.info("same-rig-witness", JSON.stringify({ before, after: observed!, support: support! }));
  assertContinuity(before); assertSleepHold();
});
