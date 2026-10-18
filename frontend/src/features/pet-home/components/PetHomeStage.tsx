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
import { NeedMeter } from "@/features/pet-home/components/NeedMeter";
import { PersonalizeStrip } from "@/features/pet-home/components/PersonalizeStrip";
import {
  DEFAULT_GREY_COAT,
  type PetCoatColors,
} from "@/features/pet-home/extract-coat-colors";
import { moodCaption } from "@/features/pet-home/pet-customize";
import { PET_INTERACT_HINT } from "@/features/pet-home/pet-interaction";
import {
  PET_LAYOUT_MODE,
  petLayoutCssVars,
} from "@/features/pet-home/pet-layout";
import { createPurrPlayer } from "@/features/pet-home/pet-purr";
import {
  EMPTY_PET_NEEDS,
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

type Props = {
  onCoinsChange?: (coins: number) => void;
};

/** Reference-style care dashboard backed by the Nest pet API. */
export function PetHomeStage({ onCoinsChange }: Props) {
  const [statusKey, setStatusKey] = useState<PetStatusKey>("idle");
  const [pulse, setPulse] = useState(0);
  const [reactPulse, setReactPulse] = useState(0);
  const [yawBias, setYawBias] = useState(0);
  const [coat, setCoat] = useState<PetCoatColors>(DEFAULT_GREY_COAT);
  const [needs, setNeeds] = useState<PetNeeds>(EMPTY_PET_NEEDS);
  const [mood, setMood] = useState("Feliz");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const purrRef = useRef(createPurrPlayer());
  const onCoinsChangeRef = useRef(onCoinsChange);
  onCoinsChangeRef.current = onCoinsChange;
  const locked = busy || !ready;

  useEffect(() => {
    const player = purrRef.current;
    return () => player.stop();
  }, []);

  const applyState = (state: PetStateResponse, bounce = false) => {
    onCoinsChangeRef.current?.(state.coins);
    setNeeds(state.needs);
    setCoat(state.coat);
    setMood(state.mood);
    if (isStatusKey(state.statusKey)) {
      setStatusKey(state.statusKey);
    }
    setReady(true);
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
          setReady(false);
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
    if (locked) return;
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
    if (locked) return;
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
      data-ready={ready ? "true" : "false"}
      style={petLayoutCssVars() as CSSProperties}
    >
      <div className={styles.stageCard}>
        <div className={styles.stageMeta}>
          <div className={styles.stageIdentity}>
            <p className={styles.petName}>{PET_NAME}</p>
            <span className={styles.levelPill}>Nv. 1</span>
          </div>
          <p className={styles.moodLine}>
            <span className={styles.moodDot} aria-hidden="true" />
            <span className={styles.moodValue}>{moodCaption(mood)}</span>
          </p>
          {loadError ? (
            <p className={styles.loadError} role="alert">
              {loadError}
            </p>
          ) : null}
        </div>

        <div className={styles.petViewport}>
          <p
            key={pulse}
            className={styles.speechBubble}
            role="status"
            aria-live="polite"
          >
            {PET_STATUS[statusKey]}
          </p>

          <button
            type="button"
            className={`${styles.orbitBtn} ${styles.orbitLeft}`}
            aria-label="Girar a la izquierda"
            onClick={() => setYawBias((y) => y - 0.45)}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.orbitBtn} ${styles.orbitRight}`}
            aria-label="Girar a la derecha"
            onClick={() => setYawBias((y) => y + 0.45)}
          >
            ›
          </button>

          <div className={styles.petFrame}>
            <Cat3DViewer
              colors={coat}
              yawBias={yawBias}
              reactPulse={reactPulse}
              onPetInteract={() =>
                void runAction("pet", { purr: true, bounce: true })
              }
            />
          </div>

          <p className={styles.interactHint}>{PET_INTERACT_HINT}</p>
        </div>
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
          disabled={locked}
          onClick={() => void runAction("feed")}
        >
          <CareIcon kind="feed" />
          Alimentar
        </button>
        <button
          type="button"
          className={`${styles.careButton} ${styles.carePlay}`}
          disabled={locked}
          onClick={() => void runAction("play", { bounce: true })}
        >
          <CareIcon kind="play" />
          Jugar
        </button>
        <button
          type="button"
          className={`${styles.careButton} ${styles.careSleep}`}
          disabled={locked}
          onClick={() => void runAction("sleep")}
        >
          <CareIcon kind="sleep" />
          Dormir
        </button>
        <button
          type="button"
          className={`${styles.careButton} ${styles.careBathe}`}
          disabled={locked}
          onClick={() => void runAction("bathe")}
        >
          <CareIcon kind="bathe" />
          Bañar
        </button>
      </div>

      <PersonalizeStrip
        activeCoat={coat}
        disabled={locked}
        onSelectCoat={(next) => void onCoat(next)}
        onOpenCamera={() => setCameraOpen(true)}
      />

      <CameraCoatCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onColors={(colors) => void onCoat(colors)}
      />
    </section>
  );
}

function CareIcon({ kind }: { kind: "feed" | "play" | "sleep" | "bathe" }) {
  if (kind === "feed") {
    return (
      <svg viewBox="0 0 24 24" className={styles.careSvg} aria-hidden="true">
        <path
          fill="currentColor"
          d="M6 10c0-2 1.5-4 3-4s3 2 3 4v1H6v-1zm9-3h2v5h-2V7zm-8 7h12l-1 6H8l-1-6z"
        />
      </svg>
    );
  }
  if (kind === "play") {
    return (
      <svg viewBox="0 0 24 24" className={styles.careSvg} aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.95" />
        <circle cx="12" cy="12" r="2.2" fill="#fff" />
      </svg>
    );
  }
  if (kind === "sleep") {
    return (
      <svg viewBox="0 0 24 24" className={styles.careSvg} aria-hidden="true">
        <path
          fill="currentColor"
          d="M14 4a7 7 0 1 0 6 10.5A8 8 0 0 1 14 4z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={styles.careSvg} aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 10h10a3 3 0 0 1 3 3v1H4v-1a3 3 0 0 1 3-3zm1 6h8v2H8v-2z"
      />
    </svg>
  );
}
