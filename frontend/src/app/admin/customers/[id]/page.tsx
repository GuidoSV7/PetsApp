"use client";

import { useParams } from "next/navigation";

import AdminUserDetailView from "../../_components/customers/AdminUserDetailView";

// Admin user detail: GET /admin/users/:id, PATCH profile fields, POST toggle-block.
export default function PaginaDetalleCliente() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  if (!id) {
    return <p style={{ fontWeight: 700 }}>ID no válido.</p>;
  }

  return <AdminUserDetailView idUsuario={id} mostrarConfiguracion />;
}
