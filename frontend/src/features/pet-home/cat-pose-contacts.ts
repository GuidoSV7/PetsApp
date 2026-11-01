import { Quaternion, Vector3, type Object3D } from "three";
import { createSupportScratch, createSupportSolution, solveTwoBoneSupportInto } from "./cat-support-ik";
import type { SupportChainInput } from "./cat-pose-types";

const chains = [
  ["shoulderFL", "elbowFL", "wristFL"], ["shoulderFR", "elbowFR", "wristFR"],
  ["hipBL", "kneeBL", "ankleBL"], ["hipBR", "kneeBR", "ankleBR"],
] as const;
type MutablePoint = [number, number, number];
const point = (): MutablePoint => [0, 0, 0];

/**
 * LAST-layer solver for explicitly planted paw goals. Goals are captured once
 * from the real scene, not recomputed from a moving pose to conceal drift.
 * This is NOT the transition contact planner: unresolved (-1) masks are rejected.
 */
export class CatPoseContacts {
  readonly diagnostics: { requestedMask: number | null; unreachableFeet: number | null; maxFootDrift: number | null } = {
    requestedMask: null, unreachableFeet: null, maxFootDrift: null,
  };
  private readonly chains;
  private readonly scratch = createSupportScratch();
  private readonly solution = createSupportSolution();
  private readonly origin = new Vector3();
  private readonly oldDirection = new Vector3();
  private readonly newDirection = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly parentRotation = new Quaternion();
  private readonly worldRotation = new Quaternion();
  private readonly delta = new Quaternion();

  constructor(private readonly root: Object3D, joints: ReadonlyMap<string, Object3D>) {
    root.updateWorldMatrix(true, true);
    this.chains = chains.map(ids => {
      const nodes = ids.map(id => {
        const node = joints.get("joint-" + id);
        if (!node) throw new RangeError(`Missing support joint: joint-${id}`);
        return node;
      });
      const [upper, lower, foot] = nodes;
      const a = upper.getWorldPosition(new Vector3()), b = lower.getWorldPosition(new Vector3()), c = foot.getWorldPosition(new Vector3());
      const input = { root: point(), target: c.toArray() as MutablePoint, pole: b.toArray() as MutablePoint,
        upperLength: a.distanceTo(b), lowerLength: b.distanceTo(c) };
      return { upper, lower, foot, input, flat: foot.getWorldQuaternion(new Quaternion()) };
    });
  }

  private aim(node: Object3D, child: Object3D, target: readonly number[]) {
    node.getWorldPosition(this.origin);
    child.getWorldPosition(this.oldDirection).sub(this.origin).normalize();
    this.newDirection.set(target[0], target[1], target[2]).sub(this.origin).normalize();
    this.delta.setFromUnitVectors(this.oldDirection, this.newDirection);
    node.getWorldQuaternion(this.worldRotation);
    node.parent!.getWorldQuaternion(this.parentRotation).invert();
    this.rotation.copy(this.parentRotation).multiply(this.delta).multiply(this.worldRotation).normalize();
    node.quaternion.copy(this.rotation);
    node.updateWorldMatrix(false, true);
  }

  apply(mask: number): typeof this.diagnostics {
    if (!Number.isInteger(mask) || mask < 0 || mask > 15) throw new RangeError("Unresolved support phase: supply an explicit four-leg mask.");
    const diagnostics = this.diagnostics;
    diagnostics.requestedMask = mask; diagnostics.unreachableFeet = 0; diagnostics.maxFootDrift = mask === 0 ? null : 0;
    this.root.updateWorldMatrix(true, true);
    for (let i = 0; i < this.chains.length; i++) {
      if ((mask & (1 << i)) === 0) continue;
      const { upper, lower, foot, input, flat } = this.chains[i];
      upper.getWorldPosition(this.origin).toArray(input.root);
      // Exact equilibrium shortcut preserves neutral bind matrices/pixels. It
      // never accepts a moving/unreachable endpoint merely because it is close.
      foot.getWorldPosition(this.origin);
      foot.getWorldQuaternion(this.worldRotation);
      if (this.origin.x === input.target[0] && this.origin.y === input.target[1] && this.origin.z === input.target[2] && this.worldRotation.equals(flat)) continue;
      solveTwoBoneSupportInto(input satisfies SupportChainInput, this.solution, this.scratch);
      if (!this.solution.reachable) diagnostics.unreachableFeet++;
      this.aim(upper, lower, this.solution.knee);
      this.aim(lower, foot, this.solution.foot);
      foot.parent!.getWorldQuaternion(this.parentRotation).invert();
      foot.quaternion.copy(this.parentRotation).multiply(flat).normalize();
      foot.updateWorldMatrix(false, true);
      foot.getWorldPosition(this.origin);
      const drift = Math.hypot(this.origin.x - input.target[0], this.origin.y - input.target[1], this.origin.z - input.target[2]);
      diagnostics.maxFootDrift = Math.max(diagnostics.maxFootDrift ?? 0, drift);
    }
    return diagnostics;
  }
}
