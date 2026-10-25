import { Euler, Vector3 } from "three";
import type { CatPart } from "@/features/pet-home/cat-anatomy";
import type { CatIdleDelta } from "@/features/pet-home/cat-idle-motion";

type Vec3 = readonly [number, number, number];

export type CatPartNode = {
  part: CatPart;
  localPosition: Vec3;
  children: CatPartNode[];
};

/** Build the trusted, statically tested anatomy graph without mutating its table. */
export function buildCatPartTree(base: readonly CatPart[]): CatPartNode[] {
  const byId = new Map(base.map((part) => [part.id, part]));
  const nodes = new Map(base.map((part) => {
    const parent = part.parent ? byId.get(part.parent) : undefined;
    const localPosition: Vec3 = [
      part.position[0] - (parent?.position[0] ?? 0),
      part.position[1] - (parent?.position[1] ?? 0),
      part.position[2] - (parent?.position[2] ?? 0),
    ];
    return [part.id, { part, localPosition, children: [] } as CatPartNode] as const;
  }));
  const roots: CatPartNode[] = [];
  for (const part of base) {
    const node = nodes.get(part.id)!;
    if (part.parent) nodes.get(part.parent)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Compose from unpivoted CURRENT base, never from the previous mesh pose. */
export function resolveCatPartPose(node: CatPartNode, resolved = node.part, delta: CatIdleDelta = {}) {
  const base = resolveCatPartTransform(node, resolved);
  const rotation: Vec3 = [
    base.rotation[0] + (delta.rotation?.[0] ?? 0),
    base.rotation[1] + (delta.rotation?.[1] ?? 0),
    base.rotation[2] + (delta.rotation?.[2] ?? 0),
  ];
  const scale: Vec3 = [base.scale[0], base.scale[1] * (delta.scaleY ?? 1), base.scale[2]];
  const hinge = ["earL", "earR", "tailMid", "tailTip"].includes(node.part.id);
  const pivot = new Vector3(0, hinge ? -node.part.args[1] / 2 * scale[1] : 0, 0);
  const correction = pivot.clone().sub(pivot.applyEuler(new Euler(...rotation)));
  const position: Vec3 = [
    base.position[0] + (delta.position?.[0] ?? 0) + correction.x,
    base.position[1] + (delta.position?.[1] ?? 0) + correction.y,
    base.position[2] + (delta.position?.[2] ?? 0) + correction.z,
  ];
  return { position, rotation, scale };
}

/** Add only this part's own delta; parent runtime motion is inherited by Three. */
export function resolveCatPartTransform(node: CatPartNode, resolved = node.part) {
  const position: Vec3 = [
    node.localPosition[0] + (resolved.position[0] - node.part.position[0]),
    node.localPosition[1] + (resolved.position[1] - node.part.position[1]),
    node.localPosition[2] + (resolved.position[2] - node.part.position[2]),
  ];
  return {
    position,
    rotation: resolved.rotation ?? ([0, 0, 0] as const),
    scale: resolved.scale ?? ([1, 1, 1] as const),
  };
}
