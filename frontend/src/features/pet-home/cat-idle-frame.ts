import type { Object3D } from "three";
import type { CatPart } from "@/features/pet-home/cat-anatomy";
import { resolveCatPartPose, type CatPartNode } from "@/features/pet-home/cat-part-tree";
import { CAT_IDLE_PART_IDS, sampleCatIdleMotion } from "@/features/pet-home/cat-idle-motion";
import type { NeedVisualCues } from "@/features/pet-home/need-visuals";

export type CatIdleFrame = {
  root: Object3D | null;
  meshes: ReadonlyMap<string, Object3D>;
  nodes: ReadonlyMap<string, CatPartNode>;
  resolved: ReadonlyMap<string, CatPart>;
  elapsedSeconds: number;
  deltaSeconds: number;
  cues: NeedVisualCues;
  seed: number;
  reducedMotion: boolean;
  orbiting: boolean;
  yawBias: number;
  modelScale: number;
  bounce: number;
};

/** Entire frame body; imperative writes are absolute, current-base-relative. */
export function applyCatIdleFrame(input: CatIdleFrame): number {
  const { root, cues, orbiting, yawBias, modelScale, deltaSeconds } = input;
  if (!root) return input.bounce;
  const motion = sampleCatIdleMotion(input.elapsedSeconds, cues, {
    seed: input.seed, reducedMotion: input.reducedMotion,
  });
  for (const id of CAT_IDLE_PART_IDS) {
    const mesh = input.meshes.get(id), node = input.nodes.get(id), resolved = input.resolved.get(id);
    if (!mesh || !node || !resolved) continue;
    const pose = resolveCatPartPose(node, resolved, motion[id]);
    mesh.position.set(...pose.position);
    mesh.rotation.set(...pose.rotation);
    mesh.scale.set(...pose.scale);
  }
  const t = input.elapsedSeconds * cues.idleSpeed;
  const yaw = input.reducedMotion || orbiting ? yawBias
    : yawBias + Math.sin(t * 0.45) * 0.22 * cues.idleAmp;
  root.rotation.set(0, yaw, 0);
  const bob = input.reducedMotion ? 0 : Math.sin(t * 1.6) * 0.03 * cues.idleAmp;
  const bounce = Math.max(0, input.bounce - deltaSeconds * 2.4);
  const hop = Math.sin(bounce * Math.PI) * 0.1;
  const squash = 1 + Math.sin(bounce * Math.PI) * 0.05;
  root.position.set(0, -0.22 + bob + hop, 0);
  root.scale.setScalar(modelScale * squash);
  return bounce;
}
