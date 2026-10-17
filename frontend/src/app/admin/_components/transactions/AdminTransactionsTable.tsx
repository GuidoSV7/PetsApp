import Link from "next/link";

import {
  type DemoTransaction,
  transactionTypeLabels,
  formatDemoDateTime,
  getCustomerName,
} from "../../_data/adminAccountsDemoData";
import estilos from "./admin-transactions-table.module.css";

type Props = {
  filas: DemoTransaction[];
  /** En el registro global mostramos a que cliente pertenece cada fila. */
  mostrarColumnaCliente?: boolean;
  titulo?: string;
  subtitulo?: string;
};

function clasePorEstado(estado: DemoTransaction["estado"]) {
  switch (estado) {
    case "completado":
      return estilos.estadoCompletado;
    case "bloqueado":
      return estilos.estadoBloqueado;
    case "pendiente":
      return estilos.estadoPendiente;
    case "disputa":
      return estilos.estadoDisputa;
    default:
      return estilos.estadoPendiente;
  }
}

function labelEstado(estado: DemoTransaction["estado"]) {
  const mapa: Record<DemoTransaction["estado"], string> = {
    completado: "Completado",
    bloqueado: "Bloqueado",
    pendiente: "Pendiente",
    disputa: "Disputa",
  };
  return mapa[estado];
}

// Tabla de movimientos (demo) alineada a la logica escrow / Solana del producto.
export default function AdminTransactionsTable({
  filas,
  mostrarColumnaCliente = false,
  titulo = "Transacciones",
  subtitulo,
}: Props) {
  return (
    <section className={estilos.tarjetaTabla}>
      <div className={estilos.cabeceraSeccion}>
        <h2 className={estilos.tituloSeccion}>{titulo}</h2>
        {subtitulo ? <p className={estilos.subtituloSeccion}>{subtitulo}</p> : null}
      </div>
      {filas.length === 0 ? (
        <p className={estilos.vacio}>No hay transacciones para mostrar.</p>
      ) : (
        <div className={estilos.envoltorioTabla}>
          <table className={estilos.tabla}>
            <thead>
              <tr>
                <th>ID</th>
                {mostrarColumnaCliente ? <th>Cliente</th> : null}
                <th>Tipo</th>
                <th>Monto</th>
                <th>Activo</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id}>
                  <td className={estilos.idTx}>{fila.id}</td>
                  {mostrarColumnaCliente ? (
                    <td className={estilos.celdaMuted}>
                      <Link className={estilos.enlaceCliente} href={`/admin/customers/${fila.customerId}`}>
                        {getCustomerName(fila.customerId)}
                      </Link>
                    </td>
                  ) : null}
                  <td className={estilos.celdaMuted}>{transactionTypeLabels[fila.tipo]}</td>
                  <td className={estilos.monto}>{fila.monto}</td>
                  <td>{fila.activo}</td>
                  <td>
                    <span className={`${estilos.pillEstado} ${clasePorEstado(fila.estado)}`}>
                      {labelEstado(fila.estado)}
                    </span>
                  </td>
                  <td className={estilos.celdaMuted}>{formatDemoDateTime(fila.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
