import type { CatPart } from "@/features/pet-home/cat-anatomy";
import type { CatDesignTunables } from "@/features/admin/cat-design-settings";

/** Apply admin tunables onto the declarative anatomy table. */
export function resolveCatAnatomy(
  base: readonly CatPart[],
  tunables: CatDesignTunables,
): CatPart[] {
  return base.map((part) => {
    if (part.id === "body") {
      const scale = part.scale ?? ([1, 1, 1] as const);
      return {
        ...part,
        scale: [scale[0], scale[1], scale[2] * tunables.bodyDepth] as const,
      };
    }
    if (part.id === "head") {
      return {
        ...part,
        position: [
          part.position[0],
          part.position[1] + tunables.headHeight,
          part.position[2],
        ] as const,
      };
    }
    if (part.id === "earL" || part.id === "earR") {
      const scale = part.scale ?? ([1, 1, 1] as const);
      return {
        ...part,
        scale: [
          scale[0] * tunables.earSize,
          scale[1] * tunables.earSize,
          scale[2] * tunables.earSize,
        ] as const,
      };
    }
    return part;
  });
}

export function resolveModelScale(tunables: CatDesignTunables): number {
  return tunables.modelScale;
}
