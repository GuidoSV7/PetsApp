import { Group, Mesh } from "three";
import { CatPoseBind } from "./cat-pose-bind";
import type { CatJointBind, CatSkeleton } from "./cat-skeleton";

/** Compiler-owned A1 rest rig. Never consumes displayed nodes or a playback clock. */
export function createCatPoseReference(skeleton: CatSkeleton) {
  const root = new Group(), joints = new Map<string, Group>(), boxes = new Map<string, Mesh>();
  function add(bind: CatJointBind, parent: Group) {
    const node = new Group(); node.position.set(...bind.position); node.rotation.set(...bind.rotation);
    parent.add(node); joints.set(bind.id, node);
    for (const box of bind.boxes) {
      const mesh = new Mesh(); mesh.position.set(...box.position); mesh.scale.set(...box.scale);
      node.add(mesh); boxes.set(box.part.id, mesh);
    }
    bind.children.forEach(child => add(child, node));
  }
  skeleton.roots.forEach(bind => add(bind, root)); root.updateMatrixWorld(true);
  return { root, joints, boxes, bind: new CatPoseBind(skeleton, joints, boxes) };
}
