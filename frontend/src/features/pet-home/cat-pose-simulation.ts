import { Euler, Quaternion } from "three";
import { needVisualCues, type NeedVisualCues } from "./need-visuals";
import { PREVIEW_PET_NEEDS } from "./pet-stats";
import { CatIdleCursor } from "./cat-idle-cursor";
import { BASE_SIZE, routes, stable, tracks, type PoseTrack } from "./cat-pose-tracks";
import type { CatCareAction, CatPoseId } from "./cat-pose-types";

export type CatPoseInput = { readonly tick: number } & (
  | { readonly kind: "care"; readonly action: CatCareAction; readonly sequence: number }
  | { readonly kind: "pose"; readonly pose: CatPoseId }
  | { readonly kind: "look" | "touch"; readonly yawDeg: number; readonly pitchDeg: number }
  | { readonly kind: "pet" }
  | { readonly kind: "reducedMotion"; readonly value: boolean }
  | { readonly kind: "cues"; readonly cues: NeedVisualCues }
);
export type CatPoseFrame = {
  tick: number;
  pose: CatPoseId;
  transitionFrom: CatPoseId | null;
  transitionTo: CatPoseId | null;
  transitionProgress: number;
  /** 22 xyzw quaternions, xyz root offset, then separate unwrapped heading. */
  base: Float64Array;
  rotations: Float64Array;
  rootOffset: Float64Array;
  headingDeg: number;
  visibleMask: number;
  /** -1 during transfer: the rig MUST resolve phase contacts; never means no support. */
  supportMask: number;
  bodyBreath: number;
  eyeScale: number;
  gazeYaw: number;
  gazePitch: number;
  earInterest: number;
  idleEarSide: "L" | "R" | null;
  plateVisible: boolean;
  sleeping: boolean;
  bounce: number;
};
export type CatSimulationOptions = { seed: number; reducedMotion?: boolean; cues?: NeedVisualCues };


const DT = 1 / 60;
const RAD = Math.PI / 180;
const durations = { feed: 144, sleep: 120, bathe: 99, play: 48 };
const frequencies = [7, 9, 11, 14, 14, 12, 12];
const damping = [.7, .65, .6, .72, .72, .85, .85];
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const ease = (t: number) => t * t * (3 - 2 * t);

function createFrame(): CatPoseFrame {
  return {
    tick: 0, pose: "seated", transitionFrom: null, transitionTo: null, transitionProgress: 1,
    base: new Float64Array(stable.seated.base), rotations: new Float64Array(stable.seated.base.buffer.slice(0, 88 * 8)),
    rootOffset: new Float64Array(3), headingDeg: 0, visibleMask: 0, supportMask: 15,
    bodyBreath: 1, eyeScale: 1, gazeYaw: 0, gazePitch: 0, earInterest: 0, idleEarSide: null,
    plateVisible: false, sleeping: false, bounce: 0,
  };
}
function copyFrame(from: CatPoseFrame, to: CatPoseFrame) {
  to.base.set(from.base); to.rotations.set(from.rotations); to.rootOffset.set(from.rootOffset);
  to.tick = from.tick; to.pose = from.pose;
  to.transitionFrom = from.transitionFrom; to.transitionTo = from.transitionTo; to.transitionProgress = from.transitionProgress;
  to.headingDeg = from.headingDeg; to.visibleMask = from.visibleMask; to.supportMask = from.supportMask;
  to.bodyBreath = from.bodyBreath; to.eyeScale = from.eyeScale; to.gazeYaw = from.gazeYaw; to.gazePitch = from.gazePitch;
  to.earInterest = from.earInterest; to.idleEarSide = from.idleEarSide; to.plateVisible = from.plateVisible;
  to.sleeping = from.sleeping; to.bounce = from.bounce;
}

/**
 * Deterministic fixed-step state; enqueue explicit tick-indexed inputs OUTSIDE the
 * render callback. Static tracks/routes compile once. Step/sample reuse buffers.
 * World-space support planning and LAST-layer IK belong to the rig adapter.
 */
export class CatPoseSimulation {
  tick = 0;
  private readonly current = createFrame();
  private readonly previous = createFrame();
  private readonly rendered = createFrame();
  private readonly bridgeStart = new Float64Array(BASE_SIZE);
  private readonly trackSample = new Float64Array(BASE_SIZE);
  private readonly angles = new Float64Array(7);
  private readonly velocities = new Float64Array(7);
  private readonly targets = new Float64Array(7);
  private readonly gestureAngles = new Float64Array(66);
  private readonly outgoingAngles = new Float64Array(66);
  private outgoingTicks = 0;
  private outgoingExtras = 0;
  private outgoingBounce = 0;
  private gestureStatic = false;
  private breathPhase = 0;
  private readonly qa = new Quaternion();
  private readonly qb = new Quaternion();
  private readonly delta = new Quaternion();
  private readonly euler = new Euler();
  private readonly inputs: CatPoseInput[] = [];
  private inputIndex = 0;
  private accumulator = 0;
  private cues: NeedVisualCues;
  private readonly idle: CatIdleCursor;
  private readonly seed: number;
  private reduced: boolean;
  private route: readonly CatPoseId[] = routes.seated.seated;
  private routeIndex = 0;
  private track: PoseTrack | null = null;
  private age = 0;
  private bridgeOnly = false;
  private completedSpan = false;
  private bridging = false;
  /** Destination of the ACTIVE route; newer intentions live in pendingGoal. */
  private goal: CatPoseId = "seated";
  private pendingGoal: CatPoseId | null = null;
  private redirectAt = 0;
  private restPose: CatPoseId = "seated";
  private returnPose: CatPoseId = "seated";
  private action: CatCareAction | null = null;
  private phase: "idle" | "entering" | "gesture" | "hold" = "idle";
  private gestureAge = 0;
  private sleepDeadline = 0;
  private lastSequence = -1;
  private petStart = -1000;
  private squintUntil = 0;
  private gazeTargetYaw = 0;
  private gazeTargetPitch = 0;
  private headYaw = 0;
  private headPitch = 0;
  private neckYaw = 0;
  private neckPitch = 0;
  private interestedUntil = 0;

  constructor(options: CatSimulationOptions) {
    this.seed = options.seed >>> 0;
    this.cues = { ...(options.cues ?? needVisualCues(PREVIEW_PET_NEEDS)) };
    this.reduced = options.reducedMotion ?? false;
    this.gestureStatic = this.reduced;
    this.idle = new CatIdleCursor(this.seed, this.cues);
  }

  /** Input objects/queue compaction allocate only on interaction, never in step. */
  enqueue(input: CatPoseInput): void {
    if (!Number.isInteger(input.tick) || input.tick <= this.tick) throw new RangeError("Pose inputs require a future integer simulation tick.");
    if (this.inputIndex > 0) {
      this.inputs.copyWithin(0, this.inputIndex);
      this.inputs.length -= this.inputIndex;
      this.inputIndex = 0;
    }
    const copy = input.kind === "cues" ? { ...input, cues: { ...input.cues } } : { ...input };
    let at = this.inputs.length;
    this.inputs.push(copy);
    while (at > 0 && this.inputs[at - 1].tick > copy.tick) {
      this.inputs[at] = this.inputs[at - 1]; at--;
    }
    this.inputs[at] = copy;
  }

  advance(seconds: number): CatPoseFrame {
    // A backgrounded tab does not fast-forward simulation-time sleep or springs.
    this.accumulator += clamp(Number.isFinite(seconds) ? seconds : 0, 0, .25);
    while (this.accumulator + 1e-12 >= DT) {
      this.step(); this.accumulator = Math.max(0, this.accumulator - DT);
    }
    return this.sample(this.accumulator / DT);
  }

  step(): void {
    this.completedSpan = false;
    copyFrame(this.current, this.previous);
    this.tick++;
    while (this.inputIndex < this.inputs.length && this.inputs[this.inputIndex].tick <= this.tick) {
      this.applyInput(this.inputs[this.inputIndex++]);
    }
    if (this.pendingGoal !== null && this.tick >= this.redirectAt) {
      const goal = this.pendingGoal; this.pendingGoal = null; this.startRoute(goal);
    }
    this.advanceBase();
    this.advanceReaction();
    this.applyLayers();
    this.current.tick = this.tick;
  }

  private applyInput(input: CatPoseInput) {
    switch (input.kind) {
      case "care":
        if (input.sequence <= this.lastSequence) return;
        this.lastSequence = input.sequence;
        this.fadeGesture();
        this.gestureStatic = this.reduced;
        this.returnPose = this.restPose;
        this.action = input.action; this.phase = "entering"; this.current.sleeping = false;
        this.current.plateVisible = false;
        this.requestGoal(input.action === "feed" ? "standing" : input.action === "sleep"
          ? (this.seed & 1 ? "curled" : "side")
          : input.action === "bathe" && this.current.pose === "standing" ? "standing" : "seated");
        break;
      case "pose":
        this.fadeGesture();
        this.action = null; this.phase = "idle"; this.current.sleeping = false;
        this.requestGoal(input.pose); break;
      case "look":
      case "touch":
        this.gazeTargetYaw = clamp(input.yawDeg, -45, 45);
        this.gazeTargetPitch = clamp(input.pitchDeg, -25, 20);
        this.interestedUntil = this.tick + 18;
        if (input.kind === "touch") {
          this.squintUntil = this.tick + 120;
          if (this.current.sleeping || this.action !== null) this.wake();
        }
        break;
      case "pet":
        this.squintUntil = this.tick + 120;
        if (!this.reduced && !this.current.sleeping && (this.current.pose === "seated" || this.current.pose === "standing" || this.current.pose === "loaf")) this.petStart = this.tick;
        if (this.current.sleeping) this.wake();
        break;
      case "reducedMotion":
        this.reduced = input.value;
        this.angles.fill(0); this.velocities.fill(0);
        if (this.reduced) {
          this.gestureStatic = true; this.petStart = -1000; this.breathPhase = 0;
          this.gestureAngles.fill(0); this.outgoingAngles.fill(0); this.outgoingTicks = 0;
          this.outgoingExtras = 0; this.outgoingBounce = 0;
          const goal = this.pendingGoal ?? this.goal;
          this.pendingGoal = null; this.startRoute(goal);
        }
        break;
      case "cues":
        this.cues = input.cues; this.idle.reset(this.cues, this.tick * DT); break;
    }
  }

  private wake() {
    this.fadeGesture();
    this.current.sleeping = false; this.current.plateVisible = false;
    this.action = null; this.phase = "idle"; this.requestGoal("seated");
  }
  private requestGoal(goal: CatPoseId) {
    if (this.reduced || (!this.track && !this.bridgeOnly)) { this.startRoute(goal); return; }
    this.pendingGoal = goal;
    let remaining = 18;
    if (this.track) for (let i = 0; i < this.track.phaseEnds.length; i++) {
      if (this.track.phaseEnds[i] > this.age) { remaining = this.track.phaseEnds[i] - this.age; break; }
    }
    this.redirectAt = this.tick + Math.min(18, Math.max(0, remaining));
  }
  private startRoute(goal: CatPoseId) {
    this.pendingGoal = null; // A newer immediate route supersedes an old queued one.
    const from = this.track ? (this.age < this.track.duration / 2 ? this.track.from : this.track.to) : this.current.pose;
    this.bridgeStart.set(this.current.base);
    this.goal = goal; this.route = routes[from][goal]; this.routeIndex = 0;
    this.track = this.route.length > 1 ? tracks[this.route[0]][this.route[1]]! : null;
    this.age = 0; this.bridging = false; this.bridgeOnly = this.track === null;
    for (let i = 0; i < BASE_SIZE; i++) if (this.current.base[i] !== stable[from].base[i]) { this.bridging = true; break; }
    if (this.reduced) {
      // Traverse the legal cached route logically, but render only its final stable cut.
      for (let i = 0; i < this.route.length; i++) this.current.pose = this.route[i];
      this.current.base.set(stable[goal].base); this.track = null; this.bridgeOnly = false;
      this.finishGoal();
    } else if (!this.track) {
      let different = false;
      for (let i = 0; i < BASE_SIZE; i++) if (this.current.base[i] !== stable[goal].base[i]) { different = true; break; }
      if (!different) { this.bridgeOnly = false; this.finishGoal(); }
    }
  }
  private finishGoal() {
    this.current.pose = this.goal;
    this.current.transitionFrom = this.current.transitionTo = null;
    this.current.transitionProgress = 1;
    // Reaching the old support segment is not arrival at the newer intention.
    if (this.pendingGoal !== null) return;
    if (this.phase === "entering" && this.action !== null) {
      this.phase = "gesture"; this.gestureAge = 0;
      this.current.sleeping = this.action === "sleep";
    } else if (this.phase === "idle") this.restPose = this.goal;
  }
  private blend(a: Float64Array, b: Float64Array, t: number, output: Float64Array) {
    if (t === 0) { output.set(a); return; }
    if (t === 1) { output.set(b); return; }
    for (let i = 0; i < 88; i += 4) {
      this.qa.fromArray(a, i); this.qb.fromArray(b, i);
      this.qa.slerp(this.qb, t).normalize();
      output[i] = this.qa.x; output[i + 1] = this.qa.y; output[i + 2] = this.qa.z; output[i + 3] = this.qa.w;
    }
    for (let i = 88; i < BASE_SIZE; i++) output[i] = a[i] + (b[i] - a[i]) * t;
  }
  private advanceBase() {
    const track = this.track;
    if (track) {
      const tick = Math.min(this.age, track.duration), offset = tick * BASE_SIZE;
      for (let i = 0; i < BASE_SIZE; i++) this.trackSample[i] = track.frames[offset + i];
      if (this.bridging) this.blend(this.bridgeStart, this.trackSample, ease(tick / track.duration), this.current.base);
      else this.current.base.set(this.trackSample);
      this.current.pose = track.from; this.current.transitionFrom = track.from;
      this.current.transitionTo = track.to; this.current.transitionProgress = tick / track.duration;
      this.age++;
      if (tick === track.duration) {
        this.completedSpan = true;
        this.current.pose = track.to; this.routeIndex++; this.bridging = false;
        if (this.routeIndex < this.route.length - 1) {
          this.track = tracks[this.route[this.routeIndex]][this.route[this.routeIndex + 1]]!; this.age = 0;
          this.current.transitionFrom = this.track.from; this.current.transitionTo = this.track.to; this.current.transitionProgress = 0;
        } else { this.track = null; this.finishGoal(); }
      }
    } else if (this.bridgeOnly) {
      const t = Math.min(1, this.age / 18);
      this.blend(this.bridgeStart, stable[this.goal].base, ease(t), this.current.base);
      this.current.transitionFrom = this.current.pose; this.current.transitionTo = this.goal; this.current.transitionProgress = t;
      this.age++;
      if (t === 1) { this.completedSpan = true; this.bridgeOnly = false; this.finishGoal(); }
    }
    const pose = stable[this.current.pose];
    this.current.visibleMask = pose.visible;
    this.current.supportMask = this.current.transitionTo ? -1 : pose.supports;
    if (this.current.transitionTo) this.current.visibleMask |= stable[this.current.transitionTo].visible;
  }
  private advanceReaction() {
    if (this.phase === "gesture" && this.action) {
      this.gestureAge++;
      if (this.gestureAge >= durations[this.action]) {
        if (this.action === "sleep") { this.phase = "hold"; this.sleepDeadline = this.tick + 3600; }
        else {
          const goal = this.returnPose;
          this.action = null; this.phase = "idle"; this.requestGoal(goal);
        }
      }
    } else if (this.phase === "hold" && this.tick >= this.sleepDeadline) this.wake();
  }
  private append(joint: number, x: number, y: number, z: number) {
    const offset = joint * 4, output = this.current.rotations;
    this.qa.fromArray(output, offset); this.euler.set(x, y, z, "XYZ");
    this.delta.setFromEuler(this.euler); this.qa.multiply(this.delta).normalize();
    output[offset] = this.qa.x; output[offset + 1] = this.qa.y; output[offset + 2] = this.qa.z; output[offset + 3] = this.qa.w;
  }
  private fadeGesture() {
    this.outgoingAngles.set(this.gestureAngles);
    this.outgoingExtras = this.current.visibleMask & 48;
    this.outgoingBounce = this.current.bounce;
    this.outgoingTicks = 9;
  }
  private gesture(joint: number, x: number, y: number, z: number) {
    const offset = joint * 3;
    this.gestureAngles[offset] += x; this.gestureAngles[offset + 1] += y; this.gestureAngles[offset + 2] += z;
  }
  private spring() {
    for (let i = 0; i < this.angles.length; i++) {
      const omega = frequencies[i];
      const acceleration = omega * omega * (this.targets[i] - this.angles[i]) - 2 * damping[i] * omega * this.velocities[i];
      this.velocities[i] = clamp(this.velocities[i] + acceleration * DT, -3, 3);
      this.angles[i] = clamp(this.angles[i] + this.velocities[i] * DT, i < 3 ? -.46 : -.3, i < 3 ? .46 : .3);
    }
  }
  private applyLayers() {
    const frame = this.current, elapsed = this.tick * DT;
    for (let i = 0; i < 88; i++) frame.rotations[i] = frame.base[i];
    for (let i = 0; i < 3; i++) frame.rootOffset[i] = frame.base[88 + i];
    frame.headingDeg = frame.base[91]; frame.plateVisible = false; frame.bounce = 0;
    this.idle.sample(elapsed, this.cues);
    frame.eyeScale = this.idle.eyeScale;
    frame.idleEarSide = this.reduced ? null : this.idle.earSide;
    if (this.tick < this.squintUntil) frame.eyeScale = Math.min(frame.eyeScale, .5);
    if (frame.sleeping) frame.eyeScale = .08;

    const gesturing = this.phase === "gesture";
    const feeding = gesturing && this.action === "feed";
    const staticGesture = this.reduced || this.gestureStatic;
    const weight = staticGesture ? 1 : Math.min(1, this.gestureAge / 9, this.action ? (durations[this.action] - this.gestureAge) / 9 : 1);
    // Outgoing masks fade independently; they NEVER become the next base pose.
    const outgoing = this.outgoingTicks > 0 ? --this.outgoingTicks / 9 : 0;
    for (let i = 0; i < 66; i++) this.gestureAngles[i] = this.outgoingAngles[i] * outgoing;
    if (outgoing > 0) frame.visibleMask |= this.outgoingExtras;
    // Static need geometry/dirt/droop already live in the resolved rest bind.
    if (feeding) {
      this.gesture(2, .18 * weight, 0, 0); this.gesture(3, .22 * weight, 0, 0);
      const mouth = staticGesture || this.gestureAge >= 5;
      if (mouth) {
        frame.plateVisible = true; frame.visibleMask |= 48;
        this.gesture(4, staticGesture ? .05 : (.12 + .10 * Math.sin(this.gestureAge / 144 * Math.PI * 6)) * weight, 0, 0);
      }
    }
    if (gesturing && this.action === "bathe") {
      const washing = this.gestureAge < 72;
      this.gesture(5, 0, 0, washing ? .35 * weight : 0);
      this.gesture(6, 0, 0, washing ? -.35 * weight : 0);
      if (!washing && !staticGesture) {
        const shake = Math.sin((this.gestureAge - 72) * DT * 12 * Math.PI) * .20 * weight;
        this.gesture(1, 0, 0, shake * .2); this.gesture(3, 0, 0, shake);
      }
    }
    for (let joint = 0; joint < 22; joint++) {
      const offset = joint * 3, x = this.gestureAngles[offset], y = this.gestureAngles[offset + 1], z = this.gestureAngles[offset + 2];
      if (x || y || z) this.append(joint, x, y, z);
    }
    if (!this.reduced) {
      frame.bounce = this.outgoingBounce * outgoing;
      if (gesturing && this.action === "play" && !staticGesture && this.gestureAge < 24) frame.bounce = Math.max(frame.bounce, Math.sin(this.gestureAge / 24 * Math.PI) * .04);
      const petAge = this.tick - this.petStart;
      if (petAge >= 0 && petAge < 24) frame.bounce = Math.max(frame.bounce, Math.sin(petAge / 24 * Math.PI) * .04);
    }
    // Idle and look-at: pupil target leads head/neck, each bounded independently.
    const yaw = feeding || frame.sleeping ? 0 : this.gazeTargetYaw;
    const pitch = feeding || frame.sleeping ? 0 : this.gazeTargetPitch;
    frame.gazeYaw += (yaw - frame.gazeYaw) * (1 - Math.exp(-DT / .08));
    frame.gazePitch += (pitch - frame.gazePitch) * (1 - Math.exp(-DT / .08));
    this.headYaw += (yaw * 25 / 45 - this.headYaw) * (1 - Math.exp(-DT / .18));
    this.neckYaw += (yaw * 20 / 45 - this.neckYaw) * (1 - Math.exp(-DT / .24));
    this.headPitch += (pitch * .6 - this.headPitch) * (1 - Math.exp(-DT / .18));
    this.neckPitch += (pitch * .4 - this.neckPitch) * (1 - Math.exp(-DT / .24));
    this.append(2, this.neckPitch * RAD, this.neckYaw * RAD, 0);
    this.append(3, this.headPitch * RAD, this.headYaw * RAD, 0);
    frame.earInterest = this.tick < this.interestedUntil ? 1 : 0;
    if (!this.reduced) this.breathPhase += DT * 2 * Math.PI * (frame.sleeping ? .3 : .4);
    frame.bodyBreath = this.reduced ? 1 : 1 + Math.sin(this.breathPhase) * (frame.sleeping ? .006 : .01 * this.cues.idleAmp);
    // Final bounded secondary layer. A2 never applies the old direct tail sway.
    this.targets.fill(0);
    if (!this.reduced) {
      const phase = elapsed * 2 * this.cues.idleSpeed, amplitude = frame.sleeping ? 0 : this.cues.idleAmp;
      this.targets[0] = Math.sin(phase) * .08 * amplitude;
      this.targets[1] = Math.sin(phase) * .18 * amplitude + this.angles[0] * .25;
      this.targets[2] = Math.sin(phase - .6) * .16 * amplitude + this.angles[1] * .3;
      this.targets[3] = (frame.idleEarSide === "L" ? .25 : 0) + frame.earInterest * .08;
      this.targets[4] = (frame.idleEarSide === "R" ? .25 : 0) + frame.earInterest * .08;
      this.targets[5] = (frame.base[4] - this.previous.base[4]) * 2;
      this.targets[6] = (frame.base[6] - this.previous.base[6]) * 2;
      this.spring();
    }
    for (let i = 0; i < 3; i++) this.append(19 + i, 0, 0, this.angles[i]);
    this.append(5, this.angles[3], 0, 0); this.append(6, this.angles[4], 0, 0);
    this.append(3, this.angles[5], 0, this.angles[6]);
  }

  /** Render interpolation is separate from authoritative fixed-step state. */
  sample(alpha = 1): CatPoseFrame {
    const t = clamp(alpha, 0, 1), output = this.rendered;
    copyFrame(this.current, output);
    if (this.reduced) { output.bodyBreath = 1; output.bounce = 0; return output; }
    if (t < 1) {
      const previous = this.previous, current = this.current;
      output.pose = previous.pose;
      output.transitionFrom = previous.transitionFrom; output.transitionTo = previous.transitionTo;
      output.transitionProgress = previous.transitionProgress;
      output.supportMask = previous.supportMask;
      // Posture extensions follow geometry; discrete gesture feedback stays current.
      output.visibleMask = (previous.visibleMask & 15) | (current.visibleMask & 48);
      if (previous.transitionTo !== null) {
        const sameSpan = previous.transitionFrom === current.transitionFrom && previous.transitionTo === current.transitionTo
          && current.transitionProgress >= previous.transitionProgress;
        const end = sameSpan ? current.transitionProgress
          : this.completedSpan ? 1 : previous.transitionProgress;
        output.transitionProgress += (end - previous.transitionProgress) * t;
      }
    }
    this.blend(this.previous.base, this.current.base, t, output.base);
    if (t === 0) output.rotations.set(this.previous.rotations);
    else if (t !== 1) for (let i = 0; i < 88; i += 4) {
      this.qa.fromArray(this.previous.rotations, i); this.qb.fromArray(this.current.rotations, i);
      this.qa.slerp(this.qb, t).normalize();
      output.rotations[i] = this.qa.x; output.rotations[i + 1] = this.qa.y; output.rotations[i + 2] = this.qa.z; output.rotations[i + 3] = this.qa.w;
    }
    for (let i = 0; i < 3; i++) output.rootOffset[i] = output.base[88 + i];
    output.headingDeg = output.base[91];
    output.bodyBreath = this.previous.bodyBreath + (this.current.bodyBreath - this.previous.bodyBreath) * t;
    output.bounce = this.previous.bounce + (this.current.bounce - this.previous.bounce) * t;
    return output;
  }
}
