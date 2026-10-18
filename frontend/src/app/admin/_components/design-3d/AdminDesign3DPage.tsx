"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/app/admin/_components/shared/AdminPageHeader";
import {
  clearCatDesign,
  defaultCatDesign,
  loadCatDesign,
  normalizeCatDesign,
  saveCatDesign,
  type CatDesignTunables,
} from "@/features/admin/cat-design-settings";
import {
  assertModelFileSize,
  isAcceptedModelFile,
  notifyCatModelChanged,
} from "@/features/admin/cat-model-asset";
import {
  clearGlobalPetModel,
  fetchGlobalPetModel,
  resolvePetModelFileUrl,
  uploadGlobalPetModel,
} from "@/features/admin/pet-model.service";
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

function formatAdminModelError(err: unknown, fallback: string): string {
  const status =
    typeof err === "object" &&
    err !== null &&
    "codigoEstado" in err &&
    typeof (err as { codigoEstado?: unknown }).codigoEstado === "number"
      ? (err as { codigoEstado: number }).codigoEstado
      : undefined;
  if (status === 404) {
    return "No se encontró /admin/pet-model (404). Redeployá el frontend (BFF) o el backend con el modelo global.";
  }
  if (status === 401) {
    return "Sesión admin inválida. Cerrá sesión y entrá de nuevo en /login.";
  }
  return err instanceof Error ? err.message : fallback;
}

/** Admin: upload .glb, tune scale, preview, confirm for every user. */
export function AdminDesign3DPage() {
  const [draft, setDraft] = useState<CatDesignTunables>(() => loadCatDesign());
  const [confirmedUrl, setConfirmedUrl] = useState<string | null>(null);
  const [confirmedName, setConfirmedName] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchGlobalPetModel()
      .then((meta) => {
        if (cancelled) return;
        setDraft((prev) =>
          normalizeCatDesign({ ...prev, modelScale: meta.modelScale }),
        );
        const url = resolvePetModelFileUrl(meta);
        if (url) {
          setConfirmedUrl(url);
          setConfirmedName(meta.fileName ?? "modelo.glb");
        }
      })
      .catch(() => {
        /* offline / API down — keep local draft */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pendingUrl?.startsWith("blob:")) URL.revokeObjectURL(pendingUrl);
    };
  }, [pendingUrl]);

  const previewUrl = pendingUrl ?? confirmedUrl;
  const usingCustom = Boolean(previewUrl);
  const previewKey = useMemo(
    () =>
      `${previewUrl ?? "procedural"}-${draft.modelScale}-${draft.bodyDepth}-${draft.headHeight}-${draft.earSize}`,
    [draft, previewUrl],
  );

  const patch = (partial: Partial<CatDesignTunables>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setMessage(null);
  };

  const onPickFile = (list: FileList | null) => {
    const file = list?.[0];
    setError(null);
    setMessage(null);
    if (!file) return;
    if (!isAcceptedModelFile(file)) {
      setError("Solo se aceptan archivos .glb o .gltf.");
      return;
    }
    try {
      assertModelFileSize(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archivo demasiado grande.");
      return;
    }
    if (pendingUrl?.startsWith("blob:")) URL.revokeObjectURL(pendingUrl);
    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingUrl(url);
  };

  const onConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const savedTunables = saveCatDesign(draft);
      setDraft(savedTunables);

      const meta = await uploadGlobalPetModel({
        modelScale: savedTunables.modelScale,
        file: pendingFile,
      });
      const url = resolvePetModelFileUrl(meta);
      setConfirmedUrl(url);
      setConfirmedName(
        meta.kind === "glb" ? (meta.fileName ?? "modelo.glb") : null,
      );
      if (pendingUrl?.startsWith("blob:")) URL.revokeObjectURL(pendingUrl);
      setPendingFile(null);
      setPendingUrl(null);

      notifyCatModelChanged();
      setMessage("Cambio confirmado para todos los usuarios");
    } catch (err) {
      setError(formatAdminModelError(err, "No se pudo confirmar el cambio."));
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    setBusy(true);
    setError(null);
    try {
      clearCatDesign();
      await clearGlobalPetModel();
      notifyCatModelChanged();
      setDraft(defaultCatDesign());
      setConfirmedUrl(null);
      setConfirmedName(null);
      if (pendingUrl?.startsWith("blob:")) URL.revokeObjectURL(pendingUrl);
      setPendingFile(null);
      setPendingUrl(null);
      setMessage("Diseño restablecido");
    } catch (err) {
      setError(formatAdminModelError(err, "No se pudo restablecer."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        titulo="Diseño 3D"
        subtitulo="Subí un .glb, ajustá el tamaño, previsualizá y confirmá para todos"
      />
      <div className={estilos.layout}>
        <section className={estilos.previewCard} aria-labelledby="preview-heading">
          <h2 id="preview-heading" className={estilos.cardTitle}>
            Vista previa
          </h2>
          <p className={estilos.cardHint}>
            Así se verá Michi en el home de todos los usuarios cuando confirmes.
          </p>
          <div className={estilos.previewHost} key={previewKey}>
            <Cat3DViewer
              colors={DEFAULT_GREY_COAT}
              design={draft}
              modelUrl={previewUrl}
            />
          </div>
        </section>

        <section className={estilos.card} aria-labelledby="model-heading">
          <h2 id="model-heading" className={estilos.cardTitle}>
            Modelo 3D
          </h2>
          <p className={estilos.cardHint}>
            Elegí un archivo .glb (también .gltf). Al confirmar, el modelo se
            publica para todos los hogares.
          </p>

          <label className={estilos.fileDrop}>
            <span className={estilos.fileDropTitle}>
              {pendingFile?.name ||
                confirmedName ||
                "Todavía no hay modelo custom"}
            </span>
            <span className={estilos.fileDropHint}>
              Tocá para elegir .glb / .gltf
            </span>
            <input
              type="file"
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              aria-label="Elegir modelo .glb"
              onChange={(event) => {
                onPickFile(event.target.files);
                event.target.value = "";
              }}
            />
          </label>

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

          {!usingCustom ? (
            <>
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
            </>
          ) : null}

          <div className={estilos.actions}>
            <button
              type="button"
              className={estilos.primary}
              disabled={busy}
              onClick={() => void onConfirm()}
            >
              Confirmar cambio
            </button>
            <button
              type="button"
              className={estilos.secondary}
              disabled={busy}
              onClick={() => void onReset()}
            >
              Restablecer
            </button>
          </div>
          {message ? (
            <p className={estilos.success} role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className={estilos.error} role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
