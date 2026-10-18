"use client";

import { useState } from "react";
import AdminPageHeader from "@/app/admin/_components/shared/AdminPageHeader";
import {
  defaultBrandSettings,
  loadBrandSettings,
  saveBrandSettings,
  type AdminBrandSettings,
} from "@/features/admin/admin-brand-settings";
import estilos from "./admin-settings.module.css";

/** Elena Pos–style settings: card sections for PetsApp brand draft. */
export function AdminSettingsPage() {
  const [draft, setDraft] = useState<AdminBrandSettings>(() => loadBrandSettings());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    setError(null);
    try {
      const saved = saveBrandSettings(draft);
      setDraft(saved);
      setMessage("Marca guardada");
    } catch {
      setMessage(null);
      setError("No se pudo guardar la marca");
    }
  };

  const onReset = () => {
    setDraft(defaultBrandSettings());
    setMessage(null);
    setError(null);
  };

  return (
    <>
      <AdminPageHeader
        titulo="Configuración"
        subtitulo="Ajustes públicos de PetsApp (borrador del panel)"
      />
      <div className={estilos.main}>
        <section className={estilos.card} aria-labelledby="brand-heading">
          <div>
            <h2 id="brand-heading" className={estilos.cardTitle}>
              Marca pública
            </h2>
            <p className={estilos.cardHint}>
              Nombre, tagline y descripción que querés comunicar. El SEO en
              producción sigue usando la config del código hasta que exista API
              de settings.
            </p>
          </div>

          <div className={estilos.field}>
            <label htmlFor="admin-site-name">Nombre del sitio</label>
            <input
              id="admin-site-name"
              value={draft.siteName}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, siteName: event.target.value }))
              }
            />
          </div>
          <div className={estilos.field}>
            <label htmlFor="admin-site-tagline">Tagline</label>
            <input
              id="admin-site-tagline"
              value={draft.siteTagline}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  siteTagline: event.target.value,
                }))
              }
            />
          </div>
          <div className={estilos.field}>
            <label htmlFor="admin-site-description">Descripción</label>
            <textarea
              id="admin-site-description"
              value={draft.siteDescription}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  siteDescription: event.target.value,
                }))
              }
            />
          </div>

          <div className={estilos.actions}>
            <button type="button" className={estilos.primary} onClick={onSave}>
              Guardar marca
            </button>
            <button
              type="button"
              className={estilos.secondary}
              onClick={onReset}
            >
              Restaurar defaults
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

        <p className={estilos.note}>
          Tip: el logo / favicon de PetsApp sigue el BrandMark del producto. La
          sección Diseño 3D controla la silueta de Michi en el home.
        </p>
      </div>
    </>
  );
}
