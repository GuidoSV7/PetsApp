"use client";

import DashboardHeader from "../_components/dashboard/DashboardHeader";
import AdminTransactionsTable from "../_components/transactions/AdminTransactionsTable";
import TransactionsKpiCards from "../_components/transactions/TransactionsKpiCards";
import { recentTransactionsSorted } from "../_data/adminAccountsDemoData";

// Registro global de transacciones (demo) enlazado a clientes por id interno.
export default function TransactionsPage() {
  const filas = recentTransactionsSorted();

  const exportarCsv = () => {
    const lineas = [
      "id,id_cliente,tipo,monto,activo,estado,fecha",
      ...filas.map(
        (t) =>
          `${t.id},${t.customerId},${t.tipo},${t.monto},${t.activo},${t.estado},${t.fecha}`,
      ),
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "compra-segura-transacciones.csv";
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <DashboardHeader
        alExportar={exportarCsv}
        titulo="Transacciones"
        subtitulo="Historial de pagos y estados de escrow en la red Solana (datos de demostracion)."
      />
      <TransactionsKpiCards />
      <AdminTransactionsTable
        filas={filas}
        mostrarColumnaCliente
        titulo="Registro de movimientos"
        subtitulo="Cada fila es un movimiento tipo pasarela; el cliente enlaza con la ficha en Clientes."
      />
    </>
  );
}
