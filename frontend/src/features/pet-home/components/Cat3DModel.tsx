"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";

type Props = {
  colors: PetCoatColors;
  /** When true, skip idle yaw (user is orbiting). */
  orbiting?: boolean;
  /** Bump this to trigger a happy bounce. */
  reactPulse?: number;
  onPetInteract?: () => void;
};

/** Stylized procedural cat; materials follow the coat palette. */
export function Cat3DModel({
  colors,
  orbiting = false,
  reactPulse = 0,
  onPetInteract,
}: Props) {
  const group = useRef<Group>(null);
  const bounce = useRef(0);
  const materials = useMemo(
    () => ({
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      eye: "#1a1a1a",
      pupil: "#7dffa8",
    }),
    [colors.accent, colors.primary, colors.secondary],
  );

  useEffect(() => {
    if (reactPulse > 0) bounce.current = 1;
  }, [reactPulse]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    if (!orbiting) {
      group.current.rotation.y = Math.sin(t * 0.45) * 0.35;
    }
    const bob = Math.sin(t * 1.6) * 0.06;
    if (bounce.current > 0) {
      bounce.current = Math.max(0, bounce.current - delta * 2.4);
    }
    const hop = Math.sin(bounce.current * Math.PI) * 0.18;
    const squash = 1 + Math.sin(bounce.current * Math.PI) * 0.08;
    group.current.position.y = -0.15 + bob + hop;
    group.current.scale.setScalar(1.05 * squash);
  });

  return (
    <group
      ref={group}
      position={[0, -0.15, 0]}
      scale={1.05}
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
      {/* body */}
      <mesh castShadow position={[0, 0.15, 0]} scale={[1.05, 0.75, 0.7]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color={materials.primary} roughness={0.7} />
      </mesh>
      {/* belly */}
      <mesh position={[0, 0.05, 0.28]} scale={[0.7, 0.55, 0.35]}>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial color={materials.secondary} roughness={0.75} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.72, 0.18]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshStandardMaterial color={materials.primary} roughness={0.65} />
      </mesh>
      {/* muzzle */}
      <mesh position={[0, 0.58, 0.48]} scale={[0.55, 0.4, 0.35]}>
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshStandardMaterial color={materials.secondary} roughness={0.7} />
      </mesh>
      {/* ears */}
      <mesh position={[-0.22, 1.02, 0.12]} rotation={[0.15, 0, -0.35]}>
        <coneGeometry args={[0.14, 0.28, 4]} />
        <meshStandardMaterial color={materials.primary} roughness={0.7} />
      </mesh>
      <mesh position={[-0.22, 0.98, 0.14]} rotation={[0.15, 0, -0.35]} scale={0.55}>
        <coneGeometry args={[0.14, 0.28, 4]} />
        <meshStandardMaterial color={materials.secondary} roughness={0.7} />
      </mesh>
      <mesh position={[0.22, 1.02, 0.12]} rotation={[0.15, 0, 0.35]}>
        <coneGeometry args={[0.14, 0.28, 4]} />
        <meshStandardMaterial color={materials.primary} roughness={0.7} />
      </mesh>
      <mesh position={[0.22, 0.98, 0.14]} rotation={[0.15, 0, 0.35]} scale={0.55}>
        <coneGeometry args={[0.14, 0.28, 4]} />
        <meshStandardMaterial color={materials.secondary} roughness={0.7} />
      </mesh>
      {/* eyes */}
      <mesh position={[-0.12, 0.78, 0.48]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={materials.eye} roughness={0.3} />
      </mesh>
      <mesh position={[0.12, 0.78, 0.48]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={materials.eye} roughness={0.3} />
      </mesh>
      <mesh position={[-0.11, 0.79, 0.54]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial
          color={materials.pupil}
          emissive={materials.pupil}
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh position={[0.13, 0.79, 0.54]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial
          color={materials.pupil}
          emissive={materials.pupil}
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.62, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.045, 0.06, 3]} />
        <meshStandardMaterial color={materials.accent} roughness={0.45} />
      </mesh>
      {/* tail */}
      <mesh
        castShadow
        position={[0.55, 0.35, -0.15]}
        rotation={[0.4, 0.6, 0.8]}
        scale={[0.18, 0.18, 0.9]}
      >
        <capsuleGeometry args={[0.35, 1.2, 4, 12]} />
        <meshStandardMaterial color={materials.primary} roughness={0.7} />
      </mesh>
      {/* paws */}
      {(
        [
          [-0.28, -0.28, 0.28],
          [0.28, -0.28, 0.28],
          [-0.32, -0.22, -0.2],
          [0.32, -0.22, -0.2],
        ] as const
      ).map((pos, index) => (
        <mesh key={index} position={[...pos]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={materials.primary} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}
