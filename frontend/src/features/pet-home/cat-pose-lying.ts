import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import type { CatSkeleton } from "./cat-skeleton";
import type { CatPoseLibrary, PoseBreathFK, StablePose } from "./cat-pose-tracks";
import { CAT_CURLED_TAIL_FK, CAT_SIDE_TAIL_FK, mirrorCatPoseBase } from "./cat-pose-mirror";

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
        // Rigid neck fold carries the head hipward; its face looks backward
        // along the torso, while the crown counters the side roll. No nasal
        // target, root concealment or spine/box deformation is involved.
        rotation(base, "neck", -70, 0, -30);
        q.setFromEuler(new Euler(0, Math.PI, -Math.PI / 2, "ZYX"));
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
    const result: StablePose = { base, visible: 15, supports: 0 };
    if (curled) {
      ["tailBase", "tailMid", "tailTip"].forEach((joint, i) => {
        rotation(base, joint, ...CAT_CURLED_TAIL_FK.left[i]);
        q.fromArray(base, index(joint)).normalize().toArray(base, index(joint));
      });
    }
    if (id === "side") {
      ["tailBase", "tailMid", "tailTip"].forEach((joint, i) => {
        rotation(base, joint, ...CAT_SIDE_TAIL_FK.left[i]);
        // Reach the same normalization fixed point used by Core sampling.
        q.fromArray(base, index(joint)).normalize().toArray(base, index(joint));
      });
      const neck = skeleton.joints.find(joint => joint.id === "joint-neck")!;
      const head = skeleton.joints.find(joint => joint.id === "joint-head")!;
      const box = skeleton.bindings.get("head")!;
      // A small world roll selects one lowest head corner rather than an
      // ambiguous whole bottom face. Its rest-derived contact stays fixed.
      const tilt = -80 * Math.PI / 180;
      const corner = new Vector3(...box.position).add(new Vector3(-box.part.args[0] * box.scale[0] / 2, -box.part.args[1] * box.scale[1] / 2, 0));
      // Fold a long resolved neck lever backward just enough to keep the head
      // joined to the body. Short/default levers keep zero pitch. The deep
      // profile needs ~40 degrees, a measured departure from the initial guide.
      const joinedLength = Math.abs(Math.sin(tilt)) * box.part.args[0] * box.scale[0] / 2
        + Math.abs(Math.cos(tilt)) * box.part.args[1] * box.scale[1] / 2 - .02;
      const pitch = head.position[1] <= joinedLength ? 0
        : -Math.acos(joinedLength / Math.hypot(head.position[1], head.position[2])) - Math.atan2(head.position[2], head.position[1]);
      const length = head.position[1] * Math.cos(pitch) - head.position[2] * Math.sin(pitch);
      function headAngles(output: Float64Array, neckAngle: number, totalHeadAngle: number) {
        q.setFromEuler(new Euler(pitch, 0, neckAngle, "ZYX")).normalize().toArray(output, index("neck"));
        delta.copy(q).invert().multiply(new Quaternion().setFromEuler(new Euler(0, 0, totalHeadAngle))).normalize().toArray(output, index("head"));
      }
      const cx = Math.cos(tilt) * corner.x - Math.sin(tilt) * corner.y;
      const cy = Math.sin(tilt) * corner.x + Math.cos(tilt) * corner.y;
      const neckY = worlds(base).get("joint-neck")!.elements[13];
      const sine = (neckY + cx - ground) / length;
      if (Math.abs(sine) > 1) throw new RangeError("Side head support is outside the rigid neck lever.");
      const angle = Math.asin(sine);
      headAngles(base, angle, tilt);
      const targetX = neck.position[0] - length * Math.sin(angle) + cx;
      const targetY = neck.position[1] + length * Math.cos(angle) + cy;
      const radius = Math.hypot(corner.x, corner.y);
      const variants: Float64Array[] = [], reflected: Float64Array[] = [];
      for (let knot = 0; knot <= 80; knot++) {
        const variant = new Float64Array(base), breath = 1 + (knot - 40) / 4000;
        if (knot !== 40) {
          // Closed-form setup authoring of the two rigid planar levers. Playback
          // only samples additive quaternions; no live head/airborne target IK.
          const x = targetX - neck.position[0], y = targetY - neck.position[1] * breath;
          const distance = Math.hypot(x, y);
          const cosine = (distance * distance + length * length - radius * radius) / (2 * distance * length);
          if (Math.abs(cosine) > 1) throw new RangeError("Side breathing contact is outside the rigid head levers.");
          const direction = Math.atan2(y, x) - Math.acos(cosine);
          const neckAngle = direction - Math.PI / 2;
          const headAngle = Math.atan2(y - length * Math.sin(direction), x - length * Math.cos(direction)) - Math.atan2(corner.y, corner.x);
          headAngles(variant, neckAngle, headAngle);
        }
        variants.push(variant); reflected.push(mirrorCatPoseBase(skeleton, variant));
      }
      const jointMask = (1 << (index("neck") / 4)) | (1 << (index("head") / 4));
      const data = (values: Float64Array[]): PoseBreathFK => ({ minimum: .99, maximum: 1.01, jointMask, variants: values });
      result.breathFK = data(variants); result.mirroredBreathFK = data(reflected);
    }
    return result;
  }
  return { ...library, stable: { ...library.stable, side: pose("side"), curled: pose("curled"), bellyUp: pose("bellyUp") } };
}
