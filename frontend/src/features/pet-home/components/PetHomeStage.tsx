"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import {
  applyPetAction,
  applyPetCoat,
  fetchPetState,
  renamePet,
  type PetStateResponse,
} from "@/features/pet-home/api/pet.service";
import { CameraCoatCapture } from "@/features/pet-home/components/CameraCoatCapture";
import { NeedMeter } from "@/features/pet-home/components/NeedMeter";
import { PersonalizeStrip } from "@/features/pet-home/components/PersonalizeStrip";
import { PetNameEditor } from "@/features/pet-home/components/PetNameEditor";
import {
  DEFAULT_GREY_COAT,
  type PetCoatColors,
} from "@/features/pet-home/extract-coat-colors";
import { moodCaption } from "@/features/pet-home/pet-customize";
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
  DEFAULT_PET_NAME,
  petStatusText,
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
        Cargando a {DEFAULT_PET_NAME}…
      </div>
    ),
  },
);

const STATUS_KEYS: readonly PetStatusKey[] = [
  "idle",
  "fed",
  "petted",
  "coated",
  "broke",
  "slept",
  "bathed",
  "renamed",
];

function isStatusKey(value: string): value is PetStatusKey {
  return (STATUS_KEYS as readonly string[]).includes(value);
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
  const [petName, setPetName] = useState(DEFAULT_PET_NAME);
  const [renameCount, setRenameCount] = useState(0);
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
    setPetName(state.name || DEFAULT_PET_NAME);
    setRenameCount(state.renameCount ?? 0);
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
          setLoadError("No pudimos cargar a tu michi. Reintentá en un momento.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onRename = async (nextName: string) => {
    if (locked) return;
    setBusy(true);
    try {
      const state = await renamePet(nextName);
      applyState(state);
      setLoadError(null);
    } catch {
      setLoadError("No pudimos guardar el nombre.");
    } finally {
      setBusy(false);
    }
  };

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
      aria-label={`Escenario de ${petName}`}
      data-layout={PET_LAYOUT_MODE}
      data-ready={ready ? "true" : "false"}
      style={petLayoutCssVars() as CSSProperties}
    >
      <div className={styles.stageCard}>
        <div className={styles.stageMeta}>
          <div className={styles.stageIdentity}>
            <PetNameEditor
              name={petName}
              renameCount={renameCount}
              disabled={locked}
              onSave={(next) => void onRename(next)}
            />
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
            {petStatusText(statusKey, petName)}
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
        petName={petName}
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
        {/* Bowl */}
        <path
          fill="currentColor"
          d="M4.5 11.5h15a1 1 0 0 1 .95 1.3l-1.4 4.4A3 3 0 0 1 16.2 19.5H7.8a3 3 0 0 1-2.85-2.3l-1.4-4.4A1 1 0 0 1 4.5 11.5z"
        />
        {/* Food mound */}
        <path
          fill="currentColor"
          opacity="0.85"
          d="M8.2 11.2c.6-1.7 1.8-2.7 3.8-2.7s3.2 1 3.8 2.7H8.2z"
        />
        {/* Steam */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          d="M10 5.2c.2.8-.3 1.3-.3 2M12.2 4.5c.2.9-.3 1.4-.3 2.2M14.3 5.2c.2.8-.3 1.3-.3 2"
          opacity="0.9"
        />
      </svg>
    );
  }
  if (kind === "play") {
    return (
      <svg viewBox="0 0 24 24" className={styles.careSvg} aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" fill="currentColor" />
        <path
          fill="#fff"
          opacity="0.95"
          d="M12 3.8a8.2 8.2 0 0 1 5.9 2.5c-1.3 1-3.4 1.7-5.9 1.7S7.4 7.3 6.1 6.3A8.2 8.2 0 0 1 12 3.8zm0 16.4a8.2 8.2 0 0 1-5.9-2.5c1.3-1 3.4-1.7 5.9-1.7s4.6.7 5.9 1.7a8.2 8.2 0 0 1-5.9 2.5z"
        />
        <circle cx="12" cy="12" r="2.1" fill="#fff" />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
          d="M4.5 10.2c2.2.9 4.7 1.4 7.5 1.4s5.3-.5 7.5-1.4M4.5 13.8c2.2-.9 4.7-1.4 7.5-1.4s5.3.5 7.5 1.4"
          opacity="0.9"
        />
      </svg>
    );
  }
  if (kind === "sleep") {
    return (
      <svg viewBox="0 0 24 24" className={styles.careSvg} aria-hidden="true">
        <path
          fill="currentColor"
          d="M13.2 4.2a7.4 7.4 0 1 0 6.4 10.8 6.2 6.2 0 0 1-6.4-10.8z"
        />
        <path
          fill="currentColor"
          d="M15.6 5.2h2.6l-2.5 2.6h2.6v1.1h-4.1V7.6l2.5-2.4h-2.4V4zM18.4 9.6h2l-1.9 2h2v.9h-3.2v-1.1l1.9-1.8h-1.8v-.9z"
          opacity="0.95"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={styles.careSvg} aria-hidden="true">
      {/* Tub */}
      <path
        fill="currentColor"
        d="M5 11.5h14a1 1 0 0 1 1 1V14a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-1.5a1 1 0 0 1 1-1z"
      />
      {/* Bubbles */}
      <circle cx="8.2" cy="8.2" r="1.35" fill="currentColor" opacity="0.95" />
      <circle cx="11.2" cy="6.4" r="1.7" fill="currentColor" />
      <circle cx="14.8" cy="8" r="1.15" fill="currentColor" opacity="0.9" />
      {/* Tap */}
      <path
        fill="currentColor"
        d="M16.5 5.2h1.4v3.2c0 .7-.6 1.3-1.3 1.3h-.8V8.4h.7c.2 0 .4-.2.4-.4V5.2z"
      />
    </svg>
  );
}
