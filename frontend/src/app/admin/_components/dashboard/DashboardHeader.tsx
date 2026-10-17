"use client";

import type { DateFilterIsoRange } from "@/features/merchant-analytics/date-filter-range";
import { iconMaskStyle } from "../../_utils/iconMaskStyle";
import estilosMascara from "../icon-mask.module.css";
import AnalyticsDateFilter from "./AnalyticsDateFilter";
import AnalyticsBusinessFilter from "./AnalyticsBusinessFilter";
import estilos from "./dashboard-header.module.css";

// Cabecera del panel: titulo, filtro de período y opcionalmente exportar CSV.
type Props = {
  /** Si se omite, no se muestra el boton de exportar. */
  alExportar?: () => void;
  /** Deshabilita el botón mientras se genera el CSV (p. ej. analítica comercio). */
  exportandoCsv?: boolean;
  titulo?: string;
  subtitulo?: string;
  /** Si es false, oculta el filtro de fechas (p. ej. Configuracion). */
  mostrarSelectorMes?: boolean;
  onRangeChangeFecha?: (rango: DateFilterIsoRange) => void;
  mostrarFiltroNegocio?: boolean;
  negocioId?: string;
  alCambiarNegocioId?: (negocioId: string) => void;
};

export default function DashboardHeader({
  alExportar,
  exportandoCsv = false,
  titulo = "Rendimiento del negocio",
  subtitulo = "Filtrá por hoy, semana, mes o calendario",
  mostrarSelectorMes = true,
  onRangeChangeFecha,
  mostrarFiltroNegocio = false,
  negocioId = "",
  alCambiarNegocioId,
}: Props) {
  const mostrarExportar = typeof alExportar === "function";
  return (
    <header className={estilos.cabeceraPrincipal}>
      <div>
        <h1 className={estilos.tituloPrincipal}>{titulo}</h1>
        <p className={estilos.subtituloPrincipal}>{subtitulo}</p>
      </div>
      <div className={estilos.accionesCabecera}>
        {mostrarSelectorMes ? (
          <AnalyticsDateFilter onRangeChange={onRangeChangeFecha} />
        ) : null}
        {mostrarFiltroNegocio ? (
          <AnalyticsBusinessFilter valor={negocioId} alCambiar={alCambiarNegocioId ?? (() => undefined)} />
        ) : null}
        {mostrarExportar ? (
          <button
            type="button"
            className={estilos.botonExportar}
            onClick={alExportar}
            disabled={exportandoCsv}
          >
            <span
              className={estilosMascara.iconoExportarMascara}
              style={iconMaskStyle("/file.svg")}
              aria-hidden
            />
            {exportandoCsv ? "Exportando…" : "Exportar datos"}
          </button>
        ) : null}
      </div>
    </header>
  );
}
