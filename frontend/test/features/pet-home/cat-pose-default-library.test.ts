import { expect, it } from "vitest";
import type { Object3D } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";
import type { CatPoseId } from "@/features/pet-home/cat-pose-types";
import { poseScene } from "./cat-pose-fixture";

function assertSupportedRoute(hunger: number, from: CatPoseId, to: CatPoseId) {
  const duration = CAT_POSE_EDGES.find(edge => edge.from === from && edge.to === to)!.durationTicks;
  for (const breath of [.99, 1, 1.01]) {
    // Each breathing case owns a new forward-only simulation/contact epoch.
    const rig = poseScene(hunger, defaultCatDesign());
    const prepared = rig.prepareEdge(from, to);
    for (let tick = 0; tick <= duration; tick++) for (const alpha of [0, .25, .5, .75, 1]) {
      const frame = prepared.sample(tick, alpha), base = frame.base.slice();
      const time = Math.min(tick + alpha, duration), context = `default${hunger}/${breath}/${tick}+${alpha}`;
      frame.bodyBreath = breath;
      rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
      expect(frame.base, context).toEqual(base);
      expect(frame.rootOffset[0], context).toBe(0);
      expect(frame.rootOffset[2], context).toBe(0);
      const mask = from === "loaf" ? (time < 20 ? 0 : 15) : (time < 20 ? 15 : time < duration ? 0 : 3);
      expect(rig.bind.contacts.diagnostics.requestedMask, context).toBe(mask);
      expect(rig.bind.contacts.diagnostics.unreachableFeet, context).toBe(0);
      if (mask) expect(rig.bind.contacts.diagnostics.maxFootDrift, context).toBeLessThanOrEqual(.001);
      else expect(rig.bind.contacts.diagnostics.maxFootDrift, context).toBeNull();
      for (const [id, node] of rig.boxes) {
        let visible = true;
        for (let ancestor: Object3D | null = node; ancestor; ancestor = ancestor.parent) visible &&= ancestor.visible;
        if (visible) for (const corner of rig.corners(id)) {
          expect(corner.toArray().every(Number.isFinite), `${context}/${id}/finite`).toBe(true);
          expect(corner.y, `${context}/${id}/floor`).toBeGreaterThanOrEqual(-.291);
        }
      }
      for (const node of rig.joints.values()) expect(node.scale.toArray(), context).toEqual([1, 1, 1]);
    }
  }
}

it.each([23, 24])("default%i prepares Q→F and preserves planted support through the full breath range", (hunger) => {
  assertSupportedRoute(hunger, "standing", "sphinx");
}, 30_000);

it("default24 ascends loaf→seated without crossing the planted inner-fold sphere", () => {
  assertSupportedRoute(24, "loaf", "seated");
}, 30_000);

it("default25 preserves real planted reachability at fractional rising samples", () => {
  assertSupportedRoute(25, "loaf", "seated");
}, 30_000);
