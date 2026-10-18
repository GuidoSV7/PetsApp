"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { CameraCoatCapture } from "@/features/pet-home/components/CameraCoatCapture";
import { CoinBalance } from "@/features/pet-home/components/CoinBalance";
import { NeedMeter } from "@/features/pet-home/components/NeedMeter";
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
  INITIAL_PET_NEEDS,
  NEED_LABELS,
  applyCareAction,
  moodFromNeeds,
  type PetNeeds,
} from "@/features/pet-home/pet-stats";
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

/** Mint care dashboard: 3D Michi, needs, colorful actions. */
export function PetHomeStage() {
  const [statusKey, setStatusKey] = useState<PetStatusKey>("idle");
  const [pulse, setPulse] = useState(0);
  const [reactPulse, setReactPulse] = useState(0);
  const [coat, setCoat] = useState<PetCoatColors>(DEFAULT_GREY_COAT);
  const [coins, setCoins] = useState(STARTING_COINS);
  const [needs, setNeeds] = useState<PetNeeds>(INITIAL_PET_NEEDS);
  const [cameraOpen, setCameraOpen] = useState(false);
  const purrRef = useRef(createPurrPlayer());

  useEffect(() => {
    const player = purrRef.current;
    return () => player.stop();
  }, []);

  const mood = moodFromNeeds(needs);

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
    setNeeds((n) => applyCareAction(n, "feed"));
    setStatus("fed");
  };

  const play = () => {
    setNeeds((n) => applyCareAction(n, "play"));
    setCoins((n) => earnCoins(n, COIN_REWARDS.pet));
    setReactPulse((n) => n + 1);
    setStatus(petInteractStatusKey());
  };

  const sleep = () => {
    setNeeds((n) => applyCareAction(n, "sleep"));
    setStatus("slept");
  };

  const bathe = () => {
    setNeeds((n) => applyCareAction(n, "bathe"));
    setStatus("bathed");
  };

  const purrAndPet = () => {
    purrRef.current.play();
    setReactPulse((n) => n + 1);
    setNeeds((n) => applyCareAction(n, "pet"));
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
      <div className={styles.topBar}>
        <div className={styles.petIdentity}>
          <p className={styles.petName}>{PET_NAME}</p>
          <p className={styles.petLevel}>LV. 1</p>
        </div>
        <CoinBalance balance={coins} />
      </div>

      <div className={styles.moodCard}>
        <p
          key={pulse}
          className={styles.speech}
          role="status"
          aria-live="polite"
        >
          {PET_STATUS[statusKey]}
        </p>
        <p className={styles.moodLine}>
          Ánimo: <span className={styles.moodValue}>{mood}</span>
          <span className={styles.moodDot} aria-hidden="true" />
        </p>
      </div>

      <div className={styles.petCard}>
        <span className={styles.moodBadge}>{mood}</span>
        <div className={styles.petFrame}>
          <Cat3DViewer
            colors={coat}
            reactPulse={reactPulse}
            onPetInteract={purrAndPet}
          />
        </div>
        <p className={styles.interactHint}>{PET_INTERACT_HINT}</p>
      </div>

      <div className={styles.needsGrid}>
        <NeedMeter
          label={NEED_LABELS.hunger}
          value={needs.hunger}
          tone="hunger"
        />
        <NeedMeter label={NEED_LABELS.fun} value={needs.fun} tone="fun" />
        <NeedMeter
          label={NEED_LABELS.energy}
          value={needs.energy}
          tone="energy"
        />
        <NeedMeter
          label={NEED_LABELS.hygiene}
          value={needs.hygiene}
          tone="hygiene"
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.careButton} ${styles.careFeed}`}
          onClick={feed}
        >
          Alimentar
        </button>
        <button
          type="button"
          className={`${styles.careButton} ${styles.carePlay}`}
          onClick={play}
        >
          Jugar
        </button>
        <button
          type="button"
          className={`${styles.careButton} ${styles.careSleep}`}
          onClick={sleep}
        >
          Dormir
        </button>
        <button
          type="button"
          className={`${styles.careButton} ${styles.careBathe}`}
          onClick={bathe}
        >
          Bañar
        </button>
      </div>

      <button
        type="button"
        className={styles.colorsButton}
        onClick={() => setCameraOpen(true)}
      >
        Colores de mi gato
      </button>

      <CameraCoatCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onColors={applyCoat}
      />
    </section>
  );
}
