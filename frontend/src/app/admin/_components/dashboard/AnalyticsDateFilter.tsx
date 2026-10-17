"use client";

import { useEffect, useRef, useState } from "react";
import type { DateFilterPreset, DateFilterIsoRange } from "@/features/merchant-analytics/date-filter-range";
import {
  resolveDateFilterRange,
  ymdLocal,
} from "@/features/merchant-analytics/date-filter-range";
import estilos from "./dashboard-header.module.css";

type Props = {
  onRangeChange?: (rango: DateFilterIsoRange) => void;
};

const ATAJOS: Array<{ id: Exclude<DateFilterPreset, "calendario">; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];

export default function AnalyticsDateFilter({ onRangeChange }: Props) {
  const [preset, setPreset] = useState<DateFilterPreset>("hoy");
  const [ymd, setYmd] = useState(() => ymdLocal(new Date()));
  const alCambiarRef = useRef(onRangeChange);
  alCambiarRef.current = onRangeChange;

  useEffect(() => {
    const rango = resolveDateFilterRange({
      preset,
      calendarDateYmd: ymd,
      ahora: new Date(),
    });
    alCambiarRef.current?.(rango);
  }, [preset, ymd]);

  return (
    <div className={estilos.grupoFiltroFecha} role="group" aria-label="Filtro de período">
      <div className={estilos.atajosFecha}>
        {ATAJOS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={
              preset === a.id ? `${estilos.botonPreset} ${estilos.botonPresetActivo}` : estilos.botonPreset
            }
            aria-pressed={preset === a.id}
            onClick={() => {
              setPreset(a.id);
              if (a.id === "hoy") {
                setYmd(ymdLocal(new Date()));
              }
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <label className={estilos.labelCalendario}>
        <span className={estilos.textoSr}>Fecha en calendario</span>
        <input
          type="date"
          className={estilos.inputFecha}
          value={ymd}
          max={ymdLocal(new Date())}
          aria-label="Elegir fecha en calendario"
          onChange={(ev) => {
            const v = ev.target.value;
            if (!v) return;
            setYmd(v);
            setPreset("calendario");
          }}
        />
      </label>
    </div>
  );
}
