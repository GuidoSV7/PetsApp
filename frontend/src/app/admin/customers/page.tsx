"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  PetsAppApiError,
  listAdminUsers,
  type AdminUserResponse,
} from "../../_lib/petsapp-api";
import { clearSession, getSessionToken } from "../../demoAuth";
import AdminPageHeader from "../_components/shared/AdminPageHeader";
import CustomersListTable from "../_components/customers/CustomersListTable";
import CustomersKpiCards from "../_components/customers/CustomersKpiCards";
import AdminUserDetailModal from "../_components/customers/AdminUserDetailModal";
import estilosLista from "../_components/customers/customers-list.module.css";

const LIMITE_POR_PAGINA = 10;

// Member accounts: GET /admin/users (search optional); admins filtered client-side.
export default function CustomersPage() {
  const router = useRouter();
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<AdminUserResponse[]>([]);
  const [idUsuarioModal, setIdUsuarioModal] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const lista = await listAdminUsers(token);
      setUsuarios(lista.filter((u) => u.role === "member"));
    } catch (e) {
      if (e instanceof PetsAppApiError && e.codigoEstado === 401) {
        clearSession();
        router.replace("/");
        return;
      }
      if (e instanceof PetsAppApiError && e.codigoEstado === 403) {
        setError("No tenés permiso para ver usuarios.");
      } else {
        setError(e instanceof PetsAppApiError ? e.message : "No se pudo cargar el listado.");
      }
      setUsuarios([]);
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const usuariosFiltrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        u.userName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }, [consulta, usuarios]);

  const totalRegistros = usuariosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / LIMITE_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const usuariosPagina = useMemo(() => {
    const start = (paginaSegura - 1) * LIMITE_POR_PAGINA;
    return usuariosFiltrados.slice(start, start + LIMITE_POR_PAGINA);
  }, [paginaSegura, usuariosFiltrados]);

  useEffect(() => {
    if (pagina !== paginaSegura) setPagina(paginaSegura);
  }, [pagina, paginaSegura]);

  const exportarCsv = () => {
    const lineas = [
      "id,userName,email,role,country,isBlocked,isVerified",
      ...usuariosFiltrados.map(
        (u) =>
          `${u.id},"${u.userName.replace(/"/g, '""')}",${u.email},${u.role},${u.country ?? ""},${u.isBlocked},${u.isVerified}`,
      ),
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "petsapp-usuarios-admin.csv";
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AdminPageHeader
        alExportar={exportarCsv}
        titulo="Usuarios"
        subtitulo="Cuentas de miembros. Las cuentas administrador no aparecen en este listado."
      />
      {error ? (
        <p style={{ marginBottom: 16, color: "#b91c1c", fontWeight: 700 }}>{error}</p>
      ) : null}
      <CustomersKpiCards totalRegistros={totalRegistros} usuariosPagina={usuariosPagina} />
      <div className={estilosLista.barraHerramientas}>
        <input
          type="search"
          className={estilosLista.campoBusqueda}
          placeholder="Buscar por nombre, correo o ID…"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setPagina(1);
          }}
          aria-label="Buscar usuarios"
        />
        <div className={estilosLista.barraPaginacion}>
          <button
            type="button"
            className={estilosLista.botonPagina}
            disabled={paginaSegura <= 1 || cargando}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className={estilosLista.textoPagina}>
            Página {paginaSegura} de {totalPaginas}
            {cargando ? " · Cargando…" : ""}
          </span>
          <button
            type="button"
            className={estilosLista.botonPagina}
            disabled={paginaSegura >= totalPaginas || cargando}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
      <CustomersListTable
        usuarios={usuariosPagina}
        onVerDetalle={(idUsuario) => setIdUsuarioModal(idUsuario)}
      />

      {idUsuarioModal ? (
        <AdminUserDetailModal
          abierta={true}
          idUsuario={idUsuarioModal}
          onClose={() => {
            setIdUsuarioModal(null);
            void cargar();
          }}
          onListRefresh={() => void cargar()}
        />
      ) : null}
    </>
  );
}
