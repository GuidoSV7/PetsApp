import { describe, expect, it } from "vitest";
import { Matrix3, Vector3 } from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { poseScene } from "./cat-pose-fixture";
import { boxIntersectionVertices, classifyJointPair, jointTopology, measureJointZone, measureJointZones } from "./cat-pose-joint-zones";

const box = (x = 0, y = 0, z = 0) => new OBB(new Vector3(x, y, z), new Vector3(1, 1, 1));
const link = { parent: "parent", child: "child", pivot: "hinge", source: "analytic fixture" };
describe("S18 spatial articulation regions, not a whole-pair or scalar SAT exemption", () => {
  it("accepts an adjacent intersection only when every intersection vertex is inside its measured pivot sphere", () => {
    const a = box(), b = box(1.5), pivot = new Vector3(.5, 0, 0);
    const zone = measureJointZone(link, a, b, pivot);
    expect(zone.radius).toBeCloseTo(1.5, 12);
    expect(zone.vertexCount).toBe(8);
    expect(classifyJointPair(a, b, pivot, zone).allowed).toBe(true);
    // Same minimum SAT depth .5, but intersection lies outside original region.
    expect(classifyJointPair(a, box(0, 1.5), pivot, zone).allowed).toBe(false);
  });
  it("does not exempt nonadjacent penetration even at a nearby anatomical pivot", () => {
    expect(classifyJointPair(box(), box(1.5)).allowed).toBe(false);
    expect(classifyJointPair(box(), box(3)).allowed).toBe(true);
  });
  it("measures a genuine touching face, but invents no region across an actual gap", () => {
    const pivot = new Vector3(1, 0, 0);
    const touching = measureJointZone(link, box(), box(2), pivot);
    expect(touching.vertexCount).toBe(4);
    expect(touching.radius).toBeCloseTo(Math.SQRT2, 12);
    const gap = measureJointZone(link, box(), box(2.001), pivot);
    expect(gap.radius).toBeNull(); expect(gap.vertexCount).toBe(0);
    expect(classifyJointPair(box(), box(1.99), pivot, gap).allowed).toBe(false);
  });
  it("includes edge/face intersection vertices when neither box has a corner inside the other", () => {
    const b = box(); b.rotation = new Matrix3().set(Math.SQRT1_2, -Math.SQRT1_2, 0, Math.SQRT1_2, Math.SQRT1_2, 0, 0, 0, 1);
    expect(boxIntersectionVertices(box(), b)).toHaveLength(16);
  });
  it("uses explicit part and structural adjacency, not shared-owner siblings or grandchild shortcuts", () => {
    const rig = poseScene(), links = jointTopology(rig.skeleton);
    expect(links).toHaveLength(38);
    const find = (a: string, b: string) => links.find(l => l.parent === a && l.child === b);
    expect(find("body", "tailBase")?.pivot).toBe("joint-tailBase");
    expect(find("tailBase", "tailMid")?.pivot).toBe("joint-tailMid");
    expect(find("tailMid", "tailTip")?.pivot).toBe("joint-tailTip");
    expect(find("body", "head")?.pivot).toBe("joint-neck");
    expect(find("eyeL", "pupilL")?.pivot).toBe("joint-head");
    expect(find("muzzle", "jaw")?.pivot).toBe("joint-jaw");
    expect(find("jaw", "tongue")?.pivot).toBe("joint-jaw");
    for (const [a,b] of [["body","tailMid"],["body","tailTip"],["head","pupilL"],["head","earInnerL"],["chest","head"],["head","tongue"]]) expect(find(a,b)).toBeUndefined();
  });
  for (const profile of [
    { name:"default0", hunger:0, design:defaultCatDesign() },
    { name:"default100", hunger:100, design:defaultCatDesign() },
    { name:"compact0", hunger:0, design:{ ...defaultCatDesign(), bodyDepth:.7, headHeight:-.15, earSize:.6 } },
    { name:"deep100", hunger:100, design:{ ...defaultCatDesign(), bodyDepth:1.6, headHeight:.25, earSize:1.6 } },
  ]) it(profile.name + ": measures all existing latent bind regions without editing A1 or a displayed node", () => {
    const rig = poseScene(profile.hunger, profile.design);
    const before = JSON.stringify([...rig.joints].map(([id,n])=>[id,n.matrixWorld.toArray(),n.position.toArray(),n.scale.toArray()]));
    const binds = JSON.stringify([...rig.skeleton.bindings]);
    const zones = measureJointZones(rig.skeleton);
    expect(zones).toHaveLength(38);
    expect(JSON.stringify([...rig.skeleton.bindings])).toBe(binds);
    expect(JSON.stringify([...rig.joints].map(([id,n])=>[id,n.matrixWorld.toArray(),n.position.toArray(),n.scale.toArray()]))).toBe(before);
    const base = zones.find(z=>z.parent==="body"&&z.child==="tailBase")!;
    if(profile.name==="compact0") expect(base.radius).toBeNull();
    else expect(base.radius).toBeGreaterThan(0);
    if(profile.name==="default100") expect(base.radius).toBeCloseTo(Math.sqrt(.05**2+.05**2+.11**2),10);
    if(profile.name==="deep100") expect(base.wholeChild).toBe(true);
  });
});
