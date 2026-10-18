"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import {
  CAT_ANATOMY,
  type CatMaterialRole,
  type CatPart,
} from "@/features/pet-home/cat-anatomy";
import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";
import { CAT_MODEL_SCALE } from "@/features/pet-home/pet-layout";

type Props = {
  colors: PetCoatColors;
  /** When true, skip idle yaw (user is orbiting). */
  orbiting?: boolean;
  /** Extra yaw from UI chevrons. */
  yawBias?: number;
  /** Bump this to trigger a happy bounce. */
  reactPulse?: number;
  onPetInteract?: () => void;
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
  if (part.kind === "sphere") {
    const [radius, w = 24, h = 20] = part.args;
    return <sphereGeometry args={[radius, w, h]} />;
  }
  if (part.kind === "cone") {
    const [radius, height, radial = 5] = part.args;
    return <coneGeometry args={[radius, height, radial]} />;
  }
  if (part.kind === "capsule") {
    const [radius, length, cap = 4, radial = 10] = part.args;
    return <capsuleGeometry args={[radius, length, cap, radial]} />;
  }
  if (part.kind === "box") {
    const [w, h, d] = part.args;
    return <boxGeometry args={[w, h, d]} />;
  }
  const [rTop, rBottom, height, radial = 6] = part.args;
  return <cylinderGeometry args={[rTop, rBottom, height, radial]} />;
}

/** Feline procedural cat; materials follow the coat palette. */
export function Cat3DModel({
  colors,
  orbiting = false,
  yawBias = 0,
  reactPulse = 0,
  onPetInteract,
}: Props) {
  const group = useRef<Group>(null);
  const bounce = useRef(0);
  const palette = useMemo(() => paletteFromCoat(colors), [
    colors.accent,
    colors.primary,
    colors.secondary,
  ]);

  useEffect(() => {
    if (reactPulse > 0) bounce.current = 1;
  }, [reactPulse]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    if (!orbiting) {
      group.current.rotation.y = yawBias + Math.sin(t * 0.45) * 0.22;
    } else {
      group.current.rotation.y = yawBias;
    }
    const bob = Math.sin(t * 1.6) * 0.03;
    if (bounce.current > 0) {
      bounce.current = Math.max(0, bounce.current - delta * 2.4);
    }
    const hop = Math.sin(bounce.current * Math.PI) * 0.1;
    const squash = 1 + Math.sin(bounce.current * Math.PI) * 0.05;
    group.current.position.y = -0.22 + bob + hop;
    group.current.scale.setScalar(CAT_MODEL_SCALE * squash);
  });

  return (
    <group
      ref={group}
      position={[0, -0.22, 0]}
      scale={CAT_MODEL_SCALE}
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
      {CAT_ANATOMY.map((part) => {
        const mat = palette[part.role];
        const castShadow =
          part.role === "primary" &&
          (part.id === "body" ||
            part.id === "head" ||
            part.id.startsWith("tail"));
        return (
          <mesh
            key={part.id}
            castShadow={castShadow}
            position={[...part.position]}
            rotation={part.rotation ? [...part.rotation] : undefined}
            scale={part.scale ? [...part.scale] : undefined}
          >
            <PartGeometry part={part} />
            <meshStandardMaterial
              color={mat.color}
              roughness={mat.roughness}
              metalness={mat.metalness}
              emissive={mat.emissive}
              emissiveIntensity={mat.emissiveIntensity ?? 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
