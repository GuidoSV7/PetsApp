"use client";

import { useState } from "react";
import { CatIllustration } from "@/features/pet-home/components/CatIllustration";
import {
  PET_NAME,
  PET_STATUS,
  type PetStatusKey,
} from "@/features/pet-home/pet-status";
import styles from "./pet-home.module.css";

/** Centered virtual pet stage with local feed / pet actions (UI only). */
export function PetHomeStage() {
  const [statusKey, setStatusKey] = useState<PetStatusKey>("idle");
  const [pulse, setPulse] = useState(0);

  const setStatus = (key: PetStatusKey) => {
    setStatusKey(key);
    setPulse((n) => n + 1);
  };

  return (
    <section className={styles.stage} aria-label={`Escenario de ${PET_NAME}`}>
      <p className={styles.brand}>PetsApp</p>
      <p className={styles.tagline}>Cuidá a {PET_NAME}, tu mascota virtual</p>

      <div className={styles.petFrame}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.catBob}>
          <CatIllustration />
        </div>
      </div>

      <p key={pulse} className={styles.status} role="status" aria-live="polite">
        {PET_STATUS[statusKey]}
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setStatus("fed")}
        >
          Alimentar
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setStatus("petted")}
        >
          Acariciar
        </button>
      </div>
    </section>
  );
}
