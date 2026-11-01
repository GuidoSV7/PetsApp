import { Euler, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import type { CatPoseFrame } from "./cat-pose-simulation";
import type { CatSkeleton } from "./cat-skeleton";
import { CatPoseContacts } from "./cat-pose-contacts";
import { CatPoseContactPlan, validateSphinxGoals } from "./cat-pose-contact-plan";
import { BASE_SIZE, type CatPoseLibrary, type PoseTrack } from "./cat-pose-tracks";

const extensions = ["forearmFL", "forearmFR", "shinBL", "shinBR", "jaw", "tongue"] as const;

/**
 * Calibrate once from the resolved rigid A1 rest oracle, NOT from a posed frame.
 * The skeleton compiler has already resolved every inverse(restJoint)*restBox
 * offset. Runtime only composes local deltas; no legacy world retargeting occurs.
 * Scene nodes are borrowed so the same adapter serves the public renderer/tests.
 */
export class CatPoseBind {
  readonly contacts: CatPoseContacts;
  readonly plan: CatPoseContactPlan;
  private readonly surface = new Vector3();
  private readonly ordered;
  private readonly visuals;
  private readonly bellyY: number;
  private readonly backY: number;
  private readonly sideY: number;
  private readonly groundY: number;
  private readonly modelToWorld: Matrix4;
  private readonly skinPoint = new Vector3();
  private readonly bodyAnchors;
  private readonly delta = new Quaternion();
  private readonly heading = new Quaternion();
  private readonly up = new Vector3(0, 1, 0);
  private library: CatPoseLibrary | undefined;
  private readonly breathNominal = new Quaternion();
  private readonly breathLow = new Quaternion();
  private readonly breathHigh = new Quaternion();
  private readonly breathNext = new Quaternion();

  constructor(skeleton: CatSkeleton, joints: ReadonlyMap<string, Object3D>, boxes: ReadonlyMap<string, Object3D>, anchors?: ReadonlyMap<string, Object3D>) {
    const body = skeleton.bindings.get("body")!;
    this.bellyY = body.position[1] - body.part.args[1] * body.scale[1] / 2;
    this.backY = body.position[1] + body.part.args[1] * body.scale[1] / 2;
    this.sideY = body.position[1];
    this.bodyAnchors = skeleton.anchors.filter(anchor => anchor.parent === "joint-torso")
      .map(bind => ({ bind, node: anchors?.get(bind.id) }));
    const byId = new Map(skeleton.joints.map(joint => [joint.id, joint]));
    // skeleton.joints appends ears LAST; core order puts them at indexes 5/6.
    this.ordered = CAT_JOINT_IDS.map(id => {
      const bind = byId.get(id), node = joints.get(id);
      if (!bind || !node) throw new RangeError(`Missing rigid cat joint: ${id}`);
      return { bind, node, rest: new Quaternion().setFromEuler(new Euler(...bind.rotation)) };
    });
    this.contacts = new CatPoseContacts(this.ordered[0].node, joints);
    // Contacts performs the existing rest-world update; capture AFTER it so
    // a freshly attached nonidentity parent cannot leave a stale matrix here.
    this.modelToWorld = this.ordered[0].node.parent?.matrixWorld.clone() ?? new Matrix4();
    const paw = boxes.get("pawFL")!, args = skeleton.bindings.get("pawFL")!.part.args;
    const matrix = paw.matrixWorld.elements;
    this.groundY = matrix[13] - (Math.abs(matrix[1]) * args[0] + Math.abs(matrix[5]) * args[1] + Math.abs(matrix[9]) * args[2]) / 2;
    this.plan = new CatPoseContactPlan(this.contacts.copyGoalsInto(new Float64Array(12)));
    this.visuals = [...skeleton.bindings.values()].map(bind => {
      const node = boxes.get(bind.part.id);
      if (!node) throw new RangeError(`Missing rigid cat box: ${bind.part.id}`);
      const owner = byId.get(bind.jointId)!;
      const child = owner.children[0];
      const limb = /^(legF|hip[LR]$|forearmF|shinB)/.test(bind.part.id) && child !== undefined;
      const direction = limb ? new Vector3(...child.position) : new Vector3(0, 1, 0);
      const length = direction.length();
      return { bind, node, extension: extensions.indexOf(bind.part.id as typeof extensions[number]),
        restPosition: new Vector3(...bind.position), restScale: new Vector3(...bind.scale), limb, weight: 0,
        fitPosition: direction.clone().multiplyScalar(.5),
        fitRotation: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()),
        fitScale: new Vector3(Math.min(bind.scale[0], .12 / bind.part.args[0]), length / bind.part.args[1], Math.min(bind.scale[2], .12 / bind.part.args[2])),
      };
    });
  }

  /** The public rig preparation factory supplies this same library to Core. */
  configureLibrary(library: CatPoseLibrary, sphinxGoals?: Float64Array): void {
    if (sphinxGoals !== undefined) {
      validateSphinxGoals(sphinxGoals);
      const worldGoals = new Float64Array(12);
      for (let i = 0; i < 12; i += 3) {
        this.surface.fromArray(sphinxGoals, i).applyMatrix4(this.modelToWorld).toArray(worldGoals, i);
      }
      // Complete validation/copy before replacing the prior library or touching
      // any active target, diagnostics or revision. No caller buffer is retained.
      this.plan.configureSphinxGoals(worldGoals);
    }
    this.library = library;
  }

  /** Cached local FK delta only: no solver, node/history readback or allocation. */
  private applyBreathFK(track: PoseTrack, frame: CatPoseFrame, joint: number, node: Object3D): void {
    const data = track.breathFK!;
    if ((data.jointMask & (1 << joint)) === 0) return;
    const coordinate = (frame.bodyBreath - data.minimum) / (data.maximum - data.minimum) * (data.variants.length - 1);
    const low = Math.min(data.variants.length - 2, Math.floor(coordinate));
    const weight = coordinate - low;
    const time = frame.transitionProgress * track.duration;
    const tick = Math.min(track.duration - 1, Math.floor(time)), alpha = time - tick;
    const a = tick * BASE_SIZE + joint * 4, b = a + BASE_SIZE;
    this.breathNominal.fromArray(track.frames, a).slerp(this.breathNext.fromArray(track.frames, b), alpha);
    this.breathLow.fromArray(data.variants[low], a).slerp(this.breathNext.fromArray(data.variants[low], b), alpha);
    this.breathHigh.fromArray(data.variants[low + 1], a).slerp(this.breathNext.fromArray(data.variants[low + 1], b), alpha);
    this.breathLow.slerp(this.breathHigh, weight);
    this.breathNominal.invert().multiply(this.breathLow);
    node.quaternion.multiply(this.breathNominal).normalize();
  }

  /** Affine body expansion about its supporting surface, never joint scaling. */
  private breatheY(y: number, amount: number, anchor: number): number {
    return y + (y - anchor) * (amount - 1);
  }

  /** Local FK/visual layers, then LAST analytic support for an explicit mask. */
  apply(frame: CatPoseFrame, showHidden = false): void {
    // Invalid route input is rejected before any node/goals/counters change.
    const planned = this.plan.resolve(frame);
    const track = frame.transitionFrom === null || frame.transitionTo === null ? undefined
      : this.library?.tracks[frame.transitionFrom][frame.transitionTo];
    if (track?.breathFK && (!Number.isFinite(frame.bodyBreath) || frame.bodyBreath < track.breathFK.minimum || frame.bodyBreath > track.breathFK.maximum)) {
      throw new RangeError("Breathing FK input is outside the compiled physical range.");
    }
    // Belly arithmetic remains exact for accepted S/Q/L/F and their tracks.
    // Side-face center/back top are fixed rather than translating with breath.
    const breathAnchor = planned.body === "back" ? this.backY : planned.body === "side" ? this.sideY : this.bellyY;
    for (let i = 0; i < this.ordered.length; i++) {
      const { bind, node, rest } = this.ordered[i];
      node.position.set(bind.position[0], bind.parent === "joint-torso"
        ? this.breatheY(bind.position[1], frame.bodyBreath, breathAnchor) : bind.position[1], bind.position[2]);
      node.quaternion.copy(rest).multiply(this.delta.fromArray(frame.rotations, i * 4));
      if (track?.breathFK && frame.bodyBreath !== 1) this.applyBreathFK(track, frame, i, node);
      node.scale.set(1, 1, 1);
      if (i === 0) {
        node.position.x += frame.rootOffset[0];
        node.position.y += frame.rootOffset[1] + frame.bounce;
        node.position.z += frame.rootOffset[2];
        this.heading.setFromAxisAngle(this.up, frame.headingDeg * Math.PI / 180);
        node.quaternion.premultiply(this.heading);
      }
    }
    const fitWeight = frame.transitionFrom === "seated" ? Math.min(1, frame.transitionProgress / .2)
      : frame.transitionTo === "seated" ? Math.min(1, (1 - frame.transitionProgress) / .2)
      : frame.pose === "seated" && frame.transitionTo === null ? 0 : 1;
    for (let i = 0; i < this.visuals.length; i++) {
      const visual = this.visuals[i], { bind, node, extension } = visual, id = bind.part.id;
      node.position.set(bind.position[0], bind.position[1], bind.position[2]);
      node.scale.set(bind.scale[0], bind.scale[1], bind.scale[2]);
      node.quaternion.identity();
      // Geometry args/coat recipes remain unchanged; only the visual boxes fit
      // between their real rigid hinges. Never pass this scale to a child joint.
      const weight = id.startsWith("forearm") ? (extension >= 0 && (frame.visibleMask & (1 << extension)) !== 0 ? 1 : 0) : fitWeight;
      visual.weight = weight;
      if (visual.limb && weight > 0) {
        node.position.lerpVectors(visual.restPosition, visual.fitPosition, weight);
        node.scale.lerpVectors(visual.restScale, visual.fitScale, weight);
        node.quaternion.slerp(visual.fitRotation, weight);
      }
      node.visible = extension < 0 || showHidden || (frame.visibleMask & (1 << extension)) !== 0;
      if (id === "body" || id === "chest") {
        node.position.y = this.breatheY(bind.position[1], frame.bodyBreath, breathAnchor);
        node.scale.y *= frame.bodyBreath;
      }
      if (id === "eyeL" || id === "eyeR" || id === "pupilL" || id === "pupilR") node.scale.y *= frame.eyeScale;
    }
    for (let i = 0; i < this.bodyAnchors.length; i++) {
      const { bind, node } = this.bodyAnchors[i];
      node?.position.set(bind.position[0], this.breatheY(bind.position[1], frame.bodyBreath, breathAnchor), bind.position[2]);
    }
    if (planned.body !== null) {
      this.ordered[0].node.updateWorldMatrix(true, true);
      let floor = Infinity;
      for (let i = 0; i < this.visuals.length; i++) {
        const { bind, node } = this.visuals[i], id = bind.part.id;
        if (id !== "body" && (planned.body === "belly" || (id !== "hipL" && id !== "hipR"))) continue;
        for (let x = -1; x <= 1; x += 2) for (let y = -1; y <= 1; y += 2) for (let z = -1; z <= 1; z += 2) {
          this.surface.set(x * bind.part.args[0] / 2, y * bind.part.args[1] / 2, z * bind.part.args[2] / 2).applyMatrix4(node.matrixWorld);
          floor = Math.min(floor, this.surface.y);
        }
      }
      if (Math.abs(floor - this.groundY) > .001) throw new RangeError(`Declared ${planned.body} support is not on the floor: ${floor}`);
    }
    if (frame.transitionTo !== null || frame.pose !== "seated") this.contacts.applyPlan(planned.feet, planned.goals);
    else this.contacts.apply(frame.supportMask);
    // Skin fitting is node copying AFTER the final joint solution, not another
    // pose/IK layer. Translate only inside the cross-section: both rigid hinges
    // remain in their real oriented caps. Never move paws or a support goal.
    for (let i = 0; i < this.visuals.length; i++) {
      const { bind, node, limb, weight } = this.visuals[i];
      if (!limb || weight !== 1 || !node.visible) continue;
      const m = node.matrixWorld.elements, args = bind.part.args;
      const cross = (Math.abs(m[1]) * args[0] + Math.abs(m[9]) * args[2]) / 2;
      const bottom = m[13] - cross - Math.abs(m[5]) * args[1] / 2;
      const lift = this.groundY - bottom;
      // A below-floor hinge cannot be concealed by visual fitting. Leave that
      // invalid geometry observable for the physical gate.
      if (lift <= 1e-12 || cross <= 1e-12 || lift > cross + 1e-10) continue;
      const fraction = Math.min(1, lift / cross);
      this.skinPoint.set(Math.sign(m[1]) * args[0] / 2 * fraction, 0, Math.sign(m[9]) * args[2] / 2 * fraction).applyMatrix4(node.matrixWorld);
      node.parent!.worldToLocal(this.skinPoint);
      node.position.copy(this.skinPoint);
      node.updateWorldMatrix(false, true);
    }
  }
}
