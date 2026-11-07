import { Quaternion, type Matrix4, type Object3D } from "three";
import { CAT_JOINT_IDS, compileCatPose } from "./cat-pose-data";
import { CatPoseBind } from "./cat-pose-bind";
import { prepareCatPoseLibrary, prepareCatPoseSimulation } from "./cat-pose-transfer";
import { BASE_SIZE, CAT_POSE_LIBRARY, type CatPoseLibrary, type PoseTrack } from "./cat-pose-tracks";
import type { CatPoseFrame, CatPoseSimulation } from "./cat-pose-simulation";
import type { CatPoseDiagnostics, CatPosePreview } from "./cat-pose-preview";
import type { CatCareEvent } from "./cat-pose-types";
import type { CatSkeleton } from "./cat-skeleton";
import type { NeedVisualCues } from "./need-visuals";

export type CatPoseRenderInputs = {
  cues: NeedVisualCues;
  reducedMotion: boolean;
  reactPulse: number;
  careEvent?: CatCareEvent;
  posePreview?: CatPosePreview;
};
export type CatPoseEventLedger = { careSequence: number; reactPulse: number };

function changedPreview(a: CatPosePreview | undefined, b: CatPosePreview | undefined) {
  if (!a || !b) return a !== b;
  return a.pose !== b.pose || a.definition !== b.definition || a.transition?.from !== b.transition?.from
    || a.transition?.to !== b.transition?.to || a.transition?.progress !== b.transition?.progress
    || a.transition?.playing !== b.transition?.playing;
}

/** One fixed clock, prepared Core/Bind, no legacy root bob or tail animation. */
export class CatPoseRenderer {
  simulation!: CatPoseSimulation;
  bind!: CatPoseBind;
  private library!: CatPoseLibrary;
  private accumulator = 0;
  private calibratedWorld: Matrix4 | null = null;
  private readonly qa = new Quaternion();
  private readonly qb = new Quaternion();
  private readonly delta = new Quaternion();
  private readonly override = new Float64Array(BASE_SIZE);
  private previewFrame!: CatPoseFrame;
  private previewTracks: PoseTrack[] = [];
  private previewDuration = 0;
  private previewStartTick = 0;
  private lastTouchTick = -1;
  private yaw = 0;
  private pitch = 0;
  private reduced: boolean;
  readonly diagnostics: CatPoseDiagnostics = {
    tick: 0, transitionProgress: 1, plantedFeet: 0, unreachableFeet: 0,
    maxFootDrift: null, maxFootDriftPx: null, maxSeamGap: null, maxFloorPenetration: null, cpuMs: 0,
  };

  constructor(
    private skeleton: CatSkeleton,
    private joints: ReadonlyMap<string, Object3D>,
    private boxes: ReadonlyMap<string, Object3D>,
    private inputs: CatPoseRenderInputs,
    private readonly seed: number,
    private readonly ledger: CatPoseEventLedger = { careSequence: -1, reactPulse: 0 },
  ) {
    this.reduced = inputs.posePreview?.reducedMotion ?? inputs.reducedMotion;
    this.reset();
    this.synchronize(inputs);
  }

  /** New rest geometry/world transform, same Core/clock/intent. */
  rebind(skeleton: CatSkeleton, joints: ReadonlyMap<string, Object3D>, boxes: ReadonlyMap<string, Object3D>) {
    const root = joints.get("joint-root")!.parent;
    root?.updateWorldMatrix(true, false);
    // Same nodes can acquire a new outer scale. Only the parent world matrix is
    // calibration input; displayed joint/box transforms are never a rest oracle.
    if (skeleton === this.skeleton && joints === this.joints && boxes === this.boxes
      && (root ? this.calibratedWorld?.equals(root.matrixWorld) : this.calibratedWorld === null)) return;
    this.skeleton = skeleton; this.joints = joints; this.boxes = boxes;
    this.reset(true);
  }

  private reset(rebind = false) {
    // Both initial preparation and rebind calibrate from authoritative REST.
    for (const joint of this.skeleton.joints) {
      const node = this.joints.get(joint.id)!;
      node.position.set(...joint.position); node.rotation.set(...joint.rotation); node.scale.set(1, 1, 1);
    }
    for (const bind of this.skeleton.bindings.values()) {
      const node = this.boxes.get(bind.part.id)!;
      node.position.set(...bind.position); node.scale.set(...bind.scale); node.quaternion.identity(); node.visible = bind.visible;
    }
    const root = this.joints.get("joint-root")!.parent;
    const anchors = new Map<string, Object3D>();
    for (const anchor of this.skeleton.anchors) {
      const node = root?.getObjectByName(anchor.id);
      if (node) { node.position.set(...anchor.position); node.scale.set(1, 1, 1); anchors.set(anchor.id, node); }
    }
    this.bind = new CatPoseBind(this.skeleton, this.joints, this.boxes, anchors);
    this.calibratedWorld = root?.matrixWorld.clone() ?? null;
    this.simulation = prepareCatPoseSimulation(this.skeleton, { seed: this.seed, cues: this.inputs.cues, reducedMotion: this.reduced }, this.bind, rebind ? this.simulation : undefined);
    this.library = prepareCatPoseLibrary(this.skeleton);
    if (!rebind) this.accumulator = 0;
    this.previewTracks = []; this.previewDuration = 0;
    const preview = this.inputs.posePreview;
    if (preview) {
      const pose = preview.transition?.from ?? preview.pose;
      if (!rebind) {
        this.simulation.enqueue({ tick: 1, kind: "reducedMotion", value: true });
        this.simulation.enqueue({ tick: 1, kind: "pose", pose });
        this.simulation.step();
        this.simulation.enqueue({ tick: 2, kind: "reducedMotion", value: this.reduced });
      }
      if (preview.transition) {
        const route = this.library.routes[preview.transition.from][preview.transition.to];
        this.previewTracks = route.slice(0, -1).map((from, i) => this.library.tracks[from][route[i + 1]]!);
        this.previewDuration = this.previewTracks.reduce((sum, track) => sum + track.duration, 0);
      }
      const edited = compileCatPose(preview.definition), original = CAT_POSE_LIBRARY.stable[preview.pose].base;
      for (let i = 0; i < CAT_JOINT_IDS.length; i++) {
        this.qa.fromArray(original, i * 4).invert().multiply(this.qb.fromArray(edited.rotations[CAT_JOINT_IDS[i]])).toArray(this.override, i * 4);
      }
      for (let i = 0; i < 3; i++) this.override[88 + i] = edited.rootOffset[i] - original[88 + i];
      this.override[91] = edited.headingDeg - original[91];
    }
    if (!rebind) this.previewStartTick = this.simulation.tick;
    const initial = this.simulation.sample();
    this.previewFrame = { ...initial, base: initial.base.slice(), rotations: initial.rotations.slice(), rootOffset: initial.rootOffset.slice() };
  }

  /** Called from effects/events, never from the render callback. */
  synchronize(inputs: CatPoseRenderInputs) {
    const old = this.inputs, reset = changedPreview(old.posePreview, inputs.posePreview);
    this.inputs = inputs;
    const reduced = inputs.posePreview?.reducedMotion ?? inputs.reducedMotion;
    if (reset) { this.reduced = reduced; this.reset(); }
    const tick = this.simulation.tick + 1;
    if (old.cues !== inputs.cues) this.simulation.enqueue({ tick, kind: "cues", cues: inputs.cues });
    if (this.reduced !== reduced) { this.simulation.enqueue({ tick, kind: "reducedMotion", value: reduced }); this.reduced = reduced; }
    const care = inputs.careEvent, newCare = care !== undefined && care.sequence > this.ledger.careSequence;
    if (newCare) { this.simulation.enqueue({ tick, kind: "care", action: care.action, sequence: care.sequence }); this.ledger.careSequence = care.sequence; }
    if (inputs.reactPulse > this.ledger.reactPulse && !(newCare && care.action === "play") && this.lastTouchTick !== tick) {
      this.simulation.enqueue({ tick, kind: "pet" });
    }
    this.ledger.reactPulse = inputs.reactPulse;
  }

  look(x: number, y: number) {
    this.yaw = Math.max(-45, Math.min(45, x * 45));
    this.pitch = Math.max(-25, Math.min(20, y * 25));
    this.simulation.enqueue({ tick: this.simulation.tick + 1, kind: "look", yawDeg: this.yaw, pitchDeg: this.pitch });
  }

  touch() {
    const tick = this.simulation.tick + 1;
    this.simulation.enqueue({ tick, kind: "touch", yawDeg: this.yaw, pitchDeg: this.pitch });
    this.simulation.enqueue({ tick, kind: "pet" });
    this.lastTouchTick = tick;
  }

  private preview(source: CatPoseFrame, time: number): CatPoseFrame {
    const preview = this.inputs.posePreview;
    if (!preview) return source;
    const output = this.previewFrame;
    // Copy scalars without allocating or aliasing Core's reusable buffers.
    const baseBuffer = output.base, rotations = output.rotations, rootOffset = output.rootOffset;
    Object.assign(output, source);
    output.base = baseBuffer; output.rotations = rotations; output.rootOffset = rootOffset;
    // Authoring preview owns base height and contacts. A concurrent successful
    // PLAY still runs in Core, but its jump kinematics never reinterpret an
    // authored static/edge sample as a seated jump (or move its support hull).
    output.jumpPhase = null; output.bounce = 0; output.bathRoll = 0;
    let base = this.library.stable[preview.pose].base;
    output.pose = preview.pose; output.transitionFrom = output.transitionTo = null; output.transitionProgress = 1;
    output.visibleMask = this.library.stable[preview.pose].visible | (source.visibleMask & 48);
    output.supportMask = this.library.stable[preview.pose].supports;
    if (preview.transition && this.previewDuration > 0) {
      const progress = this.reduced ? 1 : Math.min(1, preview.transition.progress
        + (preview.transition.playing ? Math.max(0, time - this.previewStartTick) / this.previewDuration : 0));
      let remaining = progress * this.previewDuration;
      let track = this.previewTracks[this.previewTracks.length - 1];
      for (const candidate of this.previewTracks) { track = candidate; if (remaining <= track.duration) break; remaining -= track.duration; }
      const tick = Math.min(track.duration - 1, Math.floor(remaining)), alpha = remaining - tick;
      const a = tick * BASE_SIZE, b = a + BASE_SIZE;
      for (let i = 0; i < 88; i += 4) this.qa.fromArray(track.frames, a + i).slerp(this.qb.fromArray(track.frames, b + i), alpha).normalize().toArray(output.base, i);
      for (let i = 88; i < BASE_SIZE; i++) output.base[i] = track.frames[a + i] + (track.frames[b + i] - track.frames[a + i]) * alpha;
      base = output.base; output.pose = progress === 1 ? track.to : track.from;
      output.transitionFrom = track.from; output.transitionTo = track.to; output.transitionProgress = remaining / track.duration; output.supportMask = -1;
      // Gameplay routes OR both endpoint stables with the track's authored
      // per-tick visibility (simulation resolve parity). A single-endpoint
      // fallback hid fitted forearm/shin boxes mid-transition and separated the
      // rendered leg chain (T7 L188 defect).
      output.visibleMask = (this.library.stable[track.from].visible | this.library.stable[track.to].visible
        | (track.visibility?.[Math.ceil(remaining)] ?? 0)) | (source.visibleMask & 48);
    } else output.base.set(base);
    for (let i = 0; i < 88; i += 4) {
      this.delta.fromArray(source.base, i).invert().multiply(this.qb.fromArray(source.rotations, i));
      // A bath shake cannot rotate an authored belly/side support hull. Preview
      // owns torso/head samples during that gesture; normal gameplay is intact.
      if (source.bathRoll && (i === 4 || i === 12)) this.delta.identity();
      this.qa.fromArray(base, i);
      if (!preview.transition) this.qa.multiply(this.qb.fromArray(this.override, i));
      this.qa.normalize().toArray(output.base, i);
      this.qa.multiply(this.delta).normalize().toArray(output.rotations, i);
    }
    for (let i = 88; i < BASE_SIZE; i++) if (!preview.transition) output.base[i] += this.override[i];
    for (let i = 0; i < 3; i++) output.rootOffset[i] = output.base[88 + i];
    output.headingDeg = output.base[91];
    if (!preview.breathing) output.bodyBreath = 1;
    return output;
  }

  private apply(source: CatPoseFrame, time: number) {
    const frame = this.preview(source, time);
    this.bind.apply(frame, this.inputs.posePreview?.showHidden);
    return frame;
  }

  /** Only elapsed R3F delta drives time. Bind sees crossed ticks BEFORE display. */
  render(seconds: number): CatPoseFrame {
    const started = performance.now();
    this.accumulator += Math.max(0, Math.min(.25, Number.isFinite(seconds) ? seconds : 0));
    while (this.accumulator + 1e-12 >= 1 / 60) {
      this.apply(this.simulation.sample(1), this.simulation.tick);
      this.simulation.step();
      this.accumulator = Math.max(0, this.accumulator - 1 / 60);
    }
    const frame = this.apply(this.simulation.sample(this.accumulator * 60), Math.max(0, this.simulation.tick - 1 + this.accumulator * 60));
    const actual = this.bind.contacts.diagnostics, mask = actual.requestedMask!;
    this.diagnostics.tick = frame.tick; this.diagnostics.transitionProgress = frame.transitionProgress;
    this.diagnostics.plantedFeet = (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
    this.diagnostics.unreachableFeet = actual.unreachableFeet!; this.diagnostics.maxFootDrift = actual.maxFootDrift;
    this.diagnostics.cpuMs = performance.now() - started;
    if (this.inputs.posePreview?.diagnostics) this.inputs.posePreview.diagnostics.current = this.diagnostics;
    return frame;
  }
}
