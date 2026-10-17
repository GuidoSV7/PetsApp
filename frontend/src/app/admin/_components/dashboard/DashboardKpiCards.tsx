"use client";

import { useEffect, useState } from "react";
import { iconMaskStyle } from "../../_utils/iconMaskStyle";
import estilosMascara from "../icon-mask.module.css";
import estilos from "./dashboard-kpi-cards.module.css";
import { getSessionToken } from "../../../demoAuth";
import {
  PetsAppApiError,
  fetchAllAdminMerchantMetricsPages,
} from "../../../_lib/petsapp-api";

/** KPIs reales desde GET /admin/metrics/merchants/payments (agregado en cliente). */
export default function DashboardKpiCards() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volumenSol, setVolumenSol] = useState("—");
  const [totalPayments, setTotalPagos] = useState("—");
  const [merchants, setMerchants] = useState("—");
  const [comisionSol, setComisionSol] = useState("—");
  const [bps, setBps] = useState<number | null>(null);

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
        const agg = await fetchAllAdminMerchantMetricsPages(token);
        if (cancelado) return;
        setVolumenSol(agg.volumenSol);
        setTotalPagos(String(agg.totalPayments));
        setMerchants(String(agg.totalMerchants));
        setComisionSol(agg.comisionSol);
        setBps(agg.commissionBps);
        setError(null);
      } catch (e) {
        if (cancelado) return;
        if (e instanceof PetsAppApiError) {
          setError(e.message);
        } else {
          setError("No se pudieron cargar las métricas.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const sub = cargando
    ? "…"
    : error
      ? "Error"
      : bps != null
        ? `Comisión ${(bps / 100).toFixed(2)}%`
        : "—";

  return (
    <section className={estilos.gridTarjetas} data-purpose="admin-dashboard-kpis">
      {error ? (
        <p
          className={estilos.nombreTarjeta}
          style={{ gridColumn: "1 / -1", color: "var(--error, #b91c1c)" }}
          role="alert"
        >
          Métricas: {error}
        </p>
      ) : null}

      <article className={estilos.tarjeta} data-tarjeta="volumen">
        <div className={estilos.cabeceraTarjeta}>
          <div className={`${estilos.iconoTarjeta} ${estilos.iconoFondoIndigo}`}>
            <span
              className={estilosMascara.mascaraIcono}
              style={iconMaskStyle("/iconos/icon-money.svg")}
              aria-hidden
            />
          </div>
          <span className={`${estilos.badge} ${estilos.badgeInfo}`}>Escrow</span>
        </div>
        <p className={estilos.nombreTarjeta}>Volumen (pagos escrow)</p>
        <h3 className={estilos.valorTarjeta}>
          {cargando ? "…" : `${volumenSol} SOL`}
        </h3>
      </article>

      <article className={estilos.tarjeta} data-tarjeta="transacciones">
        <div className={estilos.cabeceraTarjeta}>
          <div className={`${estilos.iconoTarjeta} ${estilos.iconoFondoAzul}`}>
            <span
              className={estilosMascara.mascaraIcono}
              style={iconMaskStyle("/iconos/icon-transacciones.svg")}
              aria-hidden
            />
          </div>
          <span className={`${estilos.badge} ${estilos.badgeInfo}`}>API</span>
        </div>
        <p className={estilos.nombreTarjeta}>Pagos (conteo)</p>
        <h3 className={estilos.valorTarjeta}>{cargando ? "…" : totalPayments}</h3>
      </article>

      <article className={estilos.tarjeta} data-tarjeta="socios">
        <div className={estilos.cabeceraTarjeta}>
          <div className={`${estilos.iconoTarjeta} ${estilos.iconoFondoVioleta}`}>
            <span
              className={estilosMascara.mascaraIcono}
              style={iconMaskStyle("/iconos/icon-persona-unidas.svg")}
              aria-hidden
            />
          </div>
          <span className={`${estilos.badge} ${estilos.badgeInfo}`}>Merchants</span>
        </div>
        <p className={estilos.nombreTarjeta}>Cuentas merchant</p>
        <h3 className={estilos.valorTarjeta}>{cargando ? "…" : merchants}</h3>
      </article>

      <article className={estilos.tarjeta} data-tarjeta="comision">
        <div className={estilos.cabeceraTarjeta}>
          <div className={`${estilos.iconoTarjeta} ${estilos.iconoFondoRojo}`}>
            <span
              className={estilosMascara.mascaraIcono}
              style={iconMaskStyle("/iconos/icon-exclamation.svg")}
              aria-hidden
            />
          </div>
          <span className={`${estilos.badge} ${estilos.badgeExito}`}>{sub}</span>
        </div>
        <p className={estilos.nombreTarjeta}>Comisión estimada (plataforma)</p>
        <h3 className={estilos.valorTarjeta}>
          {cargando ? "…" : `${comisionSol} SOL`}
        </h3>
      </article>
    </section>
  );
}
