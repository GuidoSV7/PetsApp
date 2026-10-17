"use client";

import CentralAnalyticsContent from "../_components/analytics/CentralAnalyticsContent";
import DashboardHeader from "../_components/dashboard/DashboardHeader";
import DashboardKpiCards from "../_components/dashboard/DashboardKpiCards";

// Pagina Analitica: misma cabecera y KPIs que el panel; abajo graficos y tablas demo.
export default function PaginaAnalytics() {
  const exportarDatos = () => {
    const lineas = [
      "mes,ingresos_sol,transacciones,socios_activos,disputas",
      "Noviembre 2023,412850,1245,48,2",
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "compra-segura-analitica.csv";
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <DashboardHeader alExportar={exportarDatos} />
      <DashboardKpiCards />
      <CentralAnalyticsContent />
    </>
  );
}
