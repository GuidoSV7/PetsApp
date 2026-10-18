"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { CatDesignTunables } from "@/features/admin/cat-design-settings";
import { Cat3DModel } from "@/features/pet-home/components/Cat3DModel";
import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";
import { PET_NAME } from "@/features/pet-home/pet-status";
import styles from "./pet-home.module.css";

type Props = {
  colors: PetCoatColors;
  yawBias?: number;
  /** Bump from parent to replay the happy bounce. */
  reactPulse?: number;
  onPetInteract?: () => void;
  /** Admin / preview override; home loads persisted tunables when omitted. */
  design?: CatDesignTunables;
};

/** WebGL stage for the procedural feline Michi (client-only). */
export function Cat3DViewer({
  colors,
  yawBias = 0,
  reactPulse = 0,
  onPetInteract,
  design,
}: Props) {
  const [orbiting, setOrbiting] = useState(false);

  return (
    <div
      className={styles.canvasHost}
      role="img"
      aria-label={`${PET_NAME}. Arrastrá para girar, tocá para ronronear.`}
    >
      <Canvas
        camera={{ position: [0, 0.42, 3.05], fov: 28 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.72} />
        <directionalLight
          position={[2.8, 4.2, 2.2]}
          intensity={1.25}
          color="#fff6e8"
        />
        <directionalLight
          position={[-2.4, 1.8, -1.6]}
          intensity={0.4}
          color="#d7e8ff"
        />
        <directionalLight position={[0, 1.2, 3]} intensity={0.35} />
        <Cat3DModel
          colors={colors}
          orbiting={orbiting}
          yawBias={yawBias}
          reactPulse={reactPulse}
          onPetInteract={onPetInteract}
          design={design}
        />
        <ContactShadows
          position={[0, -0.62, 0]}
          opacity={0.28}
          scale={3.4}
          blur={2.6}
          far={2.2}
          color="#1c2b22"
        />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          target={[0, 0.18, 0.05]}
          minPolarAngle={Math.PI / 3.5}
          maxPolarAngle={Math.PI / 1.85}
          rotateSpeed={0.85}
          dampingFactor={0.08}
          enableDamping
          onStart={() => setOrbiting(true)}
          onEnd={() => setOrbiting(false)}
        />
      </Canvas>
    </div>
  );
}
