"use client";

import { useEffect, useState } from "react";
import { getSessionToken } from "../../../demoAuth";
import {
  PetsAppApiError,
  getAdminMerchantMetrics,
  type MerchantMetricRow,
} from "../../../_lib/petsapp-api";

export type VarianteTablaMetricas = "standalone" | "embedded";

type Props = {
  /** `embedded`: sin título propio; va dentro de «Rentabilidad por socio». */
  variant?: VarianteTablaMetricas;
};

/** Tabla top merchants por volumen escrow (API real). */
export default function MerchantEscrowMetricsTable({
  variant = "standalone",
}: Props) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<MerchantMetricRow[]>([]);
  const [commissionBps, setCommissionBps] = useState<number | null>(null);

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
        const r = await getAdminMerchantMetrics(token, {
          page: 1,
          limit: 15,
          sort: "volume",
        });
        if (cancelado) return;
        setFilas(r.data);
        setCommissionBps(r.commissionBps);
        setError(null);
      } catch (e) {
        if (cancelado) return;
        if (e instanceof PetsAppApiError) {
          setError(e.message);
        } else {
          setError("No se pudo cargar el ranking.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const embebido = variant === "embedded";

  const cuerpo = (
    <>
      {!embebido ? (
        <h2
          id="titulo-tabla-merchants"
          style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}
        >
          Merchants por volumen (escrow)
        </h2>
      ) : null}
      <p
        style={{
          fontSize: 13,
          color: "var(--muted, #64748b)",
          marginBottom: 16,
          marginTop: embebido ? 0 : undefined,
        }}
      >
        Datos de{" "}
        <code style={{ fontSize: 12 }}>/admin/metrics/merchants/payments</code>
        {commissionBps != null ? (
          <> · comisión configurada: {(commissionBps / 100).toFixed(2)}%</>
        ) : null}
      </p>

      {error ? (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p>Cargando tabla…</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "10px 8px" }}>Email</th>
                <th style={{ padding: "10px 8px" }}>Negocios</th>
                <th style={{ padding: "10px 8px" }}>Pagos</th>
                <th style={{ padding: "10px 8px" }}>Volumen (SOL)</th>
                <th style={{ padding: "10px 8px" }}>Comisión est. (SOL)</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && !error ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: "#64748b" }}>
                    Sin datos de pagos aún.
                  </td>
                </tr>
              ) : (
                filas.map((f) => (
                  <tr key={f.userId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 8px", wordBreak: "break-all" }}>{f.email}</td>
                    <td style={{ padding: "10px 8px" }}>{f.businessCount}</td>
                    <td style={{ padding: "10px 8px" }}>{f.totalPayments}</td>
                    <td style={{ padding: "10px 8px" }}>{f.volumeSol}</td>
                    <td style={{ padding: "10px 8px" }}>{f.estimatedCommissionSol}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  if (embebido) {
    return (
      <div aria-label="Merchants por volumen escrow">
        {cuerpo}
      </div>
    );
  }

  return (
    <section
      style={{
        marginTop: 24,
        padding: 20,
        borderRadius: 18,
        border: "1px solid color-mix(in srgb, var(--texto, #111) 10%, transparent)",
        background: "var(--tarjeta, #fff)",
      }}
      aria-labelledby="titulo-tabla-merchants"
    >
      {cuerpo}
    </section>
  );
}
