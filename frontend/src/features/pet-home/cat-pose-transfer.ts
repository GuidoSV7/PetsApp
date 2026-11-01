import { Euler, Quaternion, Vector3 } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import type { CatSkeleton } from "./cat-skeleton";
import type { CatPoseBind } from "./cat-pose-bind";
import { createCatPoseReference } from "./cat-pose-reference";
import { compileCatPoseSphinx } from "./cat-pose-sphinx";
import { compileCatPoseSphinxTransfers } from "./cat-pose-sphinx-transfers";
import { compileCatPoseQuadrupedSphinx } from "./cat-pose-quadruped-sphinx";
import { compileCatPoseLying } from "./cat-pose-lying";
import { BASE_SIZE, CAT_POSE_LIBRARY, type CatPoseLibrary, type PoseTrack } from "./cat-pose-tracks";
import { CatPoseSimulation, type CatSimulationOptions } from "./cat-pose-simulation";

const front = ["shoulderFL", "elbowFL", "wristFL", "shoulderFR", "elbowFR", "wristFR"] as const;
const rear = ["hipBL", "kneeBL", "ankleBL", "hipBR", "kneeBR", "ankleBR"] as const;
const ease = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };
const index = (id: string) => CAT_JOINT_IDS.indexOf(("joint-" + id) as typeof CAT_JOINT_IDS[number]) * 4;

/**
 * Compile nominal S↔L FK into the SAME pure core data boundary. Analytic IK is
 * used only to compile configurations whose designated feet really support the
 * body. Airborne front/rear segments below are quaternion FK, never target IK.
 * Core keeps the nominal breath=1 base. A bounded family supplies ADDITIVE
 * body-surface FK in Bind; released-foot playback only interpolates this data.
 */
export function compileCatPoseTransfer(skeleton: CatSkeleton): CatPoseLibrary {
  const reference = createCatPoseReference(skeleton);
  const referenceFrame = new CatPoseSimulation({ seed: 0 }).sample();
  const seated = CAT_POSE_LIBRARY.stable.seated.base, loaf = CAT_POSE_LIBRARY.stable.loaf.base;
  const qa = new Quaternion(), qb = new Quaternion(), total = new Quaternion();
  const rest = new Map(skeleton.joints.map(joint => [joint.id, new Quaternion().setFromEuler(new Euler(...joint.rotation)).invert()]));
  function blend(a: Float64Array, b: Float64Array, t: number, output: Float64Array) {
    if (t === 0) { output.set(a); return; }
    if (t === 1) { output.set(b); return; }
    for (let i = 0; i < 88; i += 4) {
      qa.fromArray(a, i); qb.fromArray(b, i); qa.slerp(qb, t).normalize().toArray(output, i);
    }
    for (let i = 88; i < BASE_SIZE; i++) output[i] = a[i] + (b[i] - a[i]) * t;
  }
  function xRotation(output: Float64Array, id: string, degrees: number) {
    const i = index(id), half = degrees * Math.PI / 360;
    output[i] = Math.sin(half); output[i + 1] = output[i + 2] = 0; output[i + 3] = Math.cos(half);
  }
  function flat(output: Float64Array, ids: readonly string[]) {
    for (let i = 0; i < ids.length; i += 3) {
      qa.fromArray(output, index(ids[i])); qb.fromArray(output, index(ids[i + 1]));
      total.copy(qa).multiply(qb).invert().normalize().toArray(output, index(ids[i + 2]));
    }
  }
  function supported(output: Float64Array, mask: number, ids: readonly string[], breath: number) {
    // Reset ALL local input transforms from authoritative data on every call.
    referenceFrame.rotations.set(output.subarray(0, 88));
    // Canonical twist seed is part of the supported reference definition.
    // Otherwise equal endpoints compiled from different authoring angles can
    // carry different upper-bone twist at the release/landing boundary.
    for (const id of ids) {
      const i = index(id);
      referenceFrame.rotations[i] = referenceFrame.rotations[i + 1] = referenceFrame.rotations[i + 2] = 0;
      referenceFrame.rotations[i + 3] = 1;
    }
    referenceFrame.rootOffset.set(output.subarray(88, 91));
    referenceFrame.headingDeg = output[91]; referenceFrame.supportMask = mask;
    referenceFrame.bodyBreath = breath; referenceFrame.visibleMask = 0;
    reference.bind.apply(referenceFrame);
    if (reference.bind.contacts.diagnostics.unreachableFeet !== 0 || reference.bind.contacts.diagnostics.maxFootDrift! > .001) {
      throw new RangeError("Transfer reference has unreachable planted feet.");
    }
    for (const id of ids) {
      qa.copy(rest.get("joint-" + id)!).multiply(reference.joints.get("joint-" + id)!.quaternion).normalize().toArray(output, index(id));
    }
  }
  function family(breath: number) {
    const frontRelease = new Float64Array(seated);
    if (breath !== 1) supported(frontRelease, 3, front, breath);
    const landing = new Float64Array(loaf);
    supported(landing, 15, [...front, ...rear], breath);
    const rearRelease = new Float64Array(loaf);
    supported(rearRelease, 12, rear, breath);
    const rearSwing = ["L", "R"].map(side => {
      const upperIndex = index("hipB" + side), lowerIndex = index("kneeB" + side);
      const upper = new Quaternion().fromArray(rearRelease, upperIndex);
      const lowerWorld = upper.clone().multiply(new Quaternion().fromArray(rearRelease, lowerIndex));
      const bone = skeleton.joints.find(joint => joint.id === "joint-ankleB" + side)!;
      const direction = new Vector3(...bone.position).normalize().applyQuaternion(lowerWorld);
      const upward = new Vector3(0, 1, 0);
      const liftWorld = new Quaternion().setFromUnitVectors(direction, upward).multiply(lowerWorld);
      const endUpper = new Quaternion().fromArray(loaf, upperIndex);
      const endWorld = endUpper.clone().multiply(new Quaternion().fromArray(loaf, lowerIndex));
      return { upperIndex, lowerIndex, footIndex: index("ankleB" + side), upper, lowerWorld, liftWorld, endUpper, endWorld };
    });
    function swingRear(output: Float64Array, phase: number) {
      // Knee first: lift the free distal bone toward an upward orientation.
      // The supported knee can be BELOW the ankle, so horizontal is not a lift.
      // Then fold the hip while holding that WORLD ORIENTATION (not a foot goal),
      // and settle the shin into loaf. No analytic solve is used after release.
      for (const swing of rearSwing) {
        if (phase < .3) {
          qa.copy(swing.upper);
          qb.copy(swing.lowerWorld).slerp(swing.liftWorld, ease(phase / .3));
        } else if (phase < .7) {
          qa.copy(swing.upper).slerp(swing.endUpper, ease((phase - .3) / .4));
          qb.copy(swing.liftWorld);
        } else {
          qa.copy(swing.endUpper);
          qb.copy(swing.liftWorld).slerp(swing.endWorld, ease((phase - .7) / .3));
        }
        qa.normalize().toArray(output, swing.upperIndex);
        total.copy(qa).invert().multiply(qb).normalize().toArray(output, swing.lowerIndex);
        total.copy(qb).invert().normalize().toArray(output, swing.footIndex);
      }
    }

    const down = CAT_POSE_LIBRARY.tracks.seated.loaf!, up = CAT_POSE_LIBRARY.tracks.loaf.seated!;
    function track(original: PoseTrack, descending: boolean): PoseTrack {
      const frames = new Float64Array(original.frames.length), visibility = new Uint8Array(original.duration + 1);
      const output = new Float64Array(BASE_SIZE);
      for (let tick = 0; tick <= original.duration; tick++) {
        const t = tick / original.duration;
        blend(descending ? seated : loaf, descending ? loaf : seated, ease(t), output);
        if (descending) {
          const shoulder = 150 * ease((tick - 9) / 9);
          const elbow = tick <= 18 ? 100 * ease(tick / 9) : 100 * (1 - ease((tick - 18) / 4));
          for (const side of ["L", "R"]) {
            xRotation(output, "shoulderF" + side, shoulder);
            xRotation(output, "elbowF" + side, elbow);
          }
          // Front release also starts from a genuine supported reference. Fade
          // its breath delta through the authored elbow lift, never a foot target.
          if (breath !== 1) for (const id of front) {
            const i = index(id);
            total.fromArray(frontRelease, i);
            qb.identity().slerp(total, 1 - ease(tick / 9));
            qa.fromArray(output, i).multiply(qb).normalize().toArray(output, i);
          }
          flat(output, front);
          output[89] = -.24 * ease((tick - 22) / 12);
          if (tick <= 34) supported(output, 12, rear, breath);
          else swingRear(output, (tick - 34) / (original.duration - 34));
        } else if (tick <= 20) {
          const weight = ease(tick / 20);
          for (const id of front) {
            const i = index(id); qa.fromArray(loaf, i); qb.fromArray(landing, i);
            qa.slerp(qb, weight).normalize().toArray(output, i);
          }
          flat(output, front); swingRear(output, 1 - tick / 20);
          output[89] = -.24;
        } else {
          output[89] = -.24 * (1 - ease((tick - 20) / (original.duration - 20)));
          supported(output, 15, [...front, ...rear], breath);
        }
        if (tick === 0 && (breath === 1 || !descending)) output.set(descending ? seated : loaf);
        if (tick === original.duration) output.set(descending ? loaf : seated);
        frames.set(output, tick * BASE_SIZE);
        visibility[tick] = tick > 0 && tick < original.duration ? 15 : 0;
      }
      return { ...original, frames, visibility,
        phaseEnds: descending ? [9, 18, 22, 34, original.duration] : [20, original.duration] };
    }
    return { down: track(down, true), up: track(up, false) };
  }

  const nominal = family(1), descending: Float64Array[] = [], ascending: Float64Array[] = [];
  // needVisualCues.idleAmp is .25..1; Core awake breath is ±.01*idleAmp
  // and sleeping breath ±.006. Nothing clamps or suppresses that signal here.
  // Finite interpolation error is checked between knots and by live sweeps.
  for (let knot = 0; knot <= 80; knot++) {
    const variant = knot === 40 ? nominal : family(1 + (knot - 40) / 4000);
    descending.push(variant.down.frames); ascending.push(variant.up.frames);
  }
  const jointMask = [...front, ...rear].reduce((mask, id) => mask | (1 << (index(id) / 4)), 0);
  nominal.down.breathFK = { minimum: .99, maximum: 1.01, jointMask, variants: descending };
  nominal.up.breathFK = { minimum: .99, maximum: 1.01, jointMask, variants: ascending };
  return { ...CAT_POSE_LIBRARY, tracks: { ...CAT_POSE_LIBRARY.tracks,
    seated: { ...CAT_POSE_LIBRARY.tracks.seated, loaf: nominal.down },
    loaf: { ...CAT_POSE_LIBRARY.tracks.loaf, seated: nominal.up },
  } };
}

const preparedLibraries = new WeakMap<CatSkeleton, { library: CatPoseLibrary; sphinxGoals: Float64Array }>();

/** One public preparation path configures BOTH consumers from the same data. */
export function prepareCatPoseSimulation(skeleton: CatSkeleton, options: CatSimulationOptions, bind: CatPoseBind): CatPoseSimulation {
  let prepared = preparedLibraries.get(skeleton);
  if (!prepared) {
    const transfer = compileCatPoseTransfer(skeleton), sphinx = compileCatPoseSphinx(skeleton);
    const transfers = compileCatPoseSphinxTransfers(skeleton, { ...transfer, stable: { ...transfer.stable, sphinx: sphinx.pose } }, sphinx.goals);
    const library = compileCatPoseLying(skeleton, compileCatPoseQuadrupedSphinx(skeleton, transfers));
    prepared = { library, sphinxGoals: sphinx.goals };
    preparedLibraries.set(skeleton, prepared);
  }
  bind.configureLibrary(prepared.library, prepared.sphinxGoals);
  return new CatPoseSimulation({ ...options, library: prepared.library });
}
