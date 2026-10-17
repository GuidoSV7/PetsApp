"use client";

import DashboardHeader from "./_components/dashboard/DashboardHeader";
import RevenueBarChart from "./_components/dashboard/RevenueBarChart";
import TransactionVolumeChart from "./_components/dashboard/TransactionVolumeChart";
import DashboardProfitabilitySection from "./_components/dashboard/DashboardProfitabilitySection";
import DashboardKpiCards from "./_components/dashboard/DashboardKpiCards";
import estilosLayout from "./_components/layout-dashboard.module.css";

// Pagina principal del admin: KPIs y gráficos conectados al API (series + métricas escrow).
export default function PaginaAdmin() {
  const exportarDatos = () => {
    const lineas = [
      "mes,ingresos_sol,transacciones,socios_activos,disputas",
      "Noviembre 2023,412850,1245,48,2",
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "compra-segura-dashboard.csv";
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <DashboardHeader alExportar={exportarDatos} />
      <DashboardKpiCards />
      <div className={estilosLayout.filaGraficos}>
        <RevenueBarChart />
        <TransactionVolumeChart />
      </div>
      <DashboardProfitabilitySection />
    </>
  );
}
