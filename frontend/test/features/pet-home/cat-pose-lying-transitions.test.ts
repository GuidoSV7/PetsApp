import { describe, expect, it } from "vitest";
import { Quaternion } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";
import { poseScene } from "./cat-pose-fixture";

const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
const arcs = [["sphinx", "side"], ["side", "sphinx"], ["side", "curled"], ["curled", "side"], ["side", "bellyUp"], ["bellyUp", "side"]] as const;

describe("S19 lying tracks arrive at the actual prepared stable authoring", () => {
  for (const profile of profiles) for (const [from, to] of arcs) {
    it(`${profile.name}/${from}->${to}: final base and first stable frame have no authoring handoff`, () => {
      const expectedRig = poseScene(profile.hunger, profile.design);
      const expected = expectedRig.prepareStable(to).sample().base.slice();
      const rig = poseScene(profile.hunger, profile.design), edge = rig.prepareEdge(from, to);
      const duration = CAT_POSE_EDGES.find(value => value.from === from && value.to === to)!.durationTicks;
      const arrival = edge.sample(duration, 1);
      expect(arrival.pose).toBe(to);
      expect(arrival.transitionTo).toBeNull();
      for (let offset = 0; offset < 88; offset += 4) {
        const wanted = new Quaternion().fromArray(expected, offset);
        const actual = new Quaternion().fromArray(arrival.base, offset);
        expect(actual.angleTo(wanted), `${from}->${to}/joint ${offset / 4}/actual stable endpoint`).toBeLessThanOrEqual(1e-6);
      }
      for (let offset = 88; offset < 91; offset++) expect(Math.abs(arrival.base[offset] - expected[offset]), `root/${offset - 88}`).toBeLessThanOrEqual(.001);
      expect(Math.abs(arrival.base[91] - expected[91]), "separate heading handoff").toBeLessThanOrEqual(1e-6);
      const before = arrival.base.slice(); edge.simulation.step();
      expect(edge.simulation.sample(1).base, "first stable frame must retain arrived base").toEqual(before);
    });
  }
});
