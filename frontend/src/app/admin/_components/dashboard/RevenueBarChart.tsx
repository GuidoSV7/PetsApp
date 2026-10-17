"use client";

import { useEffect, useMemo, useState } from "react";
import estilosEncabezados from "../dashboard-section-headers.module.css";
import estilos from "./revenue-bar-chart.module.css";
import { getSessionToken } from "../../../demoAuth";
import {
  PetsAppApiError,
  getAdminPaymentSeries,
  type PaymentSeriesPoint,
} from "../../../_lib/petsapp-api";

function parseSol(s: string): number {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function labelSemana(p: PaymentSeriesPoint): string {
  const d = new Date(p.bucketStart);
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(d);
}

/** Barras: volumen SOL por semana (últimas 4) desde GET /admin/metrics/payments/timeseries */
export default function RevenueBarChart() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [puntos, setPuntos] = useState<PaymentSeriesPoint[]>([]);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      setCargando(false);
      setError("Sin sesión");
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const r = await getAdminPaymentSeries(token, {
          groupBy: "week",
          buckets: 4,
        });
        if (cancelado) return;
        setPuntos(r.data);
        setError(null);
      } catch (e) {
        if (cancelado) return;
        if (e instanceof PetsAppApiError) setError(e.message);
        else setError("No se pudo cargar la serie.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const barras = useMemo(() => {
    if (puntos.length === 0) return [];
    const vols = puntos.map((p) => parseSol(p.volumeSol));
    const maxSol = Math.max(...vols, 1e-12);
    const maxIdx = vols.indexOf(Math.max(...vols));
    return puntos.map((p, i) => {
      const v = vols[i];
      const porcentaje = maxSol > 0 ? Math.max(4, (v / maxSol) * 100) : 4;
      return {
        clave: p.bucketStart,
        label: labelSemana(p),
        porcentaje,
        valor: `${p.volumeSol} SOL`,
        destacada: i === maxIdx && v > 0,
      };
    });
  }, [puntos]);

  const tituloMes = new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section className={estilos.tarjetaGrafico}>
      <div className={estilos.cabeceraGrafico}>
        <div>
          <h2 className={estilosEncabezados.tituloSeccion}>Detalle de ingresos del mes</h2>
          <p className={estilosEncabezados.subtituloSeccion}>
            Volumen escrow por semana (últimas 4 semanas, API en vivo)
          </p>
        </div>
        <div className={estilos.navigationMes}>
          <span className={estilos.labelMes} style={{ textTransform: "capitalize" }}>
            {tituloMes}
          </span>
        </div>
      </div>
      {error ? (
        <p style={{ color: "var(--error, #b91c1c)", margin: "0 0 12px" }} role="alert">
          {error}
        </p>
      ) : null}
      <div className={estilos.areaBarras}>
        {cargando
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={estilos.columnaBarra}>
                <div className={estilos.pistaBarra}>
                  <div
                    className={estilos.rellenoBarra}
                    style={{ height: "20%", opacity: 0.35 }}
                  />
                </div>
                <span className={estilos.labelSemana}>…</span>
              </div>
            ))
          : barras.map((s) => (
              <div key={s.clave} className={estilos.columnaBarra}>
                <div className={estilos.pistaBarra}>
                  <div
                    className={`${estilos.rellenoBarra} ${s.destacada ? estilos.rellenoBarraActiva : ""}`}
                    style={{ height: `${s.porcentaje}%` }}
                  />
                  <div className={estilos.tooltipBarra}>{s.valor}</div>
                </div>
                <span
                  className={`${estilos.labelSemana} ${s.destacada ? estilos.labelSemanaActiva : ""}`}
                >
                  {s.label}
                </span>
              </div>
            ))}
      </div>
    </section>
  );
}
