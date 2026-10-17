"use client";

import { useEffect, useState } from "react";
import { getSessionToken } from "../../../demoAuth";
import {
  PetsAppApiError,
  getMyBusinessesPaymentsMetrics,
} from "../../../_lib/petsapp-api";
import estilos from "./central-analytics-content.module.css";

type Fila = { id: string; nombre: string; volumenSol: string; porcentaje: string };

/** % del volumen total SOL por negocio (GET /metrics/my-businesses/payments). */
export default function MerchantBusinessVolumeDistribution({
  businessId,
}: {
  businessId?: string;
}) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);

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
        let total = 0n;
        for (const row of r.data) {
          total += BigInt(row.volumeLamports || "0");
        }
        const conVolumen = r.data.filter((x) => BigInt(x.volumeLamports || "0") > 0n);
        const ordenado = [...conVolumen].sort((a, b) => {
          const va = BigInt(a.volumeLamports || "0");
          const vb = BigInt(b.volumeLamports || "0");
          if (vb > va) return 1;
          if (vb < va) return -1;
          return 0;
        });
        const filasMap: Fila[] = ordenado.map((row) => {
          const vol = BigInt(row.volumeLamports || "0");
          let pct = "0";
          if (total > 0n) {
            const porMil = (vol * 1000n) / total;
            const ent = porMil / 10n;
            const dec = porMil % 10n;
            pct = dec === 0n ? `${ent}` : `${ent}.${dec}`;
          }
          return {
            id: row.businessId,
            nombre: row.businessName,
            volumenSol: row.volumeSol,
            porcentaje: `${pct}%`,
          };
        });
        setFilas(filasMap);
        setError(null);
      } catch (e) {
        if (cancelado) return;
        if (e instanceof PetsAppApiError) setError(e.message);
        else setError("No se pudo cargar la distribución.");
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
    return <p className={estilos.tituloSeccion}>Cargando distribución…</p>;
  }

  if (filas.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
        Sin volumen por negocio aún (creá pagos o QR).
      </p>
    );
  }

  return (
    <ul className={estilos.listaRegiones}>
      {filas.map((fila) => (
        <li key={fila.id} className={estilos.itemRegion}>
          <span className={estilos.nombreRegion}>{fila.nombre}</span>
          <span className={estilos.porcionRegion} title={`${fila.volumenSol} SOL`}>
            {fila.porcentaje}
          </span>
        </li>
      ))}
    </ul>
  );
}
