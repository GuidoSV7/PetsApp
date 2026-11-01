import { Euler, Quaternion, Vector3, type Object3D } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import type { CatPoseFrame } from "./cat-pose-simulation";
import type { CatSkeleton } from "./cat-skeleton";
import { CatPoseContacts } from "./cat-pose-contacts";

const extensions = ["forearmFL", "forearmFR", "shinBL", "shinBR", "jaw", "tongue"] as const;

/**
 * Calibrate once from the resolved rigid A1 rest oracle, NOT from a posed frame.
 * The skeleton compiler has already resolved every inverse(restJoint)*restBox
 * offset. Runtime only composes local deltas; no legacy world retargeting occurs.
 * Scene nodes are borrowed so the same adapter serves the public renderer/tests.
 */
export class CatPoseBind {
  readonly contacts: CatPoseContacts;
  private readonly ordered;
  private readonly visuals;
  private readonly delta = new Quaternion();
  private readonly heading = new Quaternion();
  private readonly up = new Vector3(0, 1, 0);

  constructor(skeleton: CatSkeleton, joints: ReadonlyMap<string, Object3D>, boxes: ReadonlyMap<string, Object3D>) {
    const byId = new Map(skeleton.joints.map(joint => [joint.id, joint]));
    // skeleton.joints appends ears LAST; core order puts them at indexes 5/6.
    this.ordered = CAT_JOINT_IDS.map(id => {
      const bind = byId.get(id), node = joints.get(id);
      if (!bind || !node) throw new RangeError(`Missing rigid cat joint: ${id}`);
      return { bind, node, rest: new Quaternion().setFromEuler(new Euler(...bind.rotation)) };
    });
    this.contacts = new CatPoseContacts(this.ordered[0].node, joints);
    this.visuals = [...skeleton.bindings.values()].map(bind => {
      const node = boxes.get(bind.part.id);
      if (!node) throw new RangeError(`Missing rigid cat box: ${bind.part.id}`);
      return { bind, node, extension: extensions.indexOf(bind.part.id as typeof extensions[number]) };
    });
  }

  /** Local FK/visual layers, then LAST analytic support for an explicit mask. */
  apply(frame: CatPoseFrame, showHidden = false): void {
    for (let i = 0; i < this.ordered.length; i++) {
      const { bind, node, rest } = this.ordered[i];
      node.position.set(bind.position[0], bind.position[1], bind.position[2]);
      node.quaternion.copy(rest).multiply(this.delta.fromArray(frame.rotations, i * 4));
      node.scale.set(1, 1, 1);
      if (i === 0) {
        node.position.x += frame.rootOffset[0];
        node.position.y += frame.rootOffset[1] + frame.bounce;
        node.position.z += frame.rootOffset[2];
        this.heading.setFromAxisAngle(this.up, frame.headingDeg * Math.PI / 180);
        node.quaternion.premultiply(this.heading);
      }
    }
    for (let i = 0; i < this.visuals.length; i++) {
      const { bind, node, extension } = this.visuals[i], id = bind.part.id;
      node.position.set(bind.position[0], bind.position[1], bind.position[2]);
      node.scale.set(bind.scale[0], bind.scale[1], bind.scale[2]);
      node.visible = extension < 0 || showHidden || (frame.visibleMask & (1 << extension)) !== 0;
      if (id === "body" || id === "chest") node.scale.y *= frame.bodyBreath;
      if (id === "eyeL" || id === "eyeR" || id === "pupilL" || id === "pupilR") node.scale.y *= frame.eyeScale;
    }
    this.contacts.apply(frame.supportMask);
  }
}
