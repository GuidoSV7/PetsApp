// S7 (owner decision A) — an interruption must FINISH the current authored support segment
// instead of blending it into the next leg across the whole remaining leg. `startRoute` /
// `blend` / `advanceBase` slerp rotations and lerp the base under one eased weight, so two
// individually grounded configurations blend into an ungrounded one: the declared belly support
// ends up between 4.7 mm and 69 mm above the floor in this replay (~10 cm on the real browser
// chapter, L210), the S19 seat yanks the rig down to it, and the un-blended limb rotations can
// leave rendered geometry under the floor. These tests pin three things: no frame is ever
// bridged, the interrupted leg lands on its authored endpoint inside the S7 nine-tick window,
// and uninterrupted legs keep their authored one-tick-per-tick progression.
import { expect, it } from "vitest";
import { Vector3 } from "three";
import { CatPoseRenderer } from "@/features/pet-home/cat-pose-renderer";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";
import type { CatPoseId } from "@/features/pet-home/cat-pose-types";
import { poseScene } from "./cat-pose-fixture";

const cues = needVisualCues({ hunger: 100, fun: 100, energy: 100, hygiene: 100 });
const FRAME = 1 / 30;
const ENTRY = 165; // measured sleep-entry span: seated -> sphinx -> side -> curled
const FLOOR = -.291;
const SEAT = .001;
const WINDOW = 9; // S7: a complete interruption costs at most 300 ms at 30 Hz
const FRACTIONS = [.15, .5, .75];

type Scene = ReturnType<typeof poseScene>;
type Row = { tick: number; from: CatPoseId | null; to: CatPoseId | null; progress: number };

function setup() {
  const scene = poseScene(100);
  const renderer = new CatPoseRenderer(scene.skeleton, scene.joints, scene.boxes,
    { cues, reducedMotion: false, reactPulse: 0 }, 13);
  return { scene, renderer };
}

/** Lowest world-space corner over the boxes that actually render at this frame. */
function lowest(scene: Scene, v: Vector3) {
  let floor = Infinity, part = "";
  for (const [id, node] of scene.boxes) {
    if (!node.visible) continue;
    const args = scene.skeleton.bindings.get(id)!.part.args;
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      v.set(x * args[0] / 2, y * args[1] / 2, z * args[2] / 2).applyMatrix4(node.matrixWorld);
      if (v.y < floor) { floor = v.y; part = id; }
    }
  }
  return { floor, part };
}

function duration(from: CatPoseId, to: CatPoseId) {
  const edge = CAT_POSE_EDGES.find(e => e.from === from && e.to === to);
  if (!edge) throw new RangeError(`No authored edge ${from} -> ${to}`);
  return edge.durationTicks;
}

/** Interrupt the sleep entry at `fraction` of its span with a feed request. */
function interrupt(fraction: number) {
  const { scene, renderer } = setup();
  const sim = renderer.simulation;
  sim.enqueue({ tick: 1, kind: "care", action: "sleep", sequence: 1 });
  const target = 1 + Math.round(fraction * ENTRY);
  while (sim.tick < target) renderer.render(FRAME);
  const requestTick = sim.tick + 1;
  sim.enqueue({ tick: requestTick, kind: "care", action: "feed", sequence: 2 });
  return { scene, renderer, sim, requestTick };
}

it("S7 an interrupted leg never leaves the rig bridged, off the floor or seated by the body correction", () => {
  const metrics = FRACTIONS.map(fraction => {
    const { scene, renderer } = interrupt(fraction);
    const v = new Vector3();
    let worst = Infinity, worstPart = "", worstTick = 0, seat = 0, seatTick = 0, bridged = 0;
    for (let i = 0; i < 200; i++) {
      const frame = renderer.render(FRAME);
      scene.root.updateMatrixWorld(true);
      const { floor, part } = lowest(scene, v);
      if (floor < worst) { worst = floor; worstPart = part; worstTick = frame.tick; }
      // `bodySupportCorrection` is a nonblocking diagnostic: it reports the distance the
      // declared body support had to be moved to reach the floor, so any value beyond the
      // current tolerance means the base arrived ungrounded.
      const correction = Math.abs(renderer.bind.contacts.diagnostics.bodySupportCorrection ?? 0);
      if (correction > seat) { seat = correction; seatTick = frame.tick; }
      if (frame.bridging) bridged++;
    }
    return { fraction, worst, worstPart, worstTick, seat, seatTick, bridged };
  });
  console.info("interrupt-witness " + JSON.stringify(metrics));
  for (const m of metrics) {
    const where = `fraction ${m.fraction}`;
    expect.soft(m.worst, `${where}: ${m.worstPart} below the floor at tick ${m.worstTick}`).toBeGreaterThanOrEqual(FLOOR);
    expect.soft(m.seat, `${where}: declared body support seated by ${m.seat} at tick ${m.seatTick}`).toBeLessThanOrEqual(SEAT);
    expect.soft(m.bridged, `${where}: bridged configurations`).toBe(0);
  }
}, 240000);

it("S7 the interrupted support segment lands within nine ticks and the next leg starts landed", () => {
  const measured = FRACTIONS.map(fraction => {
    const { sim, requestTick } = interrupt(fraction);
    const rows: (Row & { landing: number })[] = [];
    for (let i = 0; i < 80; i++) {
      sim.step();
      const frame = sim.sample(1);
      rows.push({ tick: sim.tick, from: frame.transitionFrom, to: frame.transitionTo,
        progress: frame.transitionProgress, landing: frame.landingTicks });
    }
    const first = rows[0];
    if (first.from === null || first.to === null) throw new RangeError(`fraction ${fraction}: no authored leg under way`);
    const leg = `${first.from}:${first.to}`;
    const span = duration(first.from, first.to);
    const switchAt = rows.findIndex(row => `${row.from}:${row.to}` !== leg);
    if (switchAt < 1) throw new RangeError(`fraction ${fraction}: ${leg} never stopped being the sampled arc`);
    // The last tick that still advanced the authored leg at its own authored rate is the request
    // tick itself: a non-sharing destination lands on the very next tick (S7, whole-interruption
    // budget), so the compression window opens there.
    let plain = rows[0].tick;
    for (let i = 1; i < switchAt; i++) {
      if (Math.abs((rows[i].progress - rows[i - 1].progress) - 1 / span) <= 1e-12) plain = rows[i].tick;
    }
    const window = rows.filter(row => row.landing > 0);
    return { fraction, requestTick, leg, switchAt, plain, window,
      landed: rows[switchAt], next: rows[switchAt + 1] };
  });
  console.info("landing-witness " + JSON.stringify(measured.map(m => ({ fraction: m.fraction, leg: m.leg,
    request: m.requestTick, plain: m.plain, landed: m.landed.tick, windows: m.window[0]?.landing ?? 0 }))));
  for (const m of measured) {
    const where = `fraction ${m.fraction}`;
    // The window is the S7 budget: at most nine simulation ticks (300 ms at 30 Hz).
    expect.soft(m.window.length, `${where}: no compressed landing window after tick ${m.plain}`).toBeGreaterThan(0);
    if (m.window.length === 0) continue;
    const ticks = m.window[0].landing + 1;
    expect.soft(ticks, `${where}: landing window of ${ticks} ticks from tick ${m.plain}`).toBeLessThanOrEqual(WINDOW);
    expect.soft(ticks, `${where}: window is not contiguous`).toBe(m.window.length + 1);
    // The interrupted leg reaches its authored endpoint as a stable landed configuration.
    expect.soft(m.landed.progress, `${where}: ${m.leg} abandoned at progress ${m.landed.progress}`).toBe(1);
    expect.soft(m.landed.from, `${where}: landed frame still advertises an arc`).toBe(null);
    expect.soft(m.landed.to, `${where}: landed frame still advertises an arc`).toBe(null);
    // ...and the pending route then starts as a plain authored leg from that configuration.
    expect.soft(m.next.from !== null && m.next.to !== null, `${where}: no authored leg after landing`).toBe(true);
    expect.soft(m.next.tick - m.landed.tick, `${where}: next leg started ${m.next.tick - m.landed.tick} ticks after landing`).toBe(1);
    expect.soft(m.next.progress, `${where}: next leg begins at progress ${m.next.progress}`).toBe(0);
    // Total latency: the whole interruption costs at most 300 ms at 30 Hz.
    expect.soft(m.next.tick - m.requestTick, `${where}: new leg in effect ${m.next.tick - m.requestTick} ticks after the request`).toBeLessThanOrEqual(WINDOW + 1);
    expect.soft(m.plain, `${where}: window opened before the request at tick ${m.requestTick}`).toBeGreaterThanOrEqual(m.requestTick);
  }
}, 240000);

it("S7 uninterrupted authored legs keep their one-tick-per-tick progression", () => {
  const { renderer } = setup();
  const sim = renderer.simulation;
  const seen = new Set<string>();
  let previous: { pair: string; progress: number } | null = null;
  sim.enqueue({ tick: 1, kind: "care", action: "sleep", sequence: 1 });
  for (let i = 0; i < 200; i++) {
    sim.step();
    const frame = sim.sample(1);
    if (!frame.transitionFrom || !frame.transitionTo) { previous = null; continue; }
    const pair = `${frame.transitionFrom}:${frame.transitionTo}`;
    seen.add(pair);
    const span = duration(frame.transitionFrom, frame.transitionTo);
    if (previous && previous.pair === pair) {
      // An uninterrupted leg advances exactly one authored tick per tick; the only allowed zero
      // step is the completion tick that publishes the next arc at progress 0 one tick early.
      const delta = frame.transitionProgress - previous.progress;
      if (delta === 0) expect(frame.transitionProgress, `tick ${frame.tick}: ${pair}`).toBe(0);
      else expect(delta, `tick ${frame.tick}: ${pair}`).toBeCloseTo(1 / span, 12);
    }
    previous = { pair, progress: frame.transitionProgress };
  }
  expect([...seen]).toEqual(["seated:sphinx", "sphinx:side", "side:curled"]);
}, 120000);
