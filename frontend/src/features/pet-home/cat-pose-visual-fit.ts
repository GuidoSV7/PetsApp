import { Quaternion, Vector3 } from "three";
import type { CatBoxBind, CatJointBind } from "./cat-skeleton";

/** Shared setup geometry for Bind visuals and compiler-owned support hulls.
 * Keep the existing arithmetic order: measure length before normalization and
 * take the half-hinge position before mutating the direction for orientation.
 * This fits mesh boxes only; no real joint transform is changed.
 */
export function createCatPoseVisualFit(bind: CatBoxBind, owner: CatJointBind) {
  const child = owner.children[0];
  const limb = /^(legF|hip[LR]$|forearmF|shinB)/.test(bind.part.id) && child !== undefined;
  const direction = limb ? new Vector3(...child.position) : new Vector3(0, 1, 0);
  const length = direction.length();
  return {
    restPosition: new Vector3(...bind.position), restScale: new Vector3(...bind.scale), limb,
    fitPosition: direction.clone().multiplyScalar(.5),
    fitRotation: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()),
    fitScale: new Vector3(Math.min(bind.scale[0], .12 / bind.part.args[0]), length / bind.part.args[1], Math.min(bind.scale[2], .12 / bind.part.args[2])),
  };
}
