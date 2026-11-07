import { BoxGeometry, PerspectiveCamera, Vector3 } from "three";
import { measureRenderedContactDomain } from "./cat-pose-rendered-contact-domain";
import type { CatPoseFrame } from "@/features/pet-home/cat-pose-simulation";
import { poseScene } from "./cat-pose-fixture";

/** Only the R3F host is adapted: real prepared Core/Bind and Three nodes run. */
export function lifecycleHost(hunger = 100) {
  const scene = poseScene(hunger);
  for (const [id, box] of scene.boxes) box.geometry = new BoxGeometry(...scene.skeleton.bindings.get(id)!.part.args);
  const canvas = document.createElement("canvas");
  const state = { camera: new PerspectiveCamera(), gl: { domElement: canvas } };
  return { scene, state, root: { current: scene.root }, interact: { current: null as (() => void) | null } };
}

export function physicalRig(scene: ReturnType<typeof poseScene>) {
  scene.root.updateMatrixWorld(true);
  const scale = scene.root.getWorldScale(new Vector3()).x;
  const structural = measureRenderedContactDomain(scene).contacts.filter(link => link.kind === "structural");
  return {
    floor: Math.min(...[...scene.boxes].filter(([, node]) => node.visible).flatMap(([id]) => scene.corners(id).map(p => scene.root.worldToLocal(p).y))),
    gap: Math.max(...structural.map(link => link.distance / scale)),
    worst: structural.reduce((a, b) => a.distance > b.distance ? a : b),
    unit: [...scene.joints.values()].every(node => node.scale.toArray().every(v => v === 1)),
  };
}

/** Core reuses frame buffers, so evidence must be captured at observation time. */
export function publicFrame(frame: CatPoseFrame) {
  return {
    tick: frame.tick, pose: frame.pose, sleeping: frame.sleeping,
    transitionFrom: frame.transitionFrom, transitionTo: frame.transitionTo,
    transitionProgress: frame.transitionProgress, supportMask: frame.supportMask,
    bodyBreath: frame.bodyBreath, rootOffset: Array.from(frame.rootOffset),
    jumpPhase: frame.jumpPhase, bounce: frame.bounce, plateVisible: frame.plateVisible,
  };
}
