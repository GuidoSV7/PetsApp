import { Vector3, type Object3D } from "three";

const chains = [
  ["shoulderFL", "elbowFL", "wristFL"], ["shoulderFR", "elbowFR", "wristFR"],
  ["hipBL", "kneeBL", "ankleBL"], ["hipBR", "kneeBR", "ankleBR"],
] as const;

/** Bath-only body compensation, NOT a limb solver. Calibrate from true REST
 * lengths/fixed goals once. Reach spheres also retain the neutral rear
 * extension where the seated hip must bridge a hidden shin to the flat paw.
 * Existing LAST support IK still owns every limb and its full chain length.
 */
export class CatBathSupport {
  private readonly axis = new Vector3();
  private readonly point = new Vector3();
  private readonly legs;

  constructor(private readonly root: Object3D, joints: ReadonlyMap<string, Object3D>, goals: Float64Array) {
    root.updateWorldMatrix(true, true);
    this.legs = chains.map((ids, i) => {
      const [upper, lower, foot] = ids.map(id => joints.get("joint-" + id)!);
      const a = upper.getWorldPosition(new Vector3()), b = lower.getWorldPosition(new Vector3()), c = foot.getWorldPosition(new Vector3());
      return { upper, reach: a.distanceTo(b) + b.distanceTo(c),
        bridge: a.distanceTo(c), goal: new Vector3().fromArray(goals, i * 3) };
    });
  }

  apply(mask: number, fitWeight: number): void {
    this.root.updateWorldMatrix(true, true);
    this.axis.set(0, 1, 0);
    if (this.root.parent) {
      const m = this.root.parent.matrixWorld.elements;
      this.axis.set(m[4], m[5], m[6]);
    }
    const scale = this.axis.length(); this.axis.divideScalar(scale);
    let drop = 0;
    for (let i = 0; i < this.legs.length; i++) {
      if ((mask & (1 << i)) === 0) continue;
      const { upper, reach: chainReach, bridge, goal } = this.legs[i];
      // At seated REST the visible hip's distal face meets the paw top; the
      // hidden shin's extra extension is not a rendered bridge. Keep that
      // neutral span until the existing visual fit supplies visible coverage.
      // This bounds body authoring, never the support solver or stored goals.
      const reach = i < 2 ? chainReach : bridge + (chainReach - bridge) * fitWeight;
      upper.getWorldPosition(this.point).sub(goal);
      const vertical = this.point.dot(this.axis);
      const perpendicularSq = this.point.lengthSq() - vertical * vertical;
      const radicand = reach * reach - perpendicularSq;
      if (radicand < 0) throw new RangeError("Bath support has no vertical reach interval.");
      drop = Math.min(drop, Math.sqrt(radicand) - vertical);
    }
    // Continuous relative inset, not a reach cap or tolerance change. At zero
    // compensation/roll the authored base and supported boundary stay exact.
    this.root.position.y += drop * 1.001 / scale;
  }
}
