import { describe, expect, it } from "vitest";
import { Group } from "three";
import { poseScene } from "./cat-pose-fixture";
import { jointTopology, measureRigJointContacts, JOINT_NUMERICAL_EPSILON } from "./cat-pose-joint-zones";
import { collapseRenderedLinks, measureRenderedContactDomain } from "./cat-pose-rendered-contact-domain";

const link = (parent: string, child: string) => ({ parent, child, pivot: "joint-" + child, source: "test" });
describe("S25 rendered-chain contact domain v1", () => {
  it("bridges every hidden ancestor, retaining the distal articulation and input graph", () => {
    const links = [link("leg", "extension"), link("extension", "hidden"), link("hidden", "paw")];
    const before = JSON.stringify(links);
    expect(collapseRenderedLinks(links, id => !["extension", "hidden"].includes(id))).toEqual([
      { ...link("leg", "paw"), pivot: "joint-paw", via: ["extension", "hidden"] },
    ]);
    expect(JSON.stringify(links)).toBe(before);
  });
  it("preserves all-visible edges and omits hidden leaves, not their visible descendants", () => {
    const links = [link("body", "leg"), link("leg", "paw"), link("body", "hidden")];
    expect(collapseRenderedLinks(links, id => id !== "hidden")).toEqual(links.slice(0, 2).map(l => ({ ...l, via: [] })));
    expect(collapseRenderedLinks(links, () => true)).toEqual(links.map(l => ({ ...l, via: [] })));
  });
  it("retains every original metric and uses actual Bind visibility rather than rest hidden IDs", () => {
    const rig = poseScene(0);
    const frame = rig.frame; frame.visibleMask = 0; rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
    const original = measureRigJointContacts(rig), before = rig.boxes.get("pawFL")!.matrixWorld.toArray();
    const result = measureRenderedContactDomain(rig);
    expect(result.version).toBe("s25-rendered-chain-v1");
    expect(result.structuralDiagnostics).toEqual(original);
    expect(result.contacts.find(l => l.parent === "legFL" && l.child === "pawFL")).toMatchObject({ via: ["forearmFL"], distance: 0 });
    expect(result.structuralDiagnostics.find(l => l.parent === "forearmFL" && l.child === "pawFL")!.distance).toBeGreaterThan(.001);
    expect(rig.boxes.get("pawFL")!.matrixWorld.toArray()).toEqual(before);
    frame.visibleMask = 15; rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
    const shown = measureRenderedContactDomain(rig);
    expect(rig.skeleton.bindings.get("forearmFL")!.visible).toBe(false);
    expect(rig.boxes.get("forearmFL")!.visible).toBe(true);
    expect(shown.contacts.some(l => l.parent === "forearmFL" && l.child === "pawFL")).toBe(true);
    expect(shown.contacts.some(l => l.parent === "legFL" && l.child === "pawFL")).toBe(false);
    expect(shown.structuralDiagnostics).toEqual(measureRigJointContacts(rig));
    expect(JOINT_NUMERICAL_EPSILON).toBe(1e-10);
    expect(jointTopology(rig.skeleton).length).toBe(original.length);
  });
  it("respects effective renderer ancestor visibility and preserves non-hidden distances", () => {
    const rig = poseScene(0); rig.bind.apply(rig.frame); rig.root.updateMatrixWorld(true);
    const original = measureRigJointContacts(rig);
    const result = measureRenderedContactDomain(rig);
    for (const selected of result.contacts.filter(l => l.via.length === 0)) {
      expect(selected).toMatchObject(original.find(l => l.parent === selected.parent && l.child === selected.child)!);
    }
    const parent = new Group(); parent.visible = false; parent.add(rig.root);
    expect(measureRenderedContactDomain(rig).contacts).toEqual([]);
    expect(measureRenderedContactDomain(rig).structuralDiagnostics).toEqual(original);
  });
});
