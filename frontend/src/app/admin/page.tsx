"use client";

import Link from "next/link";

import AdminPageHeader from "./_components/shared/AdminPageHeader";
import estilos from "./_components/customers/customers-kpi-cards.module.css";

// Admin landing: cards for the sections that exist today.
export default function PaginaAdmin() {
  return (
    <>
      <AdminPageHeader
        titulo="Panel de administración"
        subtitulo="Resumen general de PetsApp"
      />
      <section className={estilos.gridTarjetas} data-purpose="admin-dashboard-cards">
        <article className={estilos.tarjeta}>
          <p className={estilos.nombreTarjeta}>Usuarios</p>
          <h3 className={estilos.valorTarjeta}>Gestión de cuentas</h3>
          <p className={estilos.pieTarjeta}>
            <Link href="/admin/customers">Ver listado de usuarios →</Link>
          </p>
        </article>
        <article className={estilos.tarjeta}>
          <p className={estilos.nombreTarjeta}>Configuración</p>
          <h3 className={estilos.valorTarjeta}>Marca pública</h3>
          <p className={estilos.pieTarjeta}>
            <Link href="/admin/settings" aria-label="Ir a configuración">
              Ir a configuración →
            </Link>
          </p>
        </article>
        <article className={estilos.tarjeta}>
          <p className={estilos.nombreTarjeta}>Diseño 3D</p>
          <h3 className={estilos.valorTarjeta}>Silueta de Michi</h3>
          <p className={estilos.pieTarjeta}>
            <Link href="/admin/design-3d" aria-label="Ir a diseño 3D">
              Ir a diseño 3D →
            </Link>
          </p>
        </article>
      </section>
    </>
  );
}
