import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CAT_POSES, compileCatPose } from "@/features/pet-home/cat-pose-data";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { poseScene } from "./cat-pose-fixture";

const profiles = [
  { name: "default-hunger0", hunger: 0, design: defaultCatDesign() },
  { name: "default-hunger100", hunger: 100, design: defaultCatDesign() },
  { name: "compact", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];

describe("stable loaf body contact before transition authoring (S1/S4/S6/S12)", () => {
  for (const profile of profiles) it(profile.name, () => {
    const rig = poseScene(profile.hunger, profile.design);
    rig.load(compileCatPose(CAT_POSES.loaf));
    for (const breath of [1, .99, 1.01]) {
      rig.frame.bodyBreath = breath;
      expect(() => rig.bind.apply(rig.frame)).not.toThrow();
      rig.root.updateMatrixWorld(true);
      expect(Math.min(...rig.corners("body").map(p => p.y))).toBeCloseTo(-.29, 10);
      expect(rig.bind.contacts.diagnostics).toEqual({ requestedMask: 0, unreachableFeet: 0, maxFootDrift: null });
      for (const [id, box] of rig.boxes) if (box.visible) {
        for (const corner of rig.corners(id)) expect(corner.y, id + " visible floor corner").toBeGreaterThanOrEqual(-.291);
      }
      for (const side of ["L", "R"]) {
        const box = rig.obb("legF" + side); box.halfSize.addScalar(.001);
        for (const joint of ["shoulderF", "elbowF"]) {
          expect(box.containsPoint(rig.joints.get("joint-" + joint + side)!.getWorldPosition(new Vector3())), joint + side + " oriented cap").toBe(true);
        }
      }
      for (const joint of rig.joints.values()) expect(joint.scale.toArray()).toEqual([1, 1, 1]);
    }
  });
});
