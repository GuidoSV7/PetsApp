import { Euler, Vector3 } from "three";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import type { FrozenCase, FrozenState } from "./cat-skeleton-baseline.test";

/** S20 changes only the admin tail rest origin. Keep the frozen A1 fixture and
 * every default/non-tail coefficient untouched; derive the authorized delta
 * independently of the rig compiler, including the frozen root transform.
 * A1 idle has no Base rotation, so this transports the complete idle branch.
 */
type TailFixture = Pick<FrozenCase, "need"> & { design?: Pick<NonNullable<FrozenCase["design"]>, "bodyDepth"> | null };
type TailState = { root: Pick<FrozenState["root"], "scale" | "rotation"> };
type TailBox = Pick<FrozenState["boxes"][number], "id" | "matrix">;

export function a1TailSurfaceExpectedWorld(fixture: TailFixture, state: TailState, box: TailBox): number[] {
  const expected = [...box.matrix], depth = fixture.design?.bodyDepth ?? 1;
  if (depth === 1 || !["tailBase", "tailMid", "tailTip"].includes(box.id)) return expected;
  const need = fixture.need;
  const slim = needVisualCues({ hunger: need, fun: need, energy: need, hygiene: need }).bodySlim;
  const body = CAT_ANATOMY.find(part => part.id === "body")!;
  const transport = new Vector3(0, 0, -body.args[2] / 2 * slim * (depth - 1))
    .multiply(new Vector3(...state.root.scale)).applyEuler(new Euler(...state.root.rotation as [number, number, number]));
  expected[12] += transport.x; expected[13] += transport.y; expected[14] += transport.z;
  return expected;
}
