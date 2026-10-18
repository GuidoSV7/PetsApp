import type { AdminUserResponse } from "../../../_lib/petsapp-api";
import estilos from "./customers-kpi-cards.module.css";

type Props = {
  totalRegistros: number;
  usuariosPagina: AdminUserResponse[];
};

// KPIs for the member listing page.
export default function CustomersKpiCards({ totalRegistros, usuariosPagina }: Props) {
  const activos = usuariosPagina.filter((u) => !u.isBlocked).length;
  const bloqueados = usuariosPagina.length - activos;
  const verificados = usuariosPagina.filter((u) => u.isVerified).length;

  return (
    <section className={estilos.gridTarjetas} data-purpose="admin-clientes-kpis">
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Usuarios totales</p>
        <h3 className={estilos.valorTarjeta}>{totalRegistros}</h3>
        <p className={estilos.pieTarjeta}>Cuentas miembro (sin administradores)</p>
      </article>
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Activos en esta página</p>
        <h3 className={estilos.valorTarjeta}>{activos}</h3>
        <p className={estilos.pieTarjeta}>Sin bloqueo</p>
      </article>
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Bloqueados en esta página</p>
        <h3 className={estilos.valorTarjeta}>{bloqueados}</h3>
        <p className={estilos.pieTarjeta}>Verificados: {verificados}</p>
      </article>
    </section>
  );
}
