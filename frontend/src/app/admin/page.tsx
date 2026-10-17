"use client";

import Link from "next/link";

import AdminPageHeader from "./_components/shared/AdminPageHeader";
import estilos from "./_components/customers/customers-kpi-cards.module.css";

// Admin landing: placeholder dashboard pointing to the sections that exist today.
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
          <p className={estilos.nombreTarjeta}>Mascotas</p>
          <h3 className={estilos.valorTarjeta}>Próximamente</h3>
          <p className={estilos.pieTarjeta}>Métricas de mascotas registradas</p>
        </article>
      </section>
    </>
  );
}
