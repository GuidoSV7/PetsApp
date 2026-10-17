"use client";

import { useEffect, useState } from "react";
import { getSessionToken } from "../../../demoAuth";
import {
  PetsAppApiError,
  getMyBusinessesPaymentsMetrics,
} from "../../../_lib/petsapp-api";
import estilos from "./central-analytics-content.module.css";

/** Ranking por volumen desde GET /metrics/my-businesses/payments */
export default function MerchantTopBusinessesTable({
  businessId,
}: {
  businessId?: string;
}) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<
    Array<{ id: string; nombre: string; pagos: number; volumenSol: string }>
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
        const r = await getMyBusinessesPaymentsMetrics(token, {
          sort: "volume",
          businessId,
        });
        if (cancelado) return;
        const ordenado = [...r.data]
          .filter((x) => x.paymentCount > 0)
          .sort((a, b) => {
            const va = BigInt(a.volumeLamports || "0");
            const vb = BigInt(b.volumeLamports || "0");
            if (vb > va) return 1;
            if (vb < va) return -1;
            return 0;
          })
          .slice(0, 12);
        setFilas(
          ordenado.map((x) => ({
            id: x.businessId,
            nombre: x.businessName,
            pagos: x.paymentCount,
            volumenSol: x.volumeSol,
          }))
        );
        setError(null);
      } catch (e) {
        if (cancelado) return;
        if (e instanceof PetsAppApiError) setError(e.message);
        else setError("No se pudo cargar el ranking.");
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
      <p className={estilos.tituloSeccion} role="alert" style={{ color: "var(--error, #b91c1c)" }}>
        {error}
      </p>
    );
  }

  if (cargando) {
    return <p className={estilos.tituloSeccion}>Cargando ranking…</p>;
  }

  if (filas.length === 0) {
    return (
      <p className={estilos.tituloSeccion} style={{ opacity: 0.8 }}>
        Aún no hay pagos registrados en tus negocios.
      </p>
    );
  }

  return (
    <div className={estilos.tablaWrapper}>
      <table className={estilos.tabla}>
        <thead>
          <tr>
            <th>Negocio</th>
            <th>Pagos</th>
            <th>Volumen (SOL)</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id}>
              <td className={estilos.idTransaccion}>{fila.nombre}</td>
              <td>{fila.pagos}</td>
              <td className={estilos.montoDestacado}>{fila.volumenSol}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
