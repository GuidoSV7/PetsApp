import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { poseScene } from "./cat-pose-fixture";

const profiles = [
  { name: "default-hunger0", hunger: 0, design: defaultCatDesign() },
  { name: "default-hunger100", hunger: 100, design: defaultCatDesign() },
  { name: "compact", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];

describe("public rigid breathing surface transform (S4/S6/S12)", () => {
  for (const profile of profiles) it(profile.name + ": belly plane and attached surfaces stay coherent", () => {
    const rig = poseScene(profile.hunger, profile.design);
    rig.frame.bodyBreath = 1; rig.bind.apply(rig.frame);
    rig.root.updateMatrixWorld(true);
    const body = rig.boxes.get("body")!, chest = rig.boxes.get("chest")!;
    const bottom = Math.min(...rig.corners("body").map(p => p.y));
    const height = Math.max(...rig.corners("body").map(p => p.y)) - bottom;
    const chestCenter = chest.getWorldPosition(new Vector3()).y;
    const neckPoint = body.worldToLocal(rig.joints.get("joint-neck")!.getWorldPosition(new Vector3()));
    const backPoint = body.worldToLocal(rig.anchors.get("accessory-back")!.getWorldPosition(new Vector3()));
    const rootPosition = rig.joints.get("joint-root")!.position.clone();
    const pawGoals = ["pawFL", "pawFR", "pawBL", "pawBR"].map(id => rig.boxes.get(id)!.getWorldPosition(new Vector3()));
    for (const amount of [.99, 1.01, 1]) {
      rig.frame.bodyBreath = amount; rig.bind.apply(rig.frame); rig.root.updateMatrixWorld(true);
      expect(Math.min(...rig.corners("body").map(p => p.y)), "belly contact plane").toBeCloseTo(bottom, 12);
      expect(chest.getWorldPosition(new Vector3()).y, "chest follows the same affine host").toBeCloseTo(chestCenter + height / 2 * (amount - 1), 12);
      expect(body.worldToLocal(rig.joints.get("joint-neck")!.getWorldPosition(new Vector3())).distanceTo(neckPoint), "neck surface").toBeLessThan(1e-12);
      expect(body.worldToLocal(rig.anchors.get("accessory-back")!.getWorldPosition(new Vector3())).distanceTo(backPoint), "back surface anchor").toBeLessThan(1e-12);
      expect(rig.anchors.get("accessory-neck")!.getWorldPosition(new Vector3()).distanceTo(rig.joints.get("joint-neck")!.getWorldPosition(new Vector3()))).toBeLessThan(1e-12);
      for (const [i, id] of ["pawFL", "pawFR", "pawBL", "pawBR"].entries()) {
        expect(rig.boxes.get(id)!.getWorldPosition(new Vector3()).distanceTo(pawGoals[i]), id).toBeLessThanOrEqual(.001);
      }
      for (const joint of rig.joints.values()) expect(joint.scale.toArray()).toEqual([1, 1, 1]);
      expect(rig.joints.get("joint-root")!.position).toEqual(rootPosition);
      expect(rig.bind.contacts.diagnostics.unreachableFeet).toBe(0);
      expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001);
      expect([...rig.anchors.keys()]).toEqual(["accessory-neck", "accessory-head", "accessory-back"]);
    }
  });
});
