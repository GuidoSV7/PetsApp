"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
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
};

/** WebGL stage for the procedural 3D cat (client-only). */
export function Cat3DViewer({
  colors,
  yawBias = 0,
  reactPulse = 0,
  onPetInteract,
}: Props) {
  const [orbiting, setOrbiting] = useState(false);

  return (
    <div
      className={styles.canvasHost}
      role="img"
      aria-label={`${PET_NAME}. Arrastrá para girar, tocá para ronronear.`}
    >
      <Canvas
        camera={{ position: [0, 0.28, 3.15], fov: 30 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} />
        <directionalLight position={[-2, 1.5, -2]} intensity={0.45} />
        <Cat3DModel
          colors={colors}
          orbiting={orbiting}
          yawBias={yawBias}
          reactPulse={reactPulse}
          onPetInteract={onPetInteract}
        />
        <ContactShadows
          position={[0, -0.62, 0]}
          opacity={0.2}
          scale={3.2}
          blur={2.4}
          far={2}
          color="#1c2b22"
        />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          target={[0, 0.05, 0]}
          minPolarAngle={Math.PI / 3.4}
          maxPolarAngle={Math.PI / 1.9}
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
