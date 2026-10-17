import type { PetsAppUserResponse } from "../../../_lib/petsapp-api";
import estilos from "./customers-kpi-cards.module.css";

type Props = {
  totalRegistros: number;
  usuariosPagina: PetsAppUserResponse[];
};

// KPIs aligned with the non-admin user listing.
export default function CustomersKpiCards({ totalRegistros, usuariosPagina }: Props) {
  const activos = usuariosPagina.filter((u) => u.isActive !== false).length;
  const inactivos = usuariosPagina.length - activos;

  return (
    <section className={estilos.gridTarjetas} data-purpose="admin-clientes-kpis">
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Usuarios totales</p>
        <h3 className={estilos.valorTarjeta}>{totalRegistros}</h3>
        <p className={estilos.pieTarjeta}>Cuentas de usuario (sin administradores)</p>
      </article>
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Activos en esta página</p>
        <h3 className={estilos.valorTarjeta}>{activos}</h3>
        <p className={estilos.pieTarjeta}>Cuentas con acceso habilitado</p>
      </article>
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Inactivos en esta página</p>
        <h3 className={estilos.valorTarjeta}>{inactivos}</h3>
        <p className={estilos.pieTarjeta}>Cuentas deshabilitadas</p>
      </article>
    </section>
  );
}
