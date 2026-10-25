"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AdminPageHeader from "@/app/admin/_components/shared/AdminPageHeader";
import {
  clearCatDesign,
  defaultCatDesign,
  loadCatDesign,
  saveCatDesign,
  type CatDesignTunables,
} from "@/features/admin/cat-design-settings";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import estilos from "./admin-design-3d.module.css";

const Cat3DViewer = dynamic(
  () =>
    import("@/features/pet-home/components/Cat3DViewer").then(
      (mod) => mod.Cat3DViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className={estilos.previewHost} role="status">
        Cargando vista previa…
      </div>
    ),
  },
);

function formatNum(value: number, digits = 2) {
  return value.toFixed(digits);
}

/** Browser-local tuning for the procedural cat preview. */
export function AdminDesign3DPage() {
  const [draft, setDraft] = useState<CatDesignTunables>(() => loadCatDesign());
  const [message, setMessage] = useState<string | null>(null);

  const patch = (partial: Partial<CatDesignTunables>) => {
    setDraft(saveCatDesign({ ...draft, ...partial }));
    setMessage(null);
  };

  const onReset = () => {
    clearCatDesign();
    setDraft(defaultCatDesign());
    setMessage("Diseño restablecido");
  };

  return (
    <>
      <AdminPageHeader
        titulo="Diseño 3D"
        subtitulo="Ajustá la vista previa del gato procedural en este navegador"
      />
      <div className={estilos.layout}>
        <section className={estilos.previewCard} aria-labelledby="preview-heading">
          <h2 id="preview-heading" className={estilos.cardTitle}>
            Vista previa
          </h2>
          <p className={estilos.cardHint}>
            Vista previa local. Los ajustes se guardan solo en este navegador y no cambian el gato del inicio.
          </p>
          <div className={estilos.previewHost}>
            <Cat3DViewer colors={DEFAULT_GREY_COAT} design={draft} />
          </div>
        </section>

        <section className={estilos.card} aria-labelledby="model-heading">
          <h2 id="model-heading" className={estilos.cardTitle}>
            Modelo 3D
          </h2>
          <div className={estilos.field}>
            <label htmlFor="cat-model-scale">
              <span>Escala del modelo</span>
              <span className={estilos.fieldValue}>
                {formatNum(draft.modelScale)}
              </span>
            </label>
            <input
              id="cat-model-scale"
              type="range"
              min={0.2}
              max={2.5}
              step={0.01}
              value={draft.modelScale}
              onChange={(event) =>
                patch({ modelScale: Number(event.target.value) })
              }
            />
          </div>

          <div className={estilos.field}>
            <label htmlFor="cat-body-depth">
              <span>Profundidad del cuerpo</span>
              <span className={estilos.fieldValue}>
                {formatNum(draft.bodyDepth)}
              </span>
            </label>
            <input
              id="cat-body-depth"
              type="range"
              min={0.7}
              max={1.6}
              step={0.01}
              value={draft.bodyDepth}
              onChange={(event) =>
                patch({ bodyDepth: Number(event.target.value) })
              }
            />
          </div>

          <div className={estilos.field}>
            <label htmlFor="cat-head-height">
              <span>Altura de la cabeza</span>
              <span className={estilos.fieldValue}>
                {formatNum(draft.headHeight)}
              </span>
            </label>
            <input
              id="cat-head-height"
              type="range"
              min={-0.15}
              max={0.25}
              step={0.01}
              value={draft.headHeight}
              onChange={(event) =>
                patch({ headHeight: Number(event.target.value) })
              }
            />
          </div>

          <div className={estilos.field}>
            <label htmlFor="cat-ear-size">
              <span>Tamaño de orejas</span>
              <span className={estilos.fieldValue}>
                {formatNum(draft.earSize)}
              </span>
            </label>
            <input
              id="cat-ear-size"
              type="range"
              min={0.6}
              max={1.6}
              step={0.01}
              value={draft.earSize}
              onChange={(event) =>
                patch({ earSize: Number(event.target.value) })
              }
            />
          </div>

          <div className={estilos.actions}>
            <button
              type="button"
              className={estilos.secondary}
              onClick={onReset}
            >
              Restablecer
            </button>
          </div>
          {message ? (
            <p className={estilos.success} role="status">
              {message}
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
