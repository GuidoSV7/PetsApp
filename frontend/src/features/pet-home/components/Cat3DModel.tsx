"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import {
  defaultCatDesign,
  loadCatDesign,
  type CatDesignTunables,
} from "@/features/admin/cat-design-settings";
import {
  resolveCatAnatomy,
  resolveModelScale,
} from "@/features/admin/resolve-cat-design";
import {
  CAT_ANATOMY,
  type CatMaterialRole,
  type CatPart,
} from "@/features/pet-home/cat-anatomy";
import { buildCatPartTree, resolveCatPartPose, type CatPartNode } from "@/features/pet-home/cat-part-tree";
import { applyCatIdleFrame } from "@/features/pet-home/cat-idle-frame";
import { CAT_IDLE_PART_IDS } from "@/features/pet-home/cat-idle-motion";
import { useReducedMotion } from "@/features/pet-home/use-reduced-motion";
import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";
import {
  deriveTabbyStripeColor,
  getCoatPatternBoxes,
  normalizeCoatPattern,
  type CoatPatternBox,
  type PetCoatInput,
} from "@/features/pet-home/coat-patterns";
import {
  applyNeedDirtToCoat,
  applyNeedVisualsToAnatomy,
  needVisualCues,
} from "@/features/pet-home/need-visuals";
import {
  PREVIEW_PET_NEEDS,
  type PetNeeds,
} from "@/features/pet-home/pet-stats";

type Props = {
  colors: PetCoatInput;
  /** When true, skip idle yaw (user is orbiting). */
  orbiting?: boolean;
  /** Extra yaw from UI chevrons. */
  yawBias?: number;
  /** Bump this to trigger a happy bounce. */
  reactPulse?: number;
  onPetInteract?: () => void;
  /** When set (admin preview), overrides persisted home design. */
  design?: CatDesignTunables;
  /** Care needs drive slim / droop / sleepy / dirty cues. */
  needs?: PetNeeds;
};

type RolePalette = Record<
  CatMaterialRole,
  { color: string; roughness: number; metalness: number; emissive?: string; emissiveIntensity?: number }
>;

function paletteFromCoat(colors: PetCoatColors): RolePalette {
  return {
    primary: { color: colors.primary, roughness: 0.88, metalness: 0.02 },
    secondary: { color: colors.secondary, roughness: 0.9, metalness: 0.01 },
    accent: { color: colors.accent, roughness: 0.55, metalness: 0.05 },
    eye: { color: "#1c1c1c", roughness: 0.25, metalness: 0.15 },
    pupil: {
      color: "#8dffb2",
      roughness: 0.2,
      metalness: 0.05,
      emissive: "#5fd98f",
      emissiveIntensity: 0.28,
    },
    whisker: { color: "#f3efe8", roughness: 0.45, metalness: 0.05 },
  };
}

function PartGeometry({ part }: { part: CatPart }) {
  return <boxGeometry args={[...part.args]} />;
}

/** Feline procedural cat; materials follow the coat palette. */
export function Cat3DModel({
  colors,
  orbiting = false,
  yawBias = 0,
  reactPulse = 0,
  onPetInteract,
  design,
  needs = PREVIEW_PET_NEEDS,
}: Props) {
  const group = useRef<Group>(null);
  const bounce = useRef(0);
  const meshes = useRef(new Map<string, Mesh>());
  const seed = useRef<number | null>(null);
  const origin = useRef<number | null>(null);
  if (seed.current === null) {
    seed.current = typeof window === "undefined" ? 0 : crypto.getRandomValues(new Uint32Array(1))[0];
  }
  const reducedMotion = useReducedMotion();
  const [storedDesign, setStoredDesign] = useState<CatDesignTunables>(() =>
    typeof window === "undefined" ? defaultCatDesign() : loadCatDesign(),
  );
  const tunables = design ?? storedDesign;
  const modelScale = resolveModelScale(tunables);
  const cues = useMemo(
    () => needVisualCues(needs),
    [needs.energy, needs.fun, needs.hunger, needs.hygiene],
  );
  const anatomy = useMemo(
    () =>
      applyNeedVisualsToAnatomy(
        resolveCatAnatomy(CAT_ANATOMY, tunables),
        cues,
      ),
    [
      cues,
      tunables.bodyDepth,
      tunables.earSize,
      tunables.headHeight,
      tunables.modelScale,
    ],
  );
  const tree = useMemo(() => buildCatPartTree(CAT_ANATOMY), []);
  const nodesById = useMemo(() => {
    const nodes = new Map<string, CatPartNode>();
    const visit = (node: CatPartNode) => {
      nodes.set(node.part.id, node);
      node.children.forEach(visit);
    };
    tree.forEach(visit);
    return nodes;
  }, [tree]);
  const resolvedById = useMemo(() => new Map(anatomy.map((part) => [part.id, part])), [anatomy]);
  const coatForNeeds = useMemo(
    () => applyNeedDirtToCoat(colors, cues),
    [colors.accent, colors.primary, colors.secondary, cues],
  );
  const palette = useMemo(() => paletteFromCoat(coatForNeeds), [
    coatForNeeds.accent,
    coatForNeeds.primary,
    coatForNeeds.secondary,
  ]);

  const patchesByAnchor = useMemo(() => {
    const patches = new Map<string, CoatPatternBox[]>();
    for (const box of getCoatPatternBoxes(normalizeCoatPattern(colors.pattern))) {
      const anchored = patches.get(box.anchorId) ?? [];
      anchored.push(box);
      patches.set(box.anchorId, anchored);
    }
    return patches;
  }, [colors.pattern]);
  const patchPalette = useMemo(() => ({
    stripe: { ...palette.primary, color: deriveTabbyStripeColor(coatForNeeds.primary) },
    secondary: palette.secondary,
    accent: palette.accent,
  }), [palette, coatForNeeds.primary]);

  useEffect(() => {
    if (design) return;
    setStoredDesign(loadCatDesign());
    const onStorage = (event: StorageEvent) => {
      if (event.key === "petsapp.admin.cat-design") {
        setStoredDesign(loadCatDesign());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [design]);

  useEffect(() => {
    if (reactPulse > 0) bounce.current = 1;
  }, [reactPulse]);

  useFrame((state, delta) => {
    const now = state.clock.getElapsedTime();
    origin.current ??= now;
    bounce.current = applyCatIdleFrame({
      root: group.current, meshes: meshes.current, nodes: nodesById, resolved: resolvedById,
      elapsedSeconds: now - origin.current, deltaSeconds: delta,
      cues, seed: seed.current!, reducedMotion, orbiting, yawBias, modelScale, bounce: bounce.current,
    });
  });

  const renderPart = (node: CatPartNode): React.ReactNode => {
    const part = resolvedById.get(node.part.id)!;
    const transform = resolveCatPartPose(node, part);
    const mat = palette[part.role];
    const castShadow = part.role === "primary" &&
      (part.id === "body" || part.id === "head" || part.id.startsWith("tail"));
    return (
      <mesh key={part.id} name={part.id} castShadow={castShadow}
        ref={CAT_IDLE_PART_IDS.some((id) => id === part.id) ? (mesh) => {
          if (mesh) meshes.current.set(part.id, mesh);
          else meshes.current.delete(part.id);
        } : undefined}
        position={[...transform.position]} rotation={[...transform.rotation]} scale={[...transform.scale]}>
        <PartGeometry part={part} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness}
          emissive={mat.emissive} emissiveIntensity={mat.emissiveIntensity ?? 0} />
        {node.children.map(renderPart)}
        {patchesByAnchor.get(part.id)?.map((box) => {
          const ink = patchPalette[box.ink];
          return (
            <mesh key={box.id} name={box.id}
              position={[...box.position]} rotation={[...box.rotation]}>
              <boxGeometry args={[...box.args]} />
              <meshStandardMaterial color={ink.color} roughness={ink.roughness} metalness={ink.metalness} />
            </mesh>
          );
        })}
      </mesh>
    );
  };

  return (
    <group
      ref={group}
      position={[0, -0.22, 0]}
      scale={modelScale}
      onClick={(event) => {
        event.stopPropagation();
        onPetInteract?.();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {tree.map(renderPart)}
    </group>
  );
}
