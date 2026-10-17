"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import estilosEncabezados from "../dashboard-section-headers.module.css";
import estilos from "./dashboard-profitability-section.module.css";
import MerchantEscrowMetricsTable from "./MerchantEscrowMetricsTable";
import { getSessionToken } from "../../../demoAuth";
import {
  PetsAppApiError,
  getAdminMerchantsDistribution,
  type AdminMerchantsDistributionResponse,
} from "../../../_lib/petsapp-api";

const COLORES_DONUT = ["#f97316", "#3b82f6", "#10b981", "#a855f7"] as const;

function gradienteConico(d: AdminMerchantsDistributionResponse | null): string {
  if (!d) return "#e5e7eb";
  const counts = [d.altoValor, d.medio, d.bajoVolumen, d.nuevos];
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return "#e5e7eb";
  let acc = 0;
  const parts = counts.map((n, i) => {
    const deg = (n / total) * 360;
    const start = acc;
    acc += deg;
    return `${COLORES_DONUT[i]} ${start}deg ${acc}deg`;
  });
  return `conic-gradient(from 0deg, ${parts.join(", ")})`;
}

// Rentabilidad por socio: tabla real + donut distribución (API).
export default function DashboardProfitabilitySection() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dist, setDist] = useState<AdminMerchantsDistributionResponse | null>(null);

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
        const r = await getAdminMerchantsDistribution(token);
        if (cancelado) return;
        setDist(r);
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
  }, []);

  const fondoDonut = useMemo(() => gradienteConico(dist), [dist]);

  const leyenda = dist
    ? [
        { color: COLORES_DONUT[0], label: "Alto valor", n: dist.altoValor },
        { color: COLORES_DONUT[1], label: "Medio", n: dist.medio },
        { color: COLORES_DONUT[2], label: "Bajo volumen", n: dist.bajoVolumen },
        { color: COLORES_DONUT[3], label: "Nuevos", n: dist.nuevos },
      ]
    : [];

  return (
    <section className={estilos.filaRentabilidad}>
      <div className={estilos.tarjetaAncha}>
        <div className={estilosEncabezados.cabeceraTarjetaAncha}>
          <div>
            <h2 className={estilosEncabezados.tituloSeccion}>Rentabilidad por socio</h2>
            <p className={estilosEncabezados.subtituloSeccion}>
              Ranking por volumen en pagos escrow (API en vivo)
            </p>
          </div>
          <Link href="/admin/analytics" className={estilosEncabezados.enlaceSecundario}>
            Ver analítica completa
          </Link>
        </div>
        <div className={estilos.listaSocios}>
          <MerchantEscrowMetricsTable variant="embedded" />
        </div>
      </div>

      <div className={estilos.tarjetaDonut}>
        <h2 className={estilosEncabezados.tituloSeccion}>Distribución de socios</h2>
        {error ? (
          <p style={{ color: "var(--error, #b91c1c)", fontSize: "0.85rem" }} role="alert">
            {error}
          </p>
        ) : null}
        <div className={estilos.contenedorDonut}>
          <div
            className={estilos.donutVisual}
            style={{ background: fondoDonut }}
          >
            <div className={estilos.donutCentro}>
              <p className={estilos.numeroDonut}>
                {cargando ? "…" : dist ? dist.totalMerchants : "—"}
              </p>
              <p className={estilos.textoDonut}>Socios</p>
            </div>
          </div>
        </div>
        <div className={estilos.leyendaDonut}>
          {cargando
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={estilos.itemLeyenda}>
                  <span className={estilos.puntoLeyenda} style={{ background: "#e5e7eb" }} />
                  <span>…</span>
                </div>
              ))
            : leyenda.map((item) => (
                <div key={item.label} className={estilos.itemLeyenda}>
                  <span
                    className={estilos.puntoLeyenda}
                    style={{ background: item.color }}
                  />
                  <span>
                    {item.label} ({item.n})
                  </span>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
