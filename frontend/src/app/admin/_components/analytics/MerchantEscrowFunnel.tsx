"use client";

import { useEffect, useState } from "react";
import { getSessionToken } from "../../../demoAuth";
import {
  PetsAppApiError,
  getMerchantPaymentsFunnel,
} from "../../../_lib/petsapp-api";
import estilos from "./central-analytics-content.module.css";

const opacidades = [1, 0.88, 0.72, 0.58] as const;

/** Embudo real desde GET /metrics/my-businesses/payment-funnel */
export default function MerchantEscrowFunnel({ businessId }: { businessId?: string }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pasos, setPasos] = useState<
    Array<{ key: string; label: string; count: number; percentOfFirst: number }>
  >([]);

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
        const r = await getMerchantPaymentsFunnel(token, businessId);
        if (cancelado) return;
        setPasos(r.steps);
        setError(null);
      } catch (e) {
        if (cancelado) return;
        if (e instanceof PetsAppApiError) setError(e.message);
        else setError("No se pudo cargar el embudo.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [businessId]);

  if (error) {
    return (
      <p className={estilos.tituloEmbudo} role="alert" style={{ color: "var(--error, #b91c1c)" }}>
        {error}
      </p>
    );
  }

  if (cargando) {
    return <p className={estilos.tituloEmbudo}>Cargando embudo…</p>;
  }

  if (pasos.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
        Sin datos de órdenes todavía.
      </p>
    );
  }

  return (
    <div className={estilos.listaEmbudo}>
      {pasos.map((paso, indice) => (
        <div key={paso.key} className={estilos.filaEmbudo}>
          <div className={estilos.labelsEmbudo}>
            <span>{paso.label}</span>
            <span>{paso.percentOfFirst.toFixed(paso.percentOfFirst % 1 === 0 ? 0 : 1)}%</span>
          </div>
          <div className={estilos.pistaEmbudo}>
            <div
              className={estilos.rellenoEmbudo}
              style={{
                width: `${Math.min(100, Math.max(0, paso.percentOfFirst))}%`,
                backgroundColor: `rgba(153, 69, 255, ${opacidades[indice] ?? 0.55})`,
              }}
            >
              <span className={estilos.textoSobreBarra}>{String(paso.count)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
