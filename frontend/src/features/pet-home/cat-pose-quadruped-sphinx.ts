import { Euler, Quaternion, Vector3 } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import { createCatPoseReference } from "./cat-pose-reference";
import { catPoseFoldMarginPitch } from "./cat-pose-fold-margin";
import { CatPoseSimulation } from "./cat-pose-simulation";
import { BASE_SIZE, type CatPoseLibrary, type PoseTrack } from "./cat-pose-tracks";
import type { CatSkeleton } from "./cat-skeleton";

const chains = [
  ["shoulderFL", "elbowFL", "wristFL"], ["shoulderFR", "elbowFR", "wristFR"],
  ["hipBL", "kneeBL", "ankleBL"], ["hipBR", "kneeBR", "ankleBR"],
] as const;
const index = (id: string) => CAT_JOINT_IDS.indexOf(("joint-" + id) as typeof CAT_JOINT_IDS[number]) * 4;
const ease = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

/** Direct Q→F: supported Q settling, real belly, then four released FK arches. */
export function compileCatPoseQuadrupedSphinx(skeleton: CatSkeleton, library: CatPoseLibrary): CatPoseLibrary {
  const reference = createCatPoseReference(skeleton), frame = new CatPoseSimulation({ seed: 0 }).sample();
  const standing = library.stable.standing.base, sphinx = library.stable.sphinx.base;
  const original = library.tracks.standing.sphinx!, supportedF = library.tracks.seated.sphinx!;
  const qa = new Quaternion(), qb = new Quaternion(), total = new Quaternion();
  const rest = new Map(skeleton.joints.map(joint => [joint.id, new Quaternion().setFromEuler(new Euler(...joint.rotation)).invert()]));
  const torsoIndex = index("torso"), pitchAxis = new Vector3(1, 0, 0);
  const bodyScale = reference.boxes.get("body")!.getWorldScale(new Vector3());
  const torsoPivot = reference.joints.get("joint-torso")!.getWorldPosition(new Vector3());
  let settlePitch = 0;
  // A vertical hip path can cross the two-bone inner reach sphere even when
  // both endpoints are reachable. Arc the torso, never the root or foot goals.
  // Admin depth variants keep their existing diagnostic trajectories.
  if (bodyScale.x === bodyScale.z) for (const [upper, lower, foot] of chains.slice(0, 2)) {
    const a = reference.joints.get("joint-" + upper)!.getWorldPosition(new Vector3());
    const b = reference.joints.get("joint-" + lower)!.getWorldPosition(new Vector3());
    const goal = reference.joints.get("joint-" + foot)!.getWorldPosition(new Vector3());
    const minimum = Math.abs(a.distanceTo(b) - b.distanceTo(goal)), dx = a.x - goal.x, dz = a.z - goal.z;
    if (Math.hypot(dx, dz) >= minimum) continue;
    const clearance = dz + Math.sqrt((minimum - Math.abs(dx)) * (minimum + Math.abs(dx)));
    settlePitch = Math.max(settlePitch, Math.asin(1.15 * clearance / (torsoPivot.y - a.y)),
      catPoseFoldMarginPitch(a, goal, torsoPivot, a.distanceTo(b), b.distanceTo(goal)));
  }
  function settle(output: Float64Array, tick: number) {
    const weight = ease(tick / 20);
    for (let i = 0; i < 88; i += 4) qa.fromArray(standing, i).slerp(qb.fromArray(sphinx, i), weight).normalize().toArray(output, i);
    for (let i = 88; i < BASE_SIZE; i++) output[i] = standing[i] + (sphinx[i] - standing[i]) * weight;
    const lean = settlePitch * (tick <= 5 ? ease(tick / 5) : tick <= 11 ? 1 : 1 - ease((tick - 11) / 3));
    if (lean) qa.fromArray(output, torsoIndex).multiply(qb.setFromAxisAngle(pitchAxis, lean)).normalize().toArray(output, torsoIndex);
    // Keep the actual Q twist seed, not the seated/canonical zero seed. These
    // limbs are still planted; each reference is solved from authoritative data.
    for (const chain of chains) for (const id of chain) { const i = index(id); output.set(standing.subarray(i, i + 4), i); }
  }
  function supportedQ(output: Float64Array, breath: number) {
    frame.pose = "standing"; frame.supportMask = 15; frame.visibleMask = 15; frame.bodyBreath = breath;
    frame.rotations.set(output.subarray(0, 88)); frame.rootOffset.set(output.subarray(88, 91)); frame.headingDeg = output[91];
    // The reference's existing neutral table remains fixed and all four feet
    // genuinely bear support. This is never a displayed S/loaf intermediate.
    reference.bind.apply(frame);
    if (reference.bind.contacts.diagnostics.unreachableFeet !== 0 || reference.bind.contacts.diagnostics.maxFootDrift! > .001) {
      throw new RangeError("Quadruped settling reference has unreachable planted feet.");
    }
    for (const chain of chains) for (const id of chain) qa.copy(rest.get("joint-" + id)!)
      .multiply(reference.joints.get("joint-" + id)!.quaternion).normalize().toArray(output, index(id));
  }
  function family(knot: number): PoseTrack {
    const breath = 1 + (knot - 40) / 4000, release = new Float64Array(BASE_SIZE);
    settle(release, 20); supportedQ(release, breath);
    // Reuse the existing genuinely supported calibrated F endpoint, including
    // its front twist and fixed forward template. No new airborne solve.
    const end = supportedF.breathFK!.variants[knot].subarray(supportedF.duration * BASE_SIZE, (supportedF.duration + 1) * BASE_SIZE);
    const arches = chains.map(([upper, lower, foot]) => {
      const upperIndex = index(upper), lowerIndex = index(lower), footIndex = index(foot);
      const upperStart = new Quaternion().fromArray(release, upperIndex), upperEnd = new Quaternion().fromArray(end, upperIndex);
      const lowerStart = upperStart.clone().multiply(new Quaternion().fromArray(release, lowerIndex));
      const lowerEnd = upperEnd.clone().multiply(new Quaternion().fromArray(end, lowerIndex));
      const bone = new Vector3(...skeleton.joints.find(joint => joint.id === "joint-" + foot)!.position).normalize();
      const lift = (q: Quaternion) => new Quaternion().setFromUnitVectors(bone.clone().applyQuaternion(q), new Vector3(0, 1, 0)).multiply(q);
      return { upperIndex, lowerIndex, footIndex, upperStart, upperEnd, lowerStart, lowerEnd, liftStart: lift(lowerStart), liftEnd: lift(lowerEnd) };
    });
    const frames = new Float64Array(original.frames.length), visibility = new Uint8Array(original.duration + 1), output = new Float64Array(BASE_SIZE);
    for (let tick = 0; tick <= original.duration; tick++) {
      settle(output, tick);
      if (tick <= 20) supportedQ(output, breath);
      else for (const joint of arches) {
        // Lift distal bones first, rotate uppers with distal bones pointing UP,
        // then extend. Only orientation interpolation after the explicit release.
        if (tick <= 30) { qa.copy(joint.upperStart); qb.copy(joint.lowerStart).slerp(joint.liftStart, ease((tick - 20) / 10)); }
        else if (tick <= 44) { const weight = ease((tick - 30) / 14); qa.copy(joint.upperStart).slerp(joint.upperEnd, weight); qb.copy(joint.liftStart).slerp(joint.liftEnd, weight); }
        else { qa.copy(joint.upperEnd); qb.copy(joint.liftEnd).slerp(joint.lowerEnd, ease((tick - 44) / (original.duration - 44))); }
        qa.normalize().toArray(output, joint.upperIndex);
        total.copy(qa).invert().multiply(qb).normalize().toArray(output, joint.lowerIndex);
        total.copy(qb).invert().normalize().toArray(output, joint.footIndex);
      }
      // Raw Q at every breath: LAST support must reproduce the actual Q seed at
      // start, not blend a solved quaternion with a different canonical seed.
      if (tick === 0) output.set(standing);
      if (tick === original.duration) output.set(end);
      frames.set(output, tick * BASE_SIZE); visibility[tick] = tick === original.duration ? 3 : 15;
    }
    return { ...original, frames, visibility, phaseEnds: [20, 30, 44, original.duration] };
  }
  const nominal = family(40), variants: Float64Array[] = [];
  for (let knot = 0; knot <= 80; knot++) variants.push(knot === 40 ? nominal.frames : family(knot).frames);
  nominal.breathFK = { minimum: .99, maximum: 1.01, jointMask: supportedF.breathFK!.jointMask, variants };
  return { ...library, tracks: { ...library.tracks, standing: { ...library.tracks.standing, sphinx: nominal } } };
}
