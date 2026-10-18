"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { Mesh, Object3D } from "three";

type Props = {
  url: string;
  scale?: number;
  onPetInteract?: () => void;
};

/** Custom GLB/GLTF mesh for admin-confirmed (or draft preview) models. */
export function GlbPetModel({ url, scale = 1, onPetInteract }: Props) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node: Object3D) => {
      const mesh = node as Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    return cloned;
  }, [scene]);

  return (
    <primitive
      object={root}
      scale={scale}
      position={[0, -0.35, 0]}
      onClick={(event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        onPetInteract?.();
      }}
    />
  );
}
