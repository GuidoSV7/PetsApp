import type { CatPart } from "@/features/pet-home/cat-anatomy";

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
