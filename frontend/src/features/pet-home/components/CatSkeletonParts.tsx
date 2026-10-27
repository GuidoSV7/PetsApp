import type { ReactNode } from "react";
import type { Group } from "three";
import type { CatBoxBind, CatJointBind, CatSkeleton } from "@/features/pet-home/cat-skeleton";

/** Rigid hierarchy only: no joint is below a scaled visual mesh. */
export function CatSkeletonParts({ skeleton, joints, renderBox }: {
  skeleton: CatSkeleton;
  joints: Map<string, Group>;
  renderBox: (bind: CatBoxBind) => ReactNode;
}) {
  const renderJoint = (joint: CatJointBind): ReactNode => (
    <group key={joint.id} name={joint.id}
      position={[...joint.position]} rotation={[...joint.rotation]} scale={[...joint.scale]}
      ref={node => { if (node) joints.set(joint.id, node); else joints.delete(joint.id); }}>
      {joint.boxes.map(renderBox)}
      {joint.children.map(renderJoint)}
      {skeleton.anchors.filter(a => a.parent === joint.id).map(anchor => (
        <group key={anchor.id} name={anchor.id} position={[...anchor.position]} scale={[1, 1, 1]} />
      ))}
    </group>
  );
  return skeleton.roots.map(renderJoint);
}
