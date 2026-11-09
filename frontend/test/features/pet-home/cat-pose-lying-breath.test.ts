import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { poseScene } from "./cat-pose-fixture";
const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
const poses = ["side", "curled", "bellyUp"] as const;
const yieldHost = () => new Promise<void>(resolve => setImmediate(resolve));

describe("prepared lying real affine breathing", () => {
  for (const profile of profiles) for (const pose of poses) {
    it(`${pose}/${profile.name}: visible breath, fixed body surface and coherent attachments`, () => {
      const rig = poseScene(profile.hunger, profile.design), simulation = rig.prepareStable(pose);
      const body = rig.boxes.get("body")!, chest = rig.boxes.get("chest")!, args = rig.skeleton.bindings.get("body")!.part.args;
      const contact = pose === "bellyUp" ? new Vector3(0, args[1] / 2, -args[2] / 2) : new Vector3(-args[0] / 2, 0, 0);
      const neutral = simulation.sample(); neutral.bodyBreath = 1; rig.bind.apply(neutral); rig.root.updateMatrixWorld(true);
      const contactWorld = contact.clone().applyMatrix4(body.matrixWorld), root = rig.joints.get("joint-root")!.position.clone();
      const ids = ["joint-neck", "accessory-back"];
      const points = ids.map(id => body.worldToLocal((rig.joints.get(id) ?? rig.anchors.get(id))!.getWorldPosition(new Vector3())));
      const chestPoint = body.worldToLocal(chest.getWorldPosition(new Vector3())), bodyScale = body.scale.y, chestScale = chest.scale.y;
      for (const amount of [.99, 1.01, 1]) {
        const frame = simulation.sample(), base = frame.base.slice(); frame.bodyBreath = amount;
        rig.bind.apply(frame); rig.root.updateMatrixWorld(true); expect(frame.base).toEqual(base);
        expect(body.scale.y).toBeCloseTo(bodyScale * amount, 14); expect(chest.scale.y).toBeCloseTo(chestScale * amount, 14);
        if (amount !== 1) { expect(body.scale.y).not.toBe(bodyScale); expect(chest.scale.y).not.toBe(chestScale); }
        expect(contact.clone().applyMatrix4(body.matrixWorld).distanceTo(contactWorld), "fixed actual support surface point").toBeLessThan(1e-12);
        for (const [i, id] of ids.entries()) expect(body.worldToLocal((rig.joints.get(id) ?? rig.anchors.get(id))!.getWorldPosition(new Vector3())).distanceTo(points[i]), id).toBeLessThan(1e-12);
        expect(body.worldToLocal(chest.getWorldPosition(new Vector3())).distanceTo(chestPoint), "chest host").toBeLessThan(1e-12);
        expect(rig.anchors.get("accessory-neck")!.getWorldPosition(new Vector3()).distanceTo(rig.joints.get("joint-neck")!.getWorldPosition(new Vector3()))).toBeLessThan(1e-12);
        const headAnchor = rig.anchors.get("accessory-head")!, headBind = rig.skeleton.anchors.find(a => a.id === "accessory-head")!;
        expect(rig.joints.get("joint-head")!.worldToLocal(headAnchor.getWorldPosition(new Vector3())).distanceTo(new Vector3(...headBind.position))).toBeLessThan(1e-12);
        expect(rig.joints.get("joint-root")!.position).toEqual(root);
      }
    }, 30_000);
    it(`${pose}/${profile.name}: 120 actual Core ticks, alpha1 and finite physical surfaces`, async () => {
      const rig = poseScene(profile.hunger, profile.design), ground = Math.min(...rig.corners("pawFL").map(p => p.y)), simulation = rig.prepareStable(pose);
      const base = simulation.sample().base.slice(), goals = rig.bind.contacts.copyGoalsInto(new Float64Array(12)), revision = rig.bind.contacts.goalRevision;
      const neck = new Vector3(), back = new Vector3(); let initialized = false, minimum = Infinity, maximum = -Infinity;
      for (let tick = 0; tick < 120; tick++) {
        simulation.step();
        for (const alpha of [0, .25, .5, .75, 1]) {
          const frame = simulation.sample(alpha); minimum = Math.min(minimum, frame.bodyBreath); maximum = Math.max(maximum, frame.bodyBreath);
          expect(frame.base).toEqual(base); expect(frame.pose).toBe(pose); expect(frame.transitionTo).toBeNull();
          const rotations = frame.rotations.slice(); rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
          expect(frame.base).toEqual(base); expect(frame.rotations).toEqual(rotations);
          expect(rig.bind.contacts.diagnostics).toEqual({ requestedMask: 0, unreachableFeet: 0, maxFootDrift: null, bodySupportCorrection: null, freeFootCorrection: null, freeFootUnreachable: null });
          expect(rig.bind.contacts.copyGoalsInto(new Float64Array(12))).toEqual(goals); expect(rig.bind.contacts.goalRevision).toBe(revision);
          expect(rig.bind.plan.output.body).toBe(pose === "bellyUp" ? "back" : "side");
          expect(Math.min(...rig.corners("body").map(p => p.y))).toBeCloseTo(ground, 3);
          for (const [id, node] of rig.boxes) if (node.visible) for (const p of rig.corners(id)) {
            expect(p.toArray().every(Number.isFinite), `${tick}+${alpha}/${id}/finite XYZ`).toBe(true);
            expect(p.y, `${tick}+${alpha}/${id}/floor`).toBeGreaterThanOrEqual(ground - .001);
          }
          for (const [joint, proximal, distal] of [["wristFL", "forearmFL", "pawFL"], ["wristFR", "forearmFR", "pawFR"], ["ankleBL", "shinBL", "pawBL"], ["ankleBR", "shinBR", "pawBR"]]) {
            const hinge = rig.joints.get("joint-" + joint)!.getWorldPosition(new Vector3());
            for (const id of [proximal, distal]) { const obb = rig.obb(id); obb.halfSize.addScalar(.001); expect(obb.containsPoint(hinge), `${joint}/${id}/oriented cap`).toBe(true); }
          }
          for (const node of rig.joints.values()) expect(node.scale.toArray()).toEqual([1, 1, 1]);
          const body = rig.boxes.get("body")!, n = body.worldToLocal(rig.joints.get("joint-neck")!.getWorldPosition(new Vector3())), b = body.worldToLocal(rig.anchors.get("accessory-back")!.getWorldPosition(new Vector3()));
          if (!initialized) { neck.copy(n); back.copy(b); initialized = true; }
          expect(n.distanceTo(neck)).toBeLessThan(1e-12); expect(b.distanceTo(back)).toBeLessThan(1e-12);
        }
        await yieldHost();
      }
      expect(maximum - minimum, "actual nonzero Core breath").toBeGreaterThan(.001);
    }, 30_000);
  }
});
