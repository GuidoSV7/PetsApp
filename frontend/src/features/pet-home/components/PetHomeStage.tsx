"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import {
  applyPetAction,
  applyPetCoat,
  fetchPetState,
  type PetStateResponse,
} from "@/features/pet-home/api/pet.service";
import { CameraCoatCapture } from "@/features/pet-home/components/CameraCoatCapture";
import { CoinBalance } from "@/features/pet-home/components/CoinBalance";
import { NeedMeter } from "@/features/pet-home/components/NeedMeter";
import {
  DEFAULT_GREY_COAT,
  type PetCoatColors,
} from "@/features/pet-home/extract-coat-colors";
import { STARTING_COINS } from "@/features/pet-home/pet-coins";
import {
  PET_INTERACT_HINT,
} from "@/features/pet-home/pet-interaction";
import {
  PET_LAYOUT_MODE,
  petLayoutCssVars,
} from "@/features/pet-home/pet-layout";
import { createPurrPlayer } from "@/features/pet-home/pet-purr";
import {
  INITIAL_PET_NEEDS,
  NEED_LABELS,
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

function isStatusKey(value: string): value is PetStatusKey {
  return value in PET_STATUS;
}

/** Mint care dashboard backed by the pet state API. */
export function PetHomeStage() {
  const [statusKey, setStatusKey] = useState<PetStatusKey>("idle");
  const [pulse, setPulse] = useState(0);
  const [reactPulse, setReactPulse] = useState(0);
  const [coat, setCoat] = useState<PetCoatColors>(DEFAULT_GREY_COAT);
  const [coins, setCoins] = useState(STARTING_COINS);
  const [needs, setNeeds] = useState<PetNeeds>(INITIAL_PET_NEEDS);
  const [mood, setMood] = useState("Feliz");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const purrRef = useRef(createPurrPlayer());

  useEffect(() => {
    const player = purrRef.current;
    return () => player.stop();
  }, []);

  const applyState = (state: PetStateResponse, bounce = false) => {
    setCoins(state.coins);
    setNeeds(state.needs);
    setCoat(state.coat);
    setMood(state.mood);
    if (isStatusKey(state.statusKey)) {
      setStatusKey(state.statusKey);
    }
    setPulse((n) => n + 1);
    if (bounce) setReactPulse((n) => n + 1);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const state = await fetchPetState();
        if (!cancelled) {
          applyState(state);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("No pudimos cargar a Michi. Reintentá en un momento.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runAction = async (
    action: "feed" | "play" | "sleep" | "bathe" | "pet",
    options?: { purr?: boolean; bounce?: boolean },
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      if (options?.purr) purrRef.current.play();
      const state = await applyPetAction(action);
      applyState(state, options?.bounce);
      setLoadError(null);
    } catch {
      setLoadError("No pudimos guardar la acción.");
    } finally {
      setBusy(false);
    }
  };

  const onCoat = async (colors: PetCoatColors) => {
    if (busy) return;
    setBusy(true);
    try {
      const state = await applyPetCoat(colors);
      applyState(state);
      setLoadError(null);
    } catch {
      setLoadError("No pudimos guardar los colores.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={styles.stage}
      aria-label={`Escenario de ${PET_NAME}`}
      data-layout={PET_LAYOUT_MODE}
      style={petLayoutCssVars() as CSSProperties}
    >
      <div className={styles.topBar}>
        <div className={styles.petIdentity}>
          <p className={styles.petName}>{PET_NAME}</p>
          <p className={styles.petLevel}>LV. 1</p>
        </div>
        <CoinBalance balance={coins} />
      </div>

      <div className={styles.petCard}>
        <div className={styles.petCardHeader}>
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
          {loadError ? (
            <p className={styles.loadError} role="alert">
              {loadError}
            </p>
          ) : null}
        </div>
        <div className={styles.petFrame}>
          <Cat3DViewer
            colors={coat}
            reactPulse={reactPulse}
            onPetInteract={() =>
              void runAction("pet", { purr: true, bounce: true })
            }
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
          disabled={busy}
          onClick={() => void runAction("feed")}
        >
          Alimentar
        </button>
        <button
          type="button"
          className={`${styles.careButton} ${styles.carePlay}`}
          disabled={busy}
          onClick={() => void runAction("play", { bounce: true })}
        >
          Jugar
        </button>
        <button
          type="button"
          className={`${styles.careButton} ${styles.careSleep}`}
          disabled={busy}
          onClick={() => void runAction("sleep")}
        >
          Dormir
        </button>
        <button
          type="button"
          className={`${styles.careButton} ${styles.careBathe}`}
          disabled={busy}
          onClick={() => void runAction("bathe")}
        >
          Bañar
        </button>
      </div>

      <button
        type="button"
        className={styles.colorsButton}
        disabled={busy}
        onClick={() => setCameraOpen(true)}
      >
        Colores de mi gato
      </button>

      <CameraCoatCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onColors={(colors) => void onCoat(colors)}
      />
    </section>
  );
}
