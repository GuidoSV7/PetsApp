"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { exportCatPose } from "@/features/admin/cat-pose-export";
import { CAT_JOINT_IDS, CAT_POSES, CAT_POSE_IDS } from "@/features/pet-home/cat-pose-data";
import type { CatPoseDiagnostics, CatPosePreview } from "@/features/pet-home/cat-pose-preview";
import type { CatJointId, CatPoseDefinition, CatPoseId, PoseVec3 } from "@/features/pet-home/cat-pose-types";
import { COAT_PATTERNS, type CoatPattern, type PetCoatInput } from "@/features/pet-home/coat-patterns";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import { PREVIEW_PET_NEEDS, type PetNeeds } from "@/features/pet-home/pet-stats";
import { useReducedMotion } from "@/features/pet-home/use-reduced-motion";
import styles from "./admin-design-3d.module.css";

export type CatPoseEditorPreviewProps = {
  colors: PetCoatInput;
  needs: PetNeeds;
  posePreview?: CatPosePreview;
};

const poseLabels: Record<CatPoseId, string> = {
  seated: "Sentado", standing: "Cuatro patas", loaf: "Pancito", sphinx: "Esfinge",
  side: "De costado", curled: "Ovillo", bellyUp: "Panza arriba",
};
const patternLabels: Record<CoatPattern, string> = {
  solid: "Liso", tabby: "Atigrado", tuxedo: "Bicolor", calico: "Calicó", pointed: "Siamés",
};
const axes = ["X", "Y", "Z"] as const;
const metric = (value: number | null | undefined) => value == null ? "sin validar" : String(value);

function PoseOptions() {
  return CAT_POSE_IDS.map(id => <option key={id} value={id}>{poseLabels[id]}</option>);
}

/** Authoring limits are local deltas, not a substitute for renderer contact validation. */
function jointLimits(id: CatJointId, axis: number): readonly [number, number] {
  if (id === "joint-neck") return axis === 0 ? [-30, 30] : [-25, 25];
  if (id === "joint-head") return axis === 0 ? [-45, 35] : [-35, 35];
  if (id === "joint-jaw") return axis === 0 ? [0, 25] : [0, 0];
  if (id === "joint-earL" || id === "joint-earR") return [-35, 35];
  if (id.startsWith("joint-tail")) return [-80, 80];
  return [-180, 180];
}

export function CatPoseEditor({ renderPreview }: {
  renderPreview: (props: CatPoseEditorPreviewProps) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [definition, setDefinition] = useState<CatPoseDefinition>(CAT_POSES.seated);
  const [axis, setAxis] = useState(0);
  const [selectedJoint, setSelectedJoint] = useState<CatJointId | null>(null);
  const [transition, setTransition] = useState<CatPosePreview["transition"]>();
  const [hunger, setHunger] = useState(PREVIEW_PET_NEEDS.hunger);
  const [pattern, setPattern] = useState<CoatPattern | null>(null);
  const [breathing, setBreathing] = useState(true);
  const systemReducedMotion = useReducedMotion();
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const reducedMotion = motionOverride ?? systemReducedMotion;
  const [showHidden, setShowHidden] = useState(false);
  const [contacts, setContacts] = useState(false);
  const [feedback, setFeedback] = useState<"copied" | "error" | null>(null);
  const diagnostics = useRef<CatPoseDiagnostics | null>(null);
  const [snapshot, setSnapshot] = useState<CatPoseDiagnostics | null>(null);

  // The renderer borrows one stable object. UI polling is deliberately outside useFrame.
  useEffect(() => {
    if (!open || !contacts) return;
    const timer = window.setInterval(() => {
      setSnapshot(diagnostics.current ? { ...diagnostics.current } : null);
    }, 250);
    return () => window.clearInterval(timer);
  }, [open, contacts]);

  const selectPose = (id: CatPoseId) => {
    setDefinition(CAT_POSES[id]);
    setTransition(undefined);
    setFeedback(null);
  };
  const patchDefinition = (patch: Partial<CatPoseDefinition>) => {
    setDefinition(current => ({ ...current, ...patch }));
    setFeedback(null);
  };
  const editJoint = (id: CatJointId, value: number) => {
    const triplet = [...definition.rotationDeg[id]] as [number, number, number];
    triplet[axis] = value;
    patchDefinition({ rotationDeg: { ...definition.rotationDeg, [id]: triplet } });
    setSelectedJoint(id);
  };
  const patchTransition = (patch: Partial<NonNullable<CatPosePreview["transition"]>>) => {
    setTransition(current => ({ from: definition.id, to: definition.id, progress: 0, playing: false, ...current, ...patch }));
  };
  const copy = async () => {
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(exportCatPose(definition));
      setFeedback("copied");
    } catch {
      setFeedback("error");
    }
  };

  const posePreview: CatPosePreview = {
    pose: definition.id, definition, transition, breathing, reducedMotion, showHidden,
    contacts, selectedJoint, diagnostics,
  };

  return <>
    {renderPreview({
      colors: pattern === null ? DEFAULT_GREY_COAT : { ...DEFAULT_GREY_COAT, pattern },
      needs: { ...PREVIEW_PET_NEEDS, hunger }, posePreview,
    })}
    <details className={styles.poseEditor} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>Poses y transiciones</summary>
      {open && <div className={styles.poseControls}>
        <p className={styles.cardHint}>Solo vista previa: poses, hambre y pelaje no se guardan ni cambian el gato del inicio.</p>
        <label className={styles.field}>Pose
          <select aria-label="Pose" value={definition.id} onChange={event => selectPose(event.target.value as CatPoseId)}><PoseOptions /></select>
        </label>
        <button className={styles.secondary} type="button" onClick={() => selectPose("seated")}>Volver a sentado</button>
        <div className={styles.actions} role="group" aria-label="Eje local">
          {axes.map((name, index) => <button key={name} className={styles.secondary} type="button"
            aria-label={`Eje ${name}`} aria-pressed={axis === index} onClick={() => setAxis(index)}>{name}</button>)}
        </div>
        <p className={styles.cardHint}>Pivote: {selectedJoint ?? "sin seleccionar"} · marco local XYZ (delta desde reposo)</p>
        <div className={styles.jointList}>
          {CAT_JOINT_IDS.map(id => {
            const [min, max] = jointLimits(id, axis);
            return <div key={id} className={styles.field}>
              <label htmlFor={`pose-${id}`}>{id} · {axes[axis]} (grados locales)</label>
              <output htmlFor={`pose-${id}`}>{definition.rotationDeg[id][axis]}°</output>
              <input id={`pose-${id}`} type="range" min={min} max={max} step="0.1"
                value={definition.rotationDeg[id][axis]} onFocus={() => setSelectedJoint(id)}
                onChange={event => editJoint(id, Number(event.target.value))} />
            </div>;
          })}
        </div>
        <label className={styles.field}>Altura raíz
          <input type="number" step="0.001" value={definition.rootOffset[1]} onChange={event => {
            if (event.target.value !== "" && Number.isFinite(event.target.valueAsNumber)) {
              patchDefinition({ rootOffset: [definition.rootOffset[0], event.target.valueAsNumber, definition.rootOffset[2]] as PoseVec3 });
            }
          }} />
        </label>
        <label className={styles.field}>Orientación sin envolver (grados)
          <input type="number" step="0.1" value={definition.headingDeg} onChange={event => {
            if (event.target.value !== "" && Number.isFinite(event.target.valueAsNumber)) patchDefinition({ headingDeg: event.target.valueAsNumber });
          }} />
        </label>
        <fieldset className={styles.poseTransition}>
          <legend>Transición (grafo del visor)</legend>
          <label className={styles.field}>Desde
            <select value={transition?.from ?? definition.id} onChange={event => patchTransition({ from: event.target.value as CatPoseId, playing: false })}><PoseOptions /></select>
          </label>
          <label className={styles.field}>Hacia
            <select value={transition?.to ?? definition.id} onChange={event => patchTransition({ to: event.target.value as CatPoseId, playing: false })}><PoseOptions /></select>
          </label>
          <label className={styles.field}>Progreso de transición
            <input type="range" min="0" max="1" step="0.001" value={transition?.progress ?? 0}
              onChange={event => patchTransition({ progress: Number(event.target.value), playing: false })} />
          </label>
          <button className={styles.secondary} type="button" onClick={() => {
            const measured = diagnostics.current?.transitionProgress;
            patchTransition({
              playing: !transition?.playing,
              ...(transition?.playing && measured !== undefined ? { progress: measured } : {}),
            });
          }}>
            {transition?.playing ? "Pausar" : "Reproducir"}
          </button>
          <p className={styles.cardHint}>Progreso medido: {snapshot ? `${Math.round(snapshot.transitionProgress * 100)}%` : "sin comprobar"}</p>
        </fieldset>
        <label className={styles.field}>Hambre de vista previa
          <input type="range" min="0" max="100" step="1" value={hunger} onChange={event => setHunger(Number(event.target.value))} />
        </label>
        <label className={styles.field}>Patrón de vista previa
          <select value={pattern ?? "solid"} onChange={event => setPattern(event.target.value as CoatPattern)}>
            {COAT_PATTERNS.map(id => <option key={id} value={id}>{patternLabels[id]}</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={breathing} onChange={event => setBreathing(event.target.checked)} /> Respiración</label>
        <label><input type="checkbox" checked={reducedMotion} onChange={event => setMotionOverride(event.target.checked)} /> Movimiento reducido</label>
        <label><input type="checkbox" checked={showHidden} onChange={event => setShowHidden(event.target.checked)} /> Mostrar piezas ocultas</label>
        <label><input type="checkbox" checked={contacts} onChange={event => setContacts(event.target.checked)} /> Diagnósticos de contacto</label>
        {contacts && <div className={styles.cardHint} aria-live="polite">
          <p>Deriva: {metric(snapshot?.maxFootDrift)} · Separación: {metric(snapshot?.maxSeamGap)} · Piso: {metric(snapshot?.maxFloorPenetration)}</p>
          <p>Apoyos: {metric(snapshot?.plantedFeet)} · Inalcanzables: {metric(snapshot?.unreachableFeet)}</p>
          <p>Deriva px: {metric(snapshot?.maxFootDriftPx)} · CPU ms: {metric(snapshot?.cpuMs)}</p>
        </div>}
        <button className={styles.secondary} type="button" onClick={copy}>Copiar pose TypeScript</button>
        {feedback === "copied" && <p className={styles.success} role="status">Pose copiada</p>}
        {feedback === "error" && <p role="alert">No se pudo copiar la pose. Probá de nuevo.</p>}
      </div>}
    </details>
  </>;
}
