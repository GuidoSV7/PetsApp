import { demoTransactionsSummary } from "../../_data/adminAccountsDemoData";
import estilos from "../customers/customers-kpi-cards.module.css";

// Resumen de movimientos para la pagina Transacciones (conteos demo).
export default function TransactionsKpiCards() {
  const { total, completadas, enCurso, disputas } = demoTransactionsSummary;

  return (
    <section className={estilos.gridTarjetas} data-purpose="admin-transacciones-kpis">
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Movimientos registrados</p>
        <h3 className={estilos.valorTarjeta}>{total}</h3>
        <p className={estilos.pieTarjeta}>Incluye pagos, escrow y liberaciones</p>
      </article>
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Completadas</p>
        <h3 className={estilos.valorTarjeta}>{completadas}</h3>
        <p className={estilos.pieTarjeta}>Fondos acreditados al destinatario</p>
      </article>
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>En curso</p>
        <h3 className={estilos.valorTarjeta}>{enCurso}</h3>
        <p className={estilos.pieTarjeta}>Bloqueadas o pendientes de firma</p>
      </article>
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Disputas</p>
        <h3 className={estilos.valorTarjeta}>{disputas}</h3>
        <p className={estilos.pieTarjeta}>Requieren mediación</p>
      </article>
    </section>
  );
}
