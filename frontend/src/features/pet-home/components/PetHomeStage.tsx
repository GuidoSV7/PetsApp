"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { CameraCoatCapture } from "@/features/pet-home/components/CameraCoatCapture";
import { CoinBalance } from "@/features/pet-home/components/CoinBalance";
import {
  DEFAULT_GREY_COAT,
  type PetCoatColors,
} from "@/features/pet-home/extract-coat-colors";
import {
  COIN_COSTS,
  COIN_REWARDS,
  STARTING_COINS,
  earnCoins,
  spendCoins,
} from "@/features/pet-home/pet-coins";
import {
  PET_INTERACT_HINT,
  petInteractStatusKey,
} from "@/features/pet-home/pet-interaction";
import { createPurrPlayer } from "@/features/pet-home/pet-purr";
import {
  PET_NAME,
  PET_STATUS,
  type PetStatusKey,
} from "@/features/pet-home/pet-status";
import styles from "./pet-home.module.css";

const Cat3DViewer = dynamic(
  () =>
    import("@/features/pet-home/components/Cat3DViewer").then(
      (mod) => mod.Cat3DViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className={styles.canvasHost} role="status">
        Cargando a {PET_NAME}…
      </div>
    ),
  },
);

/** Centered 3D pet stage with coins, orbit, purr, and camera coat sampling. */
export function PetHomeStage() {
  const [statusKey, setStatusKey] = useState<PetStatusKey>("idle");
  const [pulse, setPulse] = useState(0);
  const [reactPulse, setReactPulse] = useState(0);
  const [coat, setCoat] = useState<PetCoatColors>(DEFAULT_GREY_COAT);
  const [coins, setCoins] = useState(STARTING_COINS);
  const [cameraOpen, setCameraOpen] = useState(false);
  const purrRef = useRef(createPurrPlayer());

  useEffect(() => {
    const player = purrRef.current;
    return () => player.stop();
  }, []);

  const setStatus = (key: PetStatusKey) => {
    setStatusKey(key);
    setPulse((n) => n + 1);
  };

  const feed = () => {
    const result = spendCoins(coins, COIN_COSTS.feed);
    if (!result.ok) {
      setStatus("broke");
      return;
    }
    setCoins(result.balance);
    setStatus("fed");
  };

  const purrAndPet = () => {
    purrRef.current.play();
    setReactPulse((n) => n + 1);
    setCoins((n) => earnCoins(n, COIN_REWARDS.pet));
    setStatus(petInteractStatusKey());
  };

  const applyCoat = (colors: PetCoatColors) => {
    setCoat(colors);
    setCoins((n) => earnCoins(n, COIN_REWARDS.coat));
    setStatus("coated");
  };

  return (
    <section className={styles.stage} aria-label={`Escenario de ${PET_NAME}`}>
      <p className={styles.brand}>PetsApp</p>
      <p className={styles.tagline}>Cuidá a {PET_NAME}, tu mascota virtual 3D</p>
      <CoinBalance balance={coins} />

      <div className={styles.petFrame}>
        <div className={styles.glow} aria-hidden="true" />
        <Cat3DViewer
          colors={coat}
          reactPulse={reactPulse}
          onPetInteract={purrAndPet}
        />
      </div>

      <p className={styles.interactHint}>{PET_INTERACT_HINT}</p>

      <p key={pulse} className={styles.status} role="status" aria-live="polite">
        {PET_STATUS[statusKey]}
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={feed}
        >
          Alimentar
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={purrAndPet}
        >
          Acariciar
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setCameraOpen(true)}
        >
          Colores de mi gato
        </button>
      </div>

      <CameraCoatCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onColors={applyCoat}
      />
    </section>
  );
}
