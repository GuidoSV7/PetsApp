import { Box3, Group, Matrix3, Mesh, Vector3 } from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { buildCatSkeleton, type CatJointBind } from "@/features/pet-home/cat-skeleton";
import { CatPoseBind } from "@/features/pet-home/cat-pose-bind";
import { CatPoseSimulation } from "@/features/pet-home/cat-pose-simulation";
import { prepareCatPoseSimulation } from "@/features/pet-home/cat-pose-transfer";
import type { CatPoseId } from "@/features/pet-home/cat-pose-types";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";
import { CAT_JOINT_IDS } from "@/features/pet-home/cat-pose-data";
import type { CompiledCatPose } from "@/features/pet-home/cat-pose-types";
import { defaultCatDesign, type CatDesignTunables } from "@/features/admin/cat-design-settings";
import { resolveCatAnatomy } from "@/features/admin/resolve-cat-design";
import { applyNeedVisualsToAnatomy, needVisualCues } from "@/features/pet-home/need-visuals";

export function poseScene(hunger = 100, design: CatDesignTunables = defaultCatDesign(),
  placement?: { position: readonly [number, number, number]; yaw: number; scale: number; lazyWorldUpdate?: boolean }) {
  const skeleton = buildCatSkeleton(applyNeedVisualsToAnatomy(resolveCatAnatomy(CAT_ANATOMY, design),
    needVisualCues({ hunger, fun: 100, energy: 100, hygiene: 100 })));
  const root = new Group(), joints = new Map<string, Group>(), boxes = new Map<string, Mesh>();
  if (placement) {
    root.position.set(...placement.position); root.rotation.y = placement.yaw; root.scale.setScalar(placement.scale);
  }
  function add(bind: CatJointBind, parent: Group) {
    const joint = new Group(); joint.name = bind.id;
    joint.position.set(...bind.position); joint.rotation.set(...bind.rotation);
    joints.set(bind.id, joint); parent.add(joint);
    for (const box of bind.boxes) {
      const node = new Mesh(); node.name = box.part.id;
      node.position.set(...box.position); node.scale.set(...box.scale); node.visible = box.visible;
      boxes.set(node.name, node); joint.add(node);
    }
    bind.children.forEach(child => add(child, joint));
  }
  skeleton.roots.forEach(bind => add(bind, root));
  if (!placement?.lazyWorldUpdate) root.updateMatrixWorld(true);
  const anchors = new Map<string, Group>();
  for (const descriptor of skeleton.anchors) {
    const node = new Group(); node.name = descriptor.id; node.position.set(...descriptor.position);
    joints.get(descriptor.parent)!.add(node); anchors.set(node.name, node);
  }
  const bind = new CatPoseBind(skeleton, joints, boxes, anchors), frame = new CatPoseSimulation({ seed: 13 }).sample();
  function load(pose: CompiledCatPose, from = pose.id, to: typeof pose.id | null = null, progress = 1) {
    frame.pose = pose.id; frame.transitionFrom = to ? from : null; frame.transitionTo = to;
    frame.transitionProgress = progress;
    CAT_JOINT_IDS.forEach((id, i) => frame.rotations.set(pose.rotations[id], i * 4));
    frame.rootOffset.set(pose.rootOffset); frame.headingDeg = pose.headingDeg;
    frame.supportMask = to ? -1 : pose.supports.reduce((mask, leg) => mask | (1 << ["FL", "FR", "BL", "BR"].indexOf(leg)), 0);
    frame.visibleMask = pose.visibleParts.reduce((mask, id) => mask | (1 << ["forearmFL", "forearmFR", "shinBL", "shinBR", "jaw", "tongue"].indexOf(id)), 0);
    return frame;
  }
  function corners(id: string) {
    const part = skeleton.bindings.get(id)!.part, node = boxes.get(id)!;
    return [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z =>
      new Vector3(x * part.args[0] / 2, y * part.args[1] / 2, z * part.args[2] / 2).applyMatrix4(node.matrixWorld))));
  }
  function obb(id: string) {
    const part = skeleton.bindings.get(id)!.part, node = boxes.get(id)!;
    return new OBB(new Vector3(), new Vector3(...part.args).multiplyScalar(.5), new Matrix3()).applyMatrix4(node.matrixWorld);
  }
  function aabb(id: string) { return new Box3().setFromPoints(corners(id)); }
  function prepareEdge(from: CatPoseId, to: CatPoseId) {
    const simulation = prepareCatPoseSimulation(skeleton, { seed: 13, reducedMotion: true }, bind);
    simulation.enqueue({ tick: 1, kind: "pose", pose: from }); simulation.step();
    simulation.enqueue({ tick: 2, kind: "reducedMotion", value: false });
    simulation.enqueue({ tick: 2, kind: "pose", pose: to }); simulation.step();
    const duration = CAT_POSE_EDGES.find(edge => edge.from === from && edge.to === to)!.durationTicks;
    return { simulation, sample(tick: number, alpha: number) {
      const end = 2 + Math.min(tick + 1, duration);
      while (simulation.tick < end) simulation.step();
      return simulation.sample(tick >= duration ? 1 : alpha);
    } };
  }
  function prepareStable(pose: CatPoseId) {
    const simulation = prepareCatPoseSimulation(skeleton, { seed: 13, reducedMotion: true }, bind);
    simulation.enqueue({ tick: 1, kind: "pose", pose }); simulation.step();
    simulation.enqueue({ tick: 2, kind: "reducedMotion", value: false }); simulation.step();
    return simulation;
  }
  return { skeleton, root, joints, boxes, anchors, bind, frame, load, corners, obb, aabb, prepareEdge, prepareStable };
}
