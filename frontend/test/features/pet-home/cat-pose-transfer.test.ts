import { describe, expect, it } from "vitest";
import { CatPoseSimulation } from "@/features/pet-home/cat-pose-simulation";
import { CAT_POSE_LIBRARY } from "@/features/pet-home/cat-pose-tracks";
import { poseScene } from "./cat-pose-fixture";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { Vector3 } from "three";

describe("transfer library public boundary", () => {
  it("breath1 keeps configured and no-library rigid output exactly equal", () => {
    const rig = poseScene(), plain = poseScene();
    for (const [from, to] of [["seated", "loaf"], ["loaf", "seated"]] as const) {
      const prepared = rig.prepareEdge(from, to);
      for (const tick of [0, 9, 18, 22, 33, 34, 40, 45]) {
        const frame = prepared.sample(tick, .375); frame.bodyBreath = 1;
        rig.bind.apply(frame); plain.bind.apply(frame);
        rig.root.updateMatrixWorld(true); plain.root.updateMatrixWorld(true);
        for (const [id, node] of rig.joints) expect(node.matrixWorld.elements, id).toEqual(plain.joints.get(id)!.matrixWorld.elements);
        for (const [id, node] of rig.boxes) expect(node.matrixWorld.elements, id).toEqual(plain.boxes.get(id)!.matrixWorld.elements);
      }
    }
  });
  it("prepares both transfer directions through the same simulator class", () => {
    const rig = poseScene();
    for (const [from, to] of [["seated", "loaf"], ["loaf", "seated"]] as const) {
      const prepared = rig.prepareEdge(from, to);
      expect(prepared.simulation).toBeInstanceOf(CatPoseSimulation);
      expect(prepared.sample(0, 0).pose).toBe(from);
      const middle = prepared.sample(10, .5);
      expect(middle.visibleMask & 15).toBe(15);
      const terminal = prepared.sample(from === "seated" ? 45 : 48, 1);
      expect(terminal.pose).toBe(to);
      expect(terminal.visibleMask & 15).toBe(0);
      expect(terminal.base).toEqual(CAT_POSE_LIBRARY.stable[to].base);
    }
  });
});

const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];

function checkHandoff(rig: ReturnType<typeof poseScene>, breath: number, context: string) {
  let maxWorld = 0, maxRotation = 0;
  for (const [from, to, boundary, beforeMask, afterMask] of [
    ["seated", "loaf", 34, 12, 0], ["loaf", "seated", 20, 0, 15],
  ] as const) {
    const prepared = rig.prepareEdge(from, to);
    const before = prepared.sample(boundary - 1, 1 - 1e-9);
    before.bodyBreath = breath;
    rig.bind.apply(before); rig.root.updateMatrixWorld(true);
    expect(rig.bind.contacts.diagnostics.requestedMask).toBe(beforeMask);
    expect(rig.bind.contacts.diagnostics.unreachableFeet).toBe(0);
    if (beforeMask) expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001);
    else expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeNull();
    const ids = afterMask ? ["shoulderFL", "elbowFL", "wristFL", "shoulderFR", "elbowFR", "wristFR",
      "hipBL", "kneeBL", "ankleBL", "hipBR", "kneeBR", "ankleBR"]
      : ["hipBL", "kneeBL", "ankleBL", "hipBR", "kneeBR", "ankleBR"];
    const worlds = ids.map(id => rig.joints.get("joint-" + id)!.getWorldPosition(new Vector3()));
    const rotations = ids.map(id => rig.joints.get("joint-" + id)!.quaternion.clone());
    const revision = rig.bind.contacts.goalRevision;
    const frame = prepared.sample(boundary, 0), base = frame.base.slice();
    frame.bodyBreath = breath;
    rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
    expect(frame.base).toEqual(base); // Body-surface FK never retargets Core.base.
    expect(rig.bind.contacts.diagnostics.requestedMask).toBe(afterMask);
    expect(rig.bind.contacts.diagnostics.unreachableFeet).toBe(0);
    if (afterMask) expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeLessThanOrEqual(.001);
    else expect(rig.bind.contacts.diagnostics.maxFootDrift).toBeNull();
    expect(rig.bind.contacts.goalRevision).toBe(revision + (afterMask ? 1 : 0));
    for (const [i, id] of ids.entries()) {
      const node = rig.joints.get("joint-" + id)!;
      const difference = node.getWorldPosition(new Vector3()).distanceTo(worlds[i]);
      const angle = node.quaternion.angleTo(rotations[i]);
      expect(difference, `${from}->${to}/${context}/${breath}/${id} handoff world gap`).toBeLessThanOrEqual(.001);
      expect(angle, `${from}->${to}/${context}/${breath}/${id} handoff rotation`).toBeLessThanOrEqual(.000001);
      maxWorld = Math.max(maxWorld, difference); maxRotation = Math.max(maxRotation, angle);
    }
  }
  return { maxWorld, maxRotation };
}

describe("transfer breathing handoff", () => {
  for (const profile of profiles) {
    for (const breath of [.99, .996375, 1, 1.004125, 1.01]) {
      it(`${profile.name} breath${breath}: released FK matches the real supported reference`, () => {
        checkHandoff(poseScene(profile.hunger, profile.design), breath, profile.name);
      });
    }
    it(`${profile.name}: all eighty interior breath midpoints preserve both handoffs`, () => {
      const rig = poseScene(profile.hunger, profile.design);
      let maxWorld = 0, maxRotation = 0;
      for (let interval = 0; interval < 80; interval++) {
        const result = checkHandoff(rig, 1 + (interval - 39.5) / 4000, profile.name);
        maxWorld = Math.max(maxWorld, result.maxWorld); maxRotation = Math.max(maxRotation, result.maxRotation);
      }
      console.info("breath-interpolation-bound", JSON.stringify({ profile: profile.name, midpoints: 80, maxWorld, maxRotation }));
    });
  }
});
