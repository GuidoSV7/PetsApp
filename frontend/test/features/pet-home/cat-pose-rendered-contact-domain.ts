import { Vector3, type Object3D } from "three";
import { boxDistance, jointTopology, measureRigJointContacts, type JointLink, type ZoneRig } from "./cat-pose-joint-zones";

export const RENDERED_CONTACT_DOMAIN_VERSION = "s25-rendered-chain-v1";
/** Contract the original piece tree, not the joint-owner graph or a guessed ID list.
 * The child's original distal pivot is retained as diagnostic metadata, never a
 * pivot-containment gate. Input links and displayed nodes are never mutated.
 */
export function collapseRenderedLinks(links: readonly JointLink[], visible: (id: string) => boolean) {
  const parents = new Map(links.map(link => [link.child, link]));
  if (parents.size !== links.length) throw new Error("Rendered contact domain requires a unique piece parent");
  return links.flatMap(link => {
    if (!visible(link.child)) return [];
    let parent = link.parent;
    const via: string[] = [], seen = new Set([link.child]);
    while (!visible(parent)) {
      if (seen.has(parent)) throw new Error("Cycle in rendered contact domain");
      seen.add(parent); via.unshift(parent);
      const next = parents.get(parent);
      if (!next) return [];
      parent = next.parent;
    }
    return [{ ...link, parent, via }];
  });
}
function effectivelyVisible(node: Object3D) {
  for (let current: Object3D | null = node; current; current = current.parent) if (!current.visible) return false;
  return true;
}
/** Fresh per-frame visibility: Bind can reveal an extension hidden in the rest rig. */
export function measureRenderedContactDomain(rig: ZoneRig) {
  const structuralDiagnostics = measureRigJointContacts(rig);
  const originals = new Map(structuralDiagnostics.map(link => [link.parent + "/" + link.child, link]));
  const contacts = collapseRenderedLinks(jointTopology(rig.skeleton), id => effectivelyVisible(rig.boxes.get(id)!)).map(link => {
    const original = originals.get(link.parent + "/" + link.child);
    if (original) return { ...original, via: link.via };
    const parent = rig.obb(link.parent), child = rig.obb(link.child);
    const pivot = rig.joints.get(link.pivot)!.getWorldPosition(new Vector3());
    const onParent = parent.clampPoint(pivot, new Vector3()), onChild = child.clampPoint(pivot, new Vector3());
    const articulationDistance = Math.min(
      onParent.distanceTo(child.clampPoint(onParent, new Vector3())),
      onChild.distanceTo(parent.clampPoint(onChild, new Vector3())),
    );
    const kind = rig.skeleton.bindings.get(link.parent)!.jointId === rig.skeleton.bindings.get(link.child)!.jointId ? "decorative" : "structural";
    return { ...link, kind, distance: boxDistance(parent, child), articulationDistance };
  });
  return { version: RENDERED_CONTACT_DOMAIN_VERSION, contacts, structuralDiagnostics };
}
