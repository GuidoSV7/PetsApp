import { Euler, Quaternion, Vector3 } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import { createCatPoseReference } from "./cat-pose-reference";
import { CatPoseSimulation } from "./cat-pose-simulation";
import { BASE_SIZE, type CatPoseLibrary, type PoseTrack } from "./cat-pose-tracks";
import type { CatSkeleton } from "./cat-skeleton";

const front = ["shoulderFL", "elbowFL", "wristFL", "shoulderFR", "elbowFR", "wristFR"] as const;
const index = (id: string) => CAT_JOINT_IDS.indexOf(("joint-" + id) as typeof CAT_JOINT_IDS[number]) * 4;
const ease = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

/** Nominal S↔F only. Reuse immutable S↔L rear/body data, never its final posture. */
export function compileCatPoseSphinxTransfers(skeleton: CatSkeleton, library: CatPoseLibrary, goals: Float64Array): CatPoseLibrary {
  const reference = createCatPoseReference(skeleton), frame = new CatPoseSimulation({ seed: 0 }).sample();
  reference.bind.configureLibrary(library, goals);
  const sphinx = library.stable.sphinx.base, seated = library.stable.seated.base;
  const down = library.tracks.seated.loaf!, up = library.tracks.loaf.seated!;
  const qa = new Quaternion(), qb = new Quaternion(), total = new Quaternion();
  const rest = new Map(skeleton.joints.map(joint => [joint.id, new Quaternion().setFromEuler(new Euler(...joint.rotation)).invert()]));
  function supportedF(breath: number) {
    const output = new Float64Array(sphinx);
    frame.pose = "sphinx"; frame.supportMask = 3; frame.visibleMask = 3; frame.bodyBreath = breath;
    frame.rootOffset.set(sphinx.subarray(88, 91)); frame.headingDeg = sphinx[91]; frame.rotations.set(sphinx.subarray(0, 88));
    for (const id of front) { const i = index(id); frame.rotations[i] = frame.rotations[i + 1] = frame.rotations[i + 2] = 0; frame.rotations[i + 3] = 1; }
    // Explicit F template: these feet actually support a belly-down body at F's
    // immutable forward goals. This is not a neutral-goal/airborne solve.
    reference.bind.apply(frame);
    if (reference.bind.contacts.diagnostics.unreachableFeet !== 0 || reference.bind.contacts.diagnostics.maxFootDrift! > .001) {
      throw new RangeError("Sphinx transfer reference has unreachable planted feet.");
    }
    for (const id of front) qa.copy(rest.get("joint-" + id)!).multiply(reference.joints.get("joint-" + id)!.quaternion)
      .normalize().toArray(output, index(id));
    return output;
  }
  function sample(data: Float64Array, time: number, output: Float64Array) {
    const tick = Math.floor(time), alpha = time - tick, a = tick * BASE_SIZE;
    if (alpha === 0) { output.set(data.subarray(a, a + BASE_SIZE)); return; }
    for (let i = 0; i < 88; i += 4) qa.fromArray(data, a + i).slerp(qb.fromArray(data, a + BASE_SIZE + i), alpha).normalize().toArray(output, i);
    for (let i = 88; i < BASE_SIZE; i++) output[i] = data[a + i] + (data[a + BASE_SIZE + i] - data[a + i]) * alpha;
  }
  function arch(start: Float64Array, end: Float64Array) {
    return ["L", "R"].map(side => {
      const upperIndex = index("shoulderF" + side), lowerIndex = index("elbowF" + side), footIndex = index("wristF" + side);
      const upperStart = new Quaternion().fromArray(start, upperIndex), upperEnd = new Quaternion().fromArray(end, upperIndex);
      const lowerStart = upperStart.clone().multiply(new Quaternion().fromArray(start, lowerIndex));
      const lowerEnd = upperEnd.clone().multiply(new Quaternion().fromArray(end, lowerIndex));
      const bone = new Vector3(...skeleton.joints.find(joint => joint.id === "joint-wristF" + side)!.position).normalize();
      const lift = (q: Quaternion) => new Quaternion().setFromUnitVectors(bone.clone().applyQuaternion(q), new Vector3(0, 1, 0)).multiply(q);
      return { upperIndex, lowerIndex, footIndex, upperStart, upperEnd, lowerStart, lowerEnd, liftStart: lift(lowerStart), liftEnd: lift(lowerEnd) };
    });
  }
  function swing(output: Float64Array, data: ReturnType<typeof arch>, phase: number) {
    // Elbow first, then upper rotation with distal bone UP, then extend. These
    // are quaternion orientation curves, never moving point targets or IK.
    for (const joint of data) {
      if (phase < .3) { qa.copy(joint.upperStart); qb.copy(joint.lowerStart).slerp(joint.liftStart, ease(phase / .3)); }
      else if (phase < .7) { qa.copy(joint.upperStart).slerp(joint.upperEnd, ease((phase - .3) / .4)); qb.copy(joint.liftStart).slerp(joint.liftEnd, ease((phase - .3) / .4)); }
      else { qa.copy(joint.upperEnd); qb.copy(joint.liftEnd).slerp(joint.lowerEnd, ease((phase - .7) / .3)); }
      qa.normalize().toArray(output, joint.upperIndex);
      total.copy(qa).invert().multiply(qb).normalize().toArray(output, joint.lowerIndex);
      total.copy(qb).invert().normalize().toArray(output, joint.footIndex);
    }
  }
  function family(knot: number) {
    const breath = 1 + (knot - 40) / 4000, f = supportedF(breath);
    const downData = down.breathFK!.variants[knot], upData = up.breathFK!.variants[knot];
    const folded = new Float64Array(BASE_SIZE), landing = new Float64Array(BASE_SIZE);
    sample(downData, 34, folded); sample(upData, 20, landing);
    const outward = arch(folded, f), inward = arch(f, landing);
    function track(original: PoseTrack, descending: boolean) {
      const frames = new Float64Array((original.duration + 1) * BASE_SIZE), visibility = new Uint8Array(original.duration + 1);
      const output = new Float64Array(BASE_SIZE);
      for (let tick = 0; tick <= original.duration; tick++) {
        const time = descending ? Math.min(tick, down.duration) : tick <= 20 ? tick : 20 + (tick - 20) * (up.duration - 20) / (original.duration - 20);
        sample(descending ? downData : upData, time, output);
        if (descending && tick >= 34) swing(output, outward, (tick - 34) / (original.duration - 34));
        if (!descending && tick <= 20) swing(output, inward, tick / 20);
        if (tick === 0 && knot === 40) output.set(descending ? seated : sphinx);
        if (tick === original.duration) output.set(descending ? f : seated);
        frames.set(output, tick * BASE_SIZE);
        visibility[tick] = tick === 0 ? descending ? 0 : 3 : tick === original.duration ? descending ? 3 : 0 : 15;
      }
      return { ...original, frames, visibility, phaseEnds: descending ? [9, 18, 22, 34, 40, 45, 48, original.duration] : [6, 14, 20, original.duration] };
    }
    return { down: track(library.tracks.seated.sphinx!, true), up: track(library.tracks.sphinx.seated!, false) };
  }
  const nominal = family(40), descending: Float64Array[] = [], ascending: Float64Array[] = [];
  for (let knot = 0; knot <= 80; knot++) { const variant = knot === 40 ? nominal : family(knot); descending.push(variant.down.frames); ascending.push(variant.up.frames); }
  const jointMask = down.breathFK!.jointMask;
  nominal.down.breathFK = { minimum: .99, maximum: 1.01, jointMask, variants: descending };
  nominal.up.breathFK = { minimum: .99, maximum: 1.01, jointMask, variants: ascending };
  return { ...library, tracks: { ...library.tracks,
    seated: { ...library.tracks.seated, sphinx: nominal.down }, sphinx: { ...library.tracks.sphinx, seated: nominal.up },
  } };
}
