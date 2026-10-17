"use client";

import { useEffect } from "react";

import AdminUserDetailView from "./AdminUserDetailView";
import estilos from "./admin-user-detail-modal.module.css";

type Props = Readonly<{
  abierta: boolean;
  idUsuario: string;
  onClose: () => void;
  onListRefresh?: () => void;
}>;

export default function AdminUserDetailModal({ abierta, idUsuario, onClose, onListRefresh }: Props) {
  useEffect(() => {
    if (!abierta) return;

    document.body.style.overflow = "hidden";
    const manejadorTeclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onClose();
    };
    window.addEventListener("keydown", manejadorTeclado);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", manejadorTeclado);
    };
  }, [abierta, onClose]);

  if (!abierta) return null;

  return (
    <div
      className={estilos.modalFondo}
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
    >
      <div
        className={estilos.modalCaja}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-detalle-usuario"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className={estilos.modalBarra}>
          <h2 id="titulo-modal-detalle-usuario" className={estilos.modalTitulo}>
            Detalle de usuario
          </h2>
          <button type="button" className={estilos.botonCerrar} onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>

        <div className={estilos.contenido}>
          <AdminUserDetailView
            idUsuario={idUsuario}
            modalMode
            onListRefresh={onListRefresh}
            mostrarConfiguracion
          />
        </div>
      </div>
    </div>
  );
}

