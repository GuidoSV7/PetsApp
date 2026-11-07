import { Euler, Quaternion, Vector3 } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import { createCatPoseReference } from "./cat-pose-reference";
import { CatPoseSimulation } from "./cat-pose-simulation";
import { CAT_POSE_LIBRARY } from "./cat-pose-tracks";
import type { CatSkeleton } from "./cat-skeleton";

/** Stable F only. Incoming/outgoing transfer trajectories are deliberately separate. */
export function compileCatPoseSphinx(skeleton: CatSkeleton) {
  const reference = createCatPoseReference(skeleton);
  const goals = reference.bind.contacts.copyGoalsInto(new Float64Array(12));
  // Reuse the proven flat belly height/rear fold, NOT loaf's front posture/mask.
  const base = new Float64Array(CAT_POSE_LIBRARY.stable.loaf.base);
  const upper = new Vector3(), lower = new Vector3(), foot = new Vector3();
  for (const [leg, side] of ["L", "R"].entries()) {
    reference.joints.get("joint-shoulderF" + side)!.getWorldPosition(upper);
    reference.joints.get("joint-elbowF" + side)!.getWorldPosition(lower);
    reference.joints.get("joint-wristF" + side)!.getWorldPosition(foot);
    const a = upper.distanceTo(lower), b = lower.distanceTo(foot);
    const maximum = a + b, minimum = Math.abs(a - b);
    // Near-extended authoring, strictly inside the reachable interval. No
    // clamped solve or root search. X/Y keep the neutral flat-paw geometry.
    const radius = maximum - .05 * (maximum - minimum);
    const x = goals[leg * 3] - (upper.x + base[88]);
    const y = goals[leg * 3 + 1] - (upper.y + base[89]);
    const forwardSquared = radius * radius - x * x - y * y;
    const z = upper.z + base[90] + Math.sqrt(forwardSquared);
    if (!Number.isFinite(z) || radius <= minimum || radius >= maximum || forwardSquared <= 0 || z <= goals[leg * 3 + 2]) {
      throw new RangeError("Sphinx rest geometry has no forward support radius.");
    }
    goals[leg * 3 + 2] = z;
  }
  const pose = { base, visible: CAT_POSE_LIBRARY.stable.sphinx.visible, supports: 3 };
  reference.bind.configureLibrary(CAT_POSE_LIBRARY, goals);
  const frame = new CatPoseSimulation({ seed: 0 }).sample(); // Buffer initialization only; no second clock.
  frame.pose = "sphinx"; frame.supportMask = pose.supports; frame.visibleMask = pose.visible;
  frame.rotations.set(base.subarray(0, 88)); frame.rootOffset.set(base.subarray(88, 91));
  // Same canonical zero-twist reference policy as the transfer compiler.
  for (const side of ["L", "R"]) for (const joint of ["shoulderF", "elbowF", "wristF"]) {
    const i = CAT_JOINT_IDS.indexOf(("joint-" + joint + side) as typeof CAT_JOINT_IDS[number]) * 4;
    frame.rotations[i] = frame.rotations[i + 1] = frame.rotations[i + 2] = 0; frame.rotations[i + 3] = 1;
  }
  reference.bind.apply(frame);
  if (reference.bind.contacts.diagnostics.unreachableFeet !== 0 || reference.bind.contacts.diagnostics.maxFootDrift! > .001) {
    throw new RangeError("Sphinx reference has unreachable planted feet.");
  }
  const q = new Quaternion();
  for (const side of ["L", "R"]) for (const joint of ["shoulderF", "elbowF", "wristF"]) {
    const id = ("joint-" + joint + side) as typeof CAT_JOINT_IDS[number];
    const bind = skeleton.joints.find(item => item.id === id)!;
    q.setFromEuler(new Euler(...bind.rotation)).invert().multiply(reference.joints.get(id)!.quaternion)
      .normalize().toArray(base, CAT_JOINT_IDS.indexOf(id) * 4);
  }
  return { pose, goals };
}
