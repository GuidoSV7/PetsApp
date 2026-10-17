"use client";

import DashboardHeader from "../_components/dashboard/DashboardHeader";
import AdminCommissionsSection from "../_components/settings/AdminCommissionsSection";

/** Configuración global de la plataforma (solo rol admin). */
export default function PaginaAdminSettings() {
  return (
    <>
      <DashboardHeader
        titulo="Configuración"
        subtitulo="Parámetros globales de PetsApp (comisiones, etc.)"
        mostrarSelectorMes={false}
      />
      <div style={{ padding: "8px 0 32px" }}>
        <AdminCommissionsSection />
      </div>
    </>
  );
}
