import { expect, it } from "vitest";
import { Vector3 } from "three";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";
import type { CatPoseId } from "@/features/pet-home/cat-pose-types";
import { poseScene } from "./cat-pose-fixture";

it("keeps a geometry-relative fold reserve through the three mapped default23 support paths", () => {
  const routes: [CatPoseId, CatPoseId, number][] = [
    ["standing", "sphinx", 9.03759765625],
    ["loaf", "seated", 30.83837890625],
    ["sphinx", "seated", 33.157470703125],
  ];
  for (const [from, to, witness] of routes) for (const breath of [.99, 1, 1.01]) {
    const rig = poseScene(23);
    const chains = ["FL", "FR", "BL", "BR"].map(leg => {
      const front = leg.startsWith("F");
      const upper = rig.joints.get("joint-" + (front ? "shoulder" : "hip") + leg)!;
      const middle = rig.joints.get("joint-" + (front ? "elbow" : "knee") + leg)!;
      const foot = rig.joints.get("joint-" + (front ? "wrist" : "ankle") + leg)!;
      const a = upper.getWorldPosition(new Vector3()), b = middle.getWorldPosition(new Vector3());
      const c = foot.getWorldPosition(new Vector3());
      return { upper, middle, foot, a: a.distanceTo(b), b: b.distanceTo(c) };
    });
    const prepared = rig.prepareEdge(from, to);
    const duration = CAT_POSE_EDGES.find(e => e.from === from && e.to === to)!.durationTicks;
    const times = new Set<number>([witness]);
    for (let t = 0; t <= duration; t += .25) times.add(t);
    let previousMask = 0, previousGoals: Float64Array | undefined;
    for (const time of [...times].sort((a, b) => a - b)) {
      const tick = Math.floor(time), frame = prepared.sample(tick, time >= duration ? 1 : time - tick);
      const base = frame.base.slice();
      // S30 surveys authored reach only; additives retain their separate gates.
      frame.rotations.set(base.subarray(0, 88)); frame.rootOffset.set(base.subarray(88, 91));
      frame.headingDeg = base[91]; frame.bounce = 0; frame.bodyBreath = breath;
      rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
      const mask = rig.bind.contacts.diagnostics.requestedMask;
      if (mask === null) throw new Error("Support pass did not report a requested mask.");
      const goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12));
      const context = `${from}→${to}/${breath}/${time}`;
      expect(frame.base, context).toEqual(base);
      expect(frame.rootOffset[0], context).toBe(0); expect(frame.rootOffset[2], context).toBe(0);
      expect(rig.bind.contacts.diagnostics.unreachableFeet, context).toBe(0);
      for (let i = 0; i < chains.length; i++) if (mask & (1 << i)) {
        const chain = chains[i], a = chain.upper.getWorldPosition(new Vector3());
        const b = chain.middle.getWorldPosition(new Vector3()), c = chain.foot.getWorldPosition(new Vector3());
        const distance = a.distanceTo(new Vector3().fromArray(goals, i * 3));
        expect(distance - Math.abs(chain.a - chain.b), context).toBeGreaterThanOrEqual(.001 * (chain.a + chain.b));
        expect(chain.a + chain.b - distance, context).toBeGreaterThanOrEqual(.001 * (chain.a + chain.b));
        expect(a.distanceTo(b), context).toBeCloseTo(chain.a, 12);
        expect(b.distanceTo(c), context).toBeCloseTo(chain.b, 12);
        if (previousGoals && previousMask & (1 << i)) expect(Array.from(goals.subarray(i * 3, i * 3 + 3)), context)
          .toEqual(Array.from(previousGoals.subarray(i * 3, i * 3 + 3)));
      }
      for (const joint of rig.joints.values()) expect(joint.scale.toArray(), context).toEqual([1, 1, 1]);
      previousGoals = goals; previousMask = mask;
    }
  }
}, 30_000);
