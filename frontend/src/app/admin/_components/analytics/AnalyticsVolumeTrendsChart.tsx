"use client";

// Gráfico de líneas: demo (SOL+USDC) o datos reales del merchant (GET /metrics/my-payments/timeseries).
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

import estilos from "./central-analytics-content.module.css";
import { getSessionToken } from "../../../demoAuth";
import { PetsAppApiError, getMerchantPaymentSeries } from "../../../_lib/petsapp-api";

const opcionesComunes = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 10,
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: "#F3F4F6",
      },
      ticks: {
        font: {
          size: 10,
        },
      },
    },
  },
} as const;

type Props = {
  /** `demo`: datos de ejemplo. `merchant`: últimos días desde la API (solo tus negocios). */
  variant?: "demo" | "merchant";
  businessId?: string;
};

export default function AnalyticsVolumeTrendsChart({
  variant = "demo",
  businessId,
}: Props) {
  const referenciaCanvas = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = referenciaCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradienteSol = ctx.createLinearGradient(0, 0, 0, 300);
    gradienteSol.addColorStop(0, "rgba(153, 69, 255, 0.4)");
    gradienteSol.addColorStop(1, "rgba(153, 69, 255, 0)");

    const gradienteUsdc = ctx.createLinearGradient(0, 0, 0, 300);
    gradienteUsdc.addColorStop(0, "rgba(96, 165, 250, 0.4)");
    gradienteUsdc.addColorStop(1, "rgba(96, 165, 250, 0)");

    let cancelado = false;

    const destruir = () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };

    if (variant === "demo") {
      destruir();
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["01 ene", "05 ene", "10 ene", "15 ene", "20 ene", "25 ene", "30 ene"],
          datasets: [
            {
              label: "Volumen SOL",
              data: [450, 520, 480, 610, 590, 720, 680],
              borderColor: "#9945FF",
              backgroundColor: gradienteSol,
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 0,
              pointHoverRadius: 6,
            },
            {
              label: "Volumen USDC",
              data: [300, 350, 320, 450, 400, 550, 510],
              borderColor: "#60A5FA",
              backgroundColor: gradienteUsdc,
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 0,
              pointHoverRadius: 6,
            },
          ],
        },
        options: opcionesComunes,
      });
      return () => {
        destruir();
      };
    }

    void (async () => {
      const token = getSessionToken();
      if (!token) {
        if (cancelado) return;
        destruir();
        chartRef.current = new Chart(ctx, {
          type: "line",
          data: { labels: [], datasets: [] },
          options: opcionesComunes,
        });
        return;
      }
      try {
        const r = await getMerchantPaymentSeries(token, {
          groupBy: "day",
          buckets: 14,
          businessId,
        });
        if (cancelado) return;
        const labels = r.data.map((p) => {
          const d = new Date(p.bucketStart);
          return d.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });
        });
        const datos = r.data.map((p) => parseFloat(p.volumeSol) || 0);
        destruir();
        chartRef.current = new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Volumen SOL (escrow)",
                data: datos,
                borderColor: "#9945FF",
                backgroundColor: gradienteSol,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 6,
              },
            ],
          },
          options: opcionesComunes,
        });
      } catch (e) {
        if (cancelado) return;
        if (e instanceof PetsAppApiError) {
          console.warn("Serie merchant:", e.message);
        }
        destruir();
        chartRef.current = new Chart(ctx, {
          type: "line",
          data: { labels: [], datasets: [] },
          options: opcionesComunes,
        });
      }
    })();

    return () => {
      cancelado = true;
      destruir();
    };
  }, [variant, businessId]);

  return (
    <div className={estilos.contenedorCanvas}>
      <canvas ref={referenciaCanvas} />
    </div>
  );
}
