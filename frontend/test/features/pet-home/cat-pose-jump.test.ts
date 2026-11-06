import { expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { CAT_POSES } from "@/features/pet-home/cat-pose-data";
import { CatPoseRenderer, type CatPoseRenderInputs } from "@/features/pet-home/cat-pose-renderer";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { measureRenderedContactDomain } from "./cat-pose-rendered-contact-domain";
import { poseScene } from "./cat-pose-fixture";

const feet = ["wristFL", "wristFR", "ankleBL", "ankleBR"];
function setup(hunger = 0, reducedMotion = false) {
  const rig = poseScene(hunger);
  const input: CatPoseRenderInputs = { cues: needVisualCues({ hunger, fun: 100, energy: 100, hygiene: 100 }), reducedMotion, reactPulse: 1,
    careEvent: { action: "play", sequence: 1 } };
  const renderer = new CatPoseRenderer(rig.skeleton, rig.joints, rig.boxes, input, 0);
  return { rig, input, renderer };
}
function support(renderer: CatPoseRenderer) {
  const d = renderer.bind.contacts.diagnostics;
  expect(d.unreachableFeet).toBe(0);
  expect(d.maxFootDrift ?? 0).toBeLessThanOrEqual(.001);
  if (d.requestedMask) expect(d.maxFootDrift).not.toBeNull();
}

it("PLAY releases feet for real flight, then replants the fixed goals and settles", () => {
  const { rig, input, renderer } = setup();
  const goals = renderer.bind.contacts.copyGoalsInto(new Float64Array(12));
  const phases = new Set<string>();
  let peak = 0, releases = 0, priorMask = 15;
  const flexed = new Set<string>();
  for (let tick = 0; tick < 140; tick++) {
    if (tick === 60) renderer.synchronize(input); // same success and pulse must not replay
    const frame = renderer.render(1 / 60);
    if (frame.jumpPhase) phases.add(frame.jumpPhase);
    peak = Math.max(peak, frame.bounce);
    if (frame.bounce < -.001 && (frame.jumpPhase === "prepare" || frame.jumpPhase === "settle")) {
      flexed.add(frame.jumpPhase);
      expect(renderer.diagnostics.plantedFeet).toBe(4);
      expect(rig.joints.get("joint-elbowFL")!.quaternion.angleTo(new Quaternion())).toBeGreaterThan(.001);
    }
    const mask = renderer.bind.contacts.diagnostics.requestedMask!;
    if (!mask && priorMask) releases++;
    priorMask = mask;
    if (frame.bounce > 0) {
      expect(renderer.diagnostics.plantedFeet, `flight tick ${tick}`).toBe(0);
      expect(renderer.diagnostics.maxFootDrift).toBeNull();
      for (const id of ["pawFL", "pawFR", "pawBL", "pawBR"]) {
        expect(Math.min(...rig.corners(id).map(p => p.y))).toBeGreaterThan(-.29);
      }
    }
    support(renderer);
    expect(renderer.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
    expect(frame.rootOffset[0]).toBe(0); expect(frame.rootOffset[2]).toBe(0); expect(frame.headingDeg).toBe(0);
  }
  expect([...phases]).toEqual(["prepare", "takeoff", "airborne", "landing", "settle"]);
  expect(peak).toBeCloseTo(.04, 12); expect(releases).toBe(1);
  expect([...flexed]).toEqual(["prepare", "settle"]);
  expect(renderer.diagnostics.plantedFeet).toBe(4);
}, 30_000);

it.each(Array.from({ length: 101 }, (_, h) => h))("PLAY h%d: full breath extrema, fractional release/landing, floor and rendered chains", hunger => {
  const { rig, renderer } = setup(hunger);
  const goals = renderer.bind.contacts.copyGoalsInto(new Float64Array(12));
  const previous = new Map<number, Vector3[]>();
  for (let tick = 0; tick < 52; tick++) {
    renderer.render(1 / 60);
    for (const alpha of [0, .5, 1]) for (const breath of [.99, 1, 1.01]) {
      const frame = renderer.simulation.sample(alpha);
      // Public Bind input permits the exact physical-domain extrema independent
      // of the live sinusoid. Borrowed buffers are consumed before next sample.
      frame.bodyBreath = breath;
      renderer.bind.apply(frame); rig.root.updateMatrixWorld(true);
      support(renderer);
      const mask = renderer.bind.contacts.diagnostics.requestedMask;
      expect(mask).toBe(frame.jumpPhase === "takeoff" || frame.jumpPhase === "airborne" ? 0 : 15);
      expect(renderer.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals);
      for (const [id, node] of rig.boxes) if (node.visible) for (const p of rig.corners(id)) {
        expect(p.toArray().every(Number.isFinite)).toBe(true);
        expect(p.y, `h${hunger}/${tick}/${alpha}/${breath}/${id}`).toBeGreaterThanOrEqual(-.291);
      }
      if (alpha === 1 && (frame.jumpPhase === "takeoff" || frame.jumpPhase === "landing")) {
        // Same release/landing instant, identical geometry and full breath:
        // compare supported left/right limit with released FK, NOT tick motion.
        const boundary = { ...frame, jumpPhase: "airborne" as const, supportMask: 0 };
        renderer.bind.apply(boundary); rig.root.updateMatrixWorld(true);
        const free = [...rig.joints.values()].map(node => ({ p: node.getWorldPosition(new Vector3()), q: node.getWorldQuaternion(new Quaternion()), m: node.matrixWorld.clone() }));
        renderer.bind.apply({ ...frame, jumpPhase: "landing", supportMask: 15 }); rig.root.updateMatrixWorld(true);
        [...rig.joints.values()].forEach((node, i) => {
          expect(node.getWorldPosition(new Vector3()).distanceTo(free[i].p), `handoff h${hunger}/${frame.jumpPhase}/${breath}/${node.name}`).toBeLessThanOrEqual(.001);
          expect(node.getWorldQuaternion(new Quaternion()).angleTo(free[i].q)).toBeLessThanOrEqual(1e-6);
          expect(Math.max(...node.matrixWorld.elements.map((v, j) => Math.abs(v - free[i].m.elements[j])))).toBeLessThanOrEqual(.001);
        });
        renderer.bind.apply(frame);
      }
      if (alpha === 1) {
        const paws = feet.map(id => rig.joints.get("joint-" + id)!.getWorldPosition(new Vector3()));
        const old = previous.get(breath);
        if (old && (frame.jumpPhase === "takeoff" || frame.jumpPhase === "landing")) {
          paws.forEach((p, i) => expect(p.distanceTo(old[i]), `h${hunger}/${frame.jumpPhase}/${breath}`).toBeLessThan(.002));
        }
        previous.set(breath, paws);
        if ([8, 16, 24].includes(tick)) {
          for (const link of measureRenderedContactDomain(rig).contacts.filter(l => l.kind === "structural")) {
            expect(link.distance, `${link.parent}/${link.child}`).toBeLessThanOrEqual(.001);
            // S25 retains the original distal pivot across hidden extensions
            // as diagnostic only; actual rendered box contact is the gate.
          }
        }
      }
      for (const node of rig.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
    }
  }
  expect(renderer.bind.contacts.diagnostics.requestedMask).toBe(15);
}, 30_000);

it.each([7, 8, 9, 16, 23, 24, 25])("PLAY tick%d: cancellation and care retarget land before redirect, within18 ticks", at => {
  for (const kind of ["pose", "care", "touch"] as const) {
    const { renderer, input, rig } = setup();
    for (let tick = 0; tick < at; tick++) renderer.render(1 / 60);
    const requested = renderer.simulation.tick;
    if (kind === "care") renderer.synchronize({ ...input, careEvent: { action: "feed", sequence: 2 } });
    else if (kind === "touch") renderer.touch();
    else renderer.simulation.enqueue({ tick: requested + 1, kind: "pose", pose: "standing" });
    let redirected = false, oldPaws = feet.map(id => rig.joints.get("joint-" + id)!.getWorldPosition(new Vector3()));
    for (let tick = 0; tick < 90; tick++) {
      const frame = renderer.render(1 / 60); support(renderer);
      const paws = feet.map(id => rig.joints.get("joint-" + id)!.getWorldPosition(new Vector3()));
      if (frame.jumpPhase === "landing") paws.forEach((p, i) => expect(p.distanceTo(oldPaws[i])).toBeLessThan(.002));
      oldPaws = paws;
      if (frame.transitionTo || (kind === "touch" && frame.jumpPhase === null)) {
        if (!redirected) expect(renderer.simulation.tick - requested).toBeLessThanOrEqual(18);
        redirected = true;
      }
      if (frame.bounce > 0) expect(renderer.diagnostics.plantedFeet).toBe(0);
    }
    expect(redirected).toBe(true);
    expect(renderer.diagnostics.plantedFeet).toBe(4);
  }
}, 30_000);

it("reduced motion cuts flight safely to supported rest and never resumes a hidden jump", () => {
  for (const at of [0, 7, 8, 16, 23, 24, 25]) {
    const { renderer, input } = setup(100, at === 0);
    for (let tick = 0; tick < at; tick++) renderer.render(1 / 60);
    renderer.synchronize({ ...input, reducedMotion: true });
    for (let tick = 0; tick < 60; tick++) {
      const frame = renderer.render(1 / 60);
      expect(frame.jumpPhase).toBeNull(); expect(frame.bounce).toBe(0); expect(frame.bodyBreath).toBe(1);
      expect(renderer.diagnostics.plantedFeet).toBe(4); support(renderer);
    }
    renderer.synchronize({ ...input, reducedMotion: false });
    for (let tick = 0; tick < 60; tick++) expect(renderer.render(1 / 60).bounce).toBe(0);
  }
}, 30_000);


it.each(["care-before-cut", "pose-before-cut", "latest-pose-before-cut", "cut-before-care", "care-before-cut-same-tick", "cut-before-pose"])("composed intent %s survives reduced-motion flight cut", order => {
  const { renderer, input } = setup();
  for (let i = 0; i < 16; i++) renderer.render(1 / 60);
  const care = { ...input, careEvent: { action: "feed" as const, sequence: 2 } };
  const pose = () => renderer.simulation.enqueue({ tick: renderer.simulation.tick + 1, kind: "pose", pose: "standing" });
  if (order.startsWith("cut-before")) {
    // synchronize enqueues reducedMotion BEFORE successful care at the same tick.
    renderer.synchronize({ ...(order === "cut-before-care" ? care : input), reducedMotion: true });
    if (order === "cut-before-pose") pose();
  } else {
    if (order === "pose-before-cut") pose();
    else renderer.synchronize(care);
    if (order !== "care-before-cut-same-tick") renderer.render(1 / 60);
    if (order === "latest-pose-before-cut") {
      renderer.simulation.enqueue({ tick: renderer.simulation.tick + 1, kind: "pose", pose: "loaf" });
      renderer.render(1 / 60);
    }
    renderer.synchronize({ ...(order === "pose-before-cut" ? input : care), reducedMotion: true });
  }
  const target = order === "latest-pose-before-cut" ? "loaf" : "standing";
  const cut = renderer.render(1 / 60);
  expect(cut.pose).toBe(target); expect(cut.transitionTo).toBeNull();
  expect(cut.jumpPhase).toBeNull(); expect(cut.bounce).toBe(0); expect(cut.bodyBreath).toBe(1); support(renderer);
  // Same sequence/pulse is consumed once, including a deferred successful care.
  if (!order.includes("pose")) {
    expect(cut.plateVisible).toBe(true);
    renderer.synchronize({ ...care, reducedMotion: true });
    for (let i = 0; i < 180; i++) renderer.render(1 / 60);
    expect(renderer.render(0).plateVisible).toBe(false);
  }
}, 30_000);

it.each(["standing", "sphinx", "edge"] as const)("authoring preview %s owns jump metadata and root height over actual PLAY", kind => {
  const { renderer, input } = setup();
  const pose = kind === "edge" ? "standing" : kind;
  renderer.synchronize({ ...input, posePreview: { pose, definition: CAT_POSES[pose], breathing: true, reducedMotion: false,
    contacts: true, showHidden: false, selectedJoint: null,
    ...(kind === "edge" ? { transition: { from: "standing" as const, to: "seated" as const, progress: .5, playing: false } } : {}) },
    careEvent: { action: "play", sequence: 2 }, reactPulse: 2 });
  let actualFlight = false;
  for (let i = 0; i < 130; i++) {
    const frame = renderer.render(1 / 60);
    actualFlight ||= renderer.simulation.sample(1).bounce > .03;
    expect(frame.jumpPhase).toBeNull(); expect(frame.bounce).toBe(0);
    expect(frame.pose).toBe(pose); support(renderer);
    expect(frame.rootOffset[0]).toBe(0); expect(frame.rootOffset[2]).toBe(0);
  }
  expect(actualFlight).toBe(true); // preview precedence never removes actual Core PLAY
}, 30_000);
