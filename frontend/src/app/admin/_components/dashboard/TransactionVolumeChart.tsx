"use client";

import { useEffect, useMemo, useState } from "react";
import estilosEncabezados from "../dashboard-section-headers.module.css";
import estilos from "./transaction-volume-chart.module.css";
import { getSessionToken } from "../../../demoAuth";
import {
  PetsAppApiError,
  getAdminPaymentSeries,
  type PaymentSeriesPoint,
} from "../../../_lib/petsapp-api";

const W = 400;
const H = 160;
const PAD = 16;

function construirAreaYLinea(puntos: PaymentSeriesPoint[]): { area: string; linea: string; fechas: string[] } {
  const counts = puntos.map((p) => p.paymentCount);
  const max = Math.max(...counts, 1);
  const n = counts.length;
  if (n === 0) {
    return { area: "", linea: "", fechas: [] };
  }
  const coords = counts.map((c, i) => {
    const x = n <= 1 ? W / 2 : (i / (n - 1)) * W;
    const y = H - PAD - (c / max) * (H - 2 * PAD);
    return { x, y };
  });
  const linea = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area =
    `M0,${H} ` + coords.map((p) => `L${p.x},${p.y}`).join(" ") + ` L${W},${H} Z`;
  const fechas = puntos.map((p) => {
    const d = new Date(p.bucketStart);
    return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short" }).format(d);
  });
  return { area, linea, fechas };
}

/** Área: cantidad de pagos escrow por día (últimos 14 días). */
export default function TransactionVolumeChart() {
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
          groupBy: "day",
          buckets: 14,
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

  const { area, linea, fechas } = useMemo(() => construirAreaYLinea(puntos), [puntos]);

  return (
    <section className={estilos.tarjetaGrafico}>
      <div className={estilos.cabeceraGrafico}>
        <div>
          <h2 className={estilosEncabezados.tituloSeccion}>Volumen de transacciones</h2>
          <p className={estilosEncabezados.subtituloSeccion}>
            Pagos escrow por día (últimos 14 días, API en vivo)
          </p>
        </div>
      </div>
      {error ? (
        <p style={{ color: "var(--error, #b91c1c)", margin: "0 0 12px" }} role="alert">
          {error}
        </p>
      ) : null}
      <div className={estilos.contenedorArea}>
        {cargando ? (
          <div
            className={estilos.svgArea}
            style={{ background: "linear-gradient(90deg,#f3f4f6,#e5e7eb,#f3f4f6)", minHeight: H }}
          />
        ) : (
          <svg className={estilos.svgArea} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="rellenoAreaVolumen" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(108, 99, 255, 0.15)" />
                <stop offset="100%" stopColor="rgba(108, 99, 255, 0)" />
              </linearGradient>
            </defs>
            {area ? <path d={area} fill="url(#rellenoAreaVolumen)" /> : null}
            {linea ? (
              <path
                d={linea}
                fill="none"
                stroke="#6c63ff"
                strokeLinecap="round"
                strokeWidth="3"
              />
            ) : (
              <text x={W / 2} y={H / 2} textAnchor="middle" fill="#9ca3af" fontSize="12">
                Sin datos
              </text>
            )}
          </svg>
        )}
        <div className={estilos.ejeFechas}>
          {cargando
            ? Array.from({ length: 5 }).map((_, i) => <span key={i}>…</span>)
            : fechas.length > 0
              ? [0, Math.floor(fechas.length / 4), Math.floor(fechas.length / 2), Math.floor((fechas.length * 3) / 4), fechas.length - 1]
                  .filter((idx, j, arr) => arr.indexOf(idx) === j)
                  .map((idx) => (
                    <span key={idx}>{fechas[idx] ?? ""}</span>
                  ))
              : null}
        </div>
      </div>
    </section>
  );
}
