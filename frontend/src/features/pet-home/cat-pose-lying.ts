import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import type { CatSkeleton } from "./cat-skeleton";
import type { CatPoseLibrary } from "./cat-pose-tracks";

const index = (id: string) => CAT_JOINT_IDS.indexOf(("joint-" + id) as typeof CAT_JOINT_IDS[number]) * 4;

/** Stable endpoints only: rest-authored FK and a closed-form body support hull. */
export function compileCatPoseLying(skeleton: CatSkeleton, library: CatPoseLibrary): CatPoseLibrary {
  const unit = new Vector3(1, 1, 1), q = new Quaternion(), delta = new Quaternion();
  function worlds(base: Float64Array) {
    const result = new Map<string, Matrix4>();
    for (const joint of skeleton.joints) {
      const position = new Vector3(...joint.position);
      if (!joint.parent) position.add(new Vector3(...base.subarray(88, 91)));
      q.setFromEuler(new Euler(...joint.rotation)).multiply(delta.fromArray(base, index(joint.id.slice(6))));
      const local = new Matrix4().compose(position, q, unit);
      result.set(joint.id, joint.parent ? result.get(joint.parent)!.clone().multiply(local) : local);
    }
    return result;
  }
  function floor(id: string, matrices: Map<string, Matrix4>) {
    const bind = skeleton.bindings.get(id)!;
    const matrix = matrices.get(bind.jointId)!.clone().multiply(new Matrix4().compose(new Vector3(...bind.position), new Quaternion(), new Vector3(...bind.scale))).elements;
    return matrix[13] - (Math.abs(matrix[1]) * bind.part.args[0] + Math.abs(matrix[5]) * bind.part.args[1] + Math.abs(matrix[9]) * bind.part.args[2]) / 2;
  }
  const ground = floor("pawFL", worlds(library.stable.seated.base));
  function rotation(base: Float64Array, id: string, x = 0, y = 0, z = 0) {
    q.setFromEuler(new Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180)).normalize().toArray(base, index(id));
  }
  function pose(id: "side" | "curled" | "bellyUp") {
    const base = new Float64Array(library.stable.seated.base), back = id === "bellyUp", curled = id === "curled";
    rotation(base, "root", 0, 0, back ? 180 : 90);
    if (back) {
      // Back/rear edge bears weight; tilt the torso so the rigid neck/head and
      // ears remain above that plane even for the short-neck compact anatomy.
      rotation(base, "torso", 45); rotation(base, "neck", 30); rotation(base, "head", 15);
      rotation(base, "tailBase", 120); rotation(base, "tailMid", 30); rotation(base, "tailTip", 30);
    } else {
      rotation(base, "neck", curled ? -20 : 0, curled ? 25 : 0, -30);
      rotation(base, "head", 0, 0, -60);
      if (curled) {
        // Counter the side roll, then turn inward and tuck the head. Preserve
        // the real neck lever rather than lowering the root to conceal it.
        q.setFromEuler(new Euler(20 * Math.PI / 180, 35 * Math.PI / 180, -Math.PI / 2, "ZYX"));
        delta.fromArray(base, index("neck")).invert().multiply(q).normalize().toArray(base, index("head"));
      }
      rotation(base, "tailBase", curled ? 30 : 0, curled ? -65 : 35, curled ? 20 : 10);
      rotation(base, "tailMid", curled ? 60 : 20, curled ? -50 : 10);
      rotation(base, "tailTip", curled ? 65 : 20, curled ? -25 : 0);
    }
    for (const side of ["L", "R"]) for (const front of [true, false]) {
      const upper = (front ? "shoulderF" : "hipB") + side, lower = (front ? "elbowF" : "kneeB") + side, foot = (front ? "wristF" : "ankleB") + side;
      if (back) rotation(base, upper, -30);
      else {
        const bone = new Vector3(...skeleton.joints.find(joint => joint.id === "joint-" + lower)!.position).normalize();
        // Authored free-bone ORIENTATION, not a point-target solve. In the lower
        // hip the proximal cap lies on the same plane as the body side face.
        const direction = front ? new Vector3(curled ? .6 : .7, curled ? .8 : 0, curled ? 0 : .7).normalize() : new Vector3(1, 0, 0);
        q.setFromUnitVectors(bone, direction).normalize().toArray(base, index(upper));
      }
      rotation(base, lower, back ? 65 : curled ? 120 : 45);
      q.fromArray(base, index(upper)).multiply(delta.fromArray(base, index(lower))).invert().normalize().toArray(base, index(foot));
    }
    // One analytic oriented-box projection, not a root search, live correction,
    // sampled hull fitting or a capture of displayed nodes. No foot IK here.
    base[89] = ground - floor("body", worlds(base));
    return { base, visible: 15, supports: 0 };
  }
  return { ...library, stable: { ...library.stable, side: pose("side"), curled: pose("curled"), bellyUp: pose("bellyUp") } };
}
