import { expect, it } from "vitest";
import { CatPoseRenderer, type CatPoseRenderInputs } from "@/features/pet-home/cat-pose-renderer";
import { CAT_POSES, CAT_POSE_IDS } from "@/features/pet-home/cat-pose-data";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { PREVIEW_PET_NEEDS } from "@/features/pet-home/pet-stats";
import { poseScene } from "./cat-pose-fixture";

const inputs = (): CatPoseRenderInputs => ({ cues: needVisualCues(PREVIEW_PET_NEEDS), reducedMotion: false, reactPulse: 0 });
const preview = (pose: typeof CAT_POSE_IDS[number]) => ({ pose, definition: CAT_POSES[pose], breathing: true, reducedMotion: false, showHidden: false, contacts: true, selectedJoint: null });
function setup(input = inputs()) {
  const rig = poseScene(0), renderer = new CatPoseRenderer(rig.skeleton, rig.joints, rig.boxes, input, 0);
  return { rig, renderer };
}

it("copies the seven prepared poses to real rigid nodes without mutating Core base", () => {
  for (const pose of CAT_POSE_IDS) {
    const input = { ...inputs(), posePreview: preview(pose) }, { rig, renderer } = setup(input);
    const original = renderer.simulation.sample().base.slice();
    const frame = renderer.render(0);
    expect(frame.pose, pose).toBe(pose);
    expect(renderer.simulation.sample().base, pose).toEqual(original);
    for (const node of rig.joints.values()) {
      expect(node.scale.toArray(), pose).toEqual([1, 1, 1]);
      expect(node.quaternion.toArray().every(Number.isFinite), pose).toBe(true);
    }
    expect(renderer.diagnostics.maxFootDriftPx).toBeNull();
    expect(renderer.diagnostics.maxSeamGap).toBeNull();
  }
}, 30_000);

it("keeps one clock and follows graph preview playback, seek and reduced-motion cuts", () => {
  const input: CatPoseRenderInputs = { ...inputs(), posePreview: { ...preview("seated"), transition: { from: "seated", to: "sphinx", progress: 0, playing: true } } };
  const { renderer } = setup(input);
  let frame = renderer.render(0);
  for (let i = 0; i < 60; i++) frame = renderer.render(1 / 60);
  expect(frame.pose).toBe("sphinx");
  expect(frame.transitionProgress).toBe(1);
  renderer.synchronize({ ...input, posePreview: { ...input.posePreview!, transition: { from: "seated", to: "sphinx", progress: .5, playing: false } } });
  frame = renderer.render(0);
  expect(frame.transitionProgress).toBe(.5);
  renderer.synchronize({ ...input, posePreview: { ...input.posePreview!, reducedMotion: true } });
  frame = renderer.render(1 / 60);
  expect(frame.pose).toBe("sphinx"); expect(frame.bodyBreath).toBe(1); expect(frame.bounce).toBe(0);
}, 30_000);

it("delivers four explicit care reactions once and records real support failures separately", () => {
  const input = inputs(), { renderer } = setup(input);
  const observed = { feed: false, play: false, sleep: false, bathe: false };
  const physical: { action: string; tick: number; unreachable: number; drift: number | null }[] = [];
  let sequence = 0;
  for (const action of ["feed", "play", "bathe", "sleep"] as const) {
    const careEvent = { action, sequence: ++sequence };
    renderer.synchronize({ ...input, careEvent, reactPulse: action === "play" ? 1 : 0 });
    for (let i = 0; i < 600; i++) {
      const frame = renderer.render(1 / 60);
      if (action === "feed" && frame.plateVisible) observed.feed = true;
      if (action === "play" && frame.bounce > 0) observed.play = true;
      if (action === "sleep" && frame.sleeping) observed.sleep = true;
      if (action === "bathe" && Math.abs(frame.rotations[5 * 4 + 2]) > .05) observed.bathe = true;
      if (renderer.diagnostics.unreachableFeet || (renderer.diagnostics.maxFootDrift ?? 0) > .001) {
        if (!physical.some(row => row.action === action)) physical.push({ action, tick: frame.tick, unreachable: renderer.diagnostics.unreachableFeet, drift: renderer.diagnostics.maxFootDrift });
      }
    }
    // Same event after its gesture must not replay on an ordinary rerender.
    renderer.synchronize({ ...input, careEvent, reactPulse: action === "play" ? 1 : 0 });
    for (let i = 0; i < 60; i++) expect(renderer.render(1 / 60).plateVisible).toBe(false);
  }
  expect(observed).toEqual({ feed: true, play: true, sleep: true, bathe: true });
  // Functional wiring is not the physical gate: preserve actual failures for
  // the owner-requested preliminary video instead of manufacturing a green gate.
  console.info("PRELIMINARY_OPEN_SUPPORT_FAILURES", JSON.stringify(physical));
}, 30_000);

it("keeps planted care supports reachable without accepting small drift", () => {
  const input: CatPoseRenderInputs = {
    ...inputs(),
    cues: needVisualCues({ hunger: 0, fun: 100, energy: 100, hygiene: 100 }),
  };
  const { renderer } = setup(input);
  const physical: { action: string; tick: number; unreachable: number; drift: number | null }[] = [];
  let sequence = 0;
  for (const action of ["feed", "play", "bathe", "sleep"] as const) {
    const careEvent = { action, sequence: ++sequence };
    renderer.synchronize({ ...input, careEvent, reactPulse: action === "play" ? 1 : 0 });
    for (let i = 0; i < 600; i++) {
      const frame = renderer.render(1 / 60);
      const { unreachableFeet, maxFootDrift } = renderer.diagnostics;
      const missingActiveDrift = maxFootDrift === null && renderer.diagnostics.plantedFeet > 0;
      if ((unreachableFeet !== 0 || missingActiveDrift || (maxFootDrift ?? 0) > .001)
        && !physical.some(row => row.action === action)) {
        // Snapshot borrowed diagnostics immediately, never retain their object.
        physical.push({ action, tick: frame.tick, unreachable: unreachableFeet, drift: maxFootDrift });
      }
    }
    renderer.synchronize({ ...input, careEvent, reactPulse: action === "play" ? 1 : 0 });
    for (let i = 0; i < 60; i++) renderer.render(1 / 60);
  }
  expect(physical, JSON.stringify(physical)).toEqual([]);
}, 30_000);

it("responds to mouse and touch on the next fixed tick without legacy root bob", () => {
  const { renderer } = setup();
  renderer.look(5, 5); renderer.touch();
  renderer.render(1 / 60);
  let frame = renderer.render(1 / 60);
  expect(frame.earInterest).toBe(1);
  for (let i = 0; i < 60; i++) frame = renderer.render(1 / 60);
  expect(frame.gazeYaw).toBeGreaterThan(0); expect(frame.gazeYaw).toBeLessThanOrEqual(45);
  expect(frame.gazePitch).toBeGreaterThan(0); expect(frame.gazePitch).toBeLessThanOrEqual(20);
  expect(frame.rootOffset[0]).toBe(0); expect(frame.rootOffset[2]).toBe(0);
}, 30_000);
