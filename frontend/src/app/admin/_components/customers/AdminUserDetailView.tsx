"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  PetsAppApiError,
  updateAdminUser,
  toggleAdminUserBlock,
  getAdminUserById,
  type AdminUserResponse,
  type PetsAppApiRole,
} from "../../../_lib/petsapp-api";
import { useNotification } from "../../../_components/NotificationsProvider";
import { clearSession, getSessionToken } from "../../../demoAuth";
import estilos from "./customer-detail.module.css";

type Props = {
  idUsuario: string;
  modalMode?: boolean;
  onListRefresh?: () => void;
  mostrarConfiguracion?: boolean;
};

function blockedClass(blocked: boolean) {
  return blocked ? estilos.estadoSuspendido : estilos.estadoActivo;
}

function blockedLabel(blocked: boolean) {
  return blocked ? "Bloqueado" : "Activo";
}

function roleLabel(role: PetsAppApiRole) {
  if (role === "admin") return "Administrador";
  if (role === "super_admin") return "Super admin";
  return "Miembro";
}

function verifiedLabel(verified: boolean) {
  return verified ? "Verificado" : "Sin verificar";
}

function toggleBlockButtonLabel(blocked: boolean) {
  return blocked ? "Desbloquear cuenta" : "Bloquear cuenta";
}

// User detail: GET /admin/users/:id, PATCH name/email/country, POST toggle-block.
export default function AdminUserDetailView({
  idUsuario,
  modalMode = false,
  onListRefresh,
  mostrarConfiguracion = false,
}: Props) {
  const { showNotification } = useNotification();
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<AdminUserResponse | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [nombreEdit, setNombreEdit] = useState("");
  const [correoEdit, setCorreoEdit] = useState("");
  const [paisEdit, setPaisEdit] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [alternando, setAlternando] = useState(false);

  const aplicarUsuario = useCallback((u: AdminUserResponse) => {
    setUsuario(u);
    setNombreEdit(u.userName ?? "");
    setCorreoEdit(u.email ?? "");
    setPaisEdit(u.country ?? "");
  }, []);

  const recargar = useCallback(async () => {
    const token = getSessionToken();
    if (!token || !idUsuario) return;
    setCargando(true);
    setErrorCarga(null);
    try {
      const u = await getAdminUserById(token, idUsuario);
      aplicarUsuario(u);
    } catch (e) {
      if (e instanceof PetsAppApiError && e.codigoEstado === 401) {
        clearSession();
        router.replace("/");
        return;
      }
      const texto = e instanceof PetsAppApiError ? e.message : "No se pudo cargar el usuario.";
      setErrorCarga(texto);
      showNotification(texto);
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, [aplicarUsuario, idUsuario, router, showNotification]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const guardarCambios = useCallback(async () => {
    const token = getSessionToken();
    if (!token || !idUsuario) return;
    setGuardando(true);
    try {
      await updateAdminUser(token, idUsuario, {
        name: nombreEdit,
        email: correoEdit,
        country: paisEdit,
      });
      await recargar();
      showNotification("Cambios guardados.");
      onListRefresh?.();
    } catch (e) {
      if (e instanceof PetsAppApiError && e.codigoEstado === 401) {
        clearSession();
        router.replace("/");
        return;
      }
      showNotification(e instanceof PetsAppApiError ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }, [
    correoEdit,
    idUsuario,
    nombreEdit,
    onListRefresh,
    paisEdit,
    recargar,
    router,
    showNotification,
  ]);

  const ejecutarToggleBloqueo = useCallback(async () => {
    const token = getSessionToken();
    if (!token || !idUsuario) return;
    setAlternando(true);
    try {
      await toggleAdminUserBlock(token, idUsuario);
      await recargar();
      showNotification("Estado actualizado correctamente.");
      onListRefresh?.();
    } catch (e) {
      if (e instanceof PetsAppApiError && e.codigoEstado === 401) {
        clearSession();
        router.replace("/");
        return;
      }
      showNotification(e instanceof PetsAppApiError ? e.message : "No se pudo alternar el bloqueo.");
    } finally {
      setAlternando(false);
    }
  }, [idUsuario, onListRefresh, recargar, router, showNotification]);

  if (cargando && !usuario) {
    return (
      <div>
        <p style={{ fontWeight: 700 }}>Cargando usuario…</p>
        {!modalMode ? (
          <Link
            href="/admin/customers"
            className={estilos.enlaceVolver}
            style={{ marginTop: 12, display: "inline-block" }}
          >
            ← Volver al listado
          </Link>
        ) : null}
      </div>
    );
  }

  if (errorCarga || !usuario) {
    return (
      <div>
        <p style={{ marginBottom: 16, fontWeight: 700 }}>
          {errorCarga ?? "No encontramos este usuario."}
        </p>
        {!modalMode ? (
          <Link href="/admin/customers" className={estilos.enlaceVolver}>
            ← Volver al listado
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {!modalMode ? (
        <div className={estilos.barraVolver}>
          <Link className={estilos.enlaceVolver} href="/admin/customers">
            ← Volver a clientes
          </Link>
        </div>
      ) : null}

      <section className={estilos.tarjetaFicha} aria-labelledby="titulo-usuario">
        <h1 id="titulo-usuario" className={estilos.tituloFicha}>
          {usuario.userName}
        </h1>
        <p className={estilos.metaFicha}>
          <span className={`${estilos.pillEstado} ${blockedClass(usuario.isBlocked)}`}>
            {blockedLabel(usuario.isBlocked)}
          </span>
          {" · "}
          <span className={`${estilos.pillEstado} ${estilos.pillRol}`}>
            Rol actual: {roleLabel(usuario.role)}
          </span>
          {" · "}
          <span
            className={`${estilos.pillEstado} ${
              usuario.isVerified ? estilos.estadoActivo : estilos.estadoPendiente
            }`}
          >
            {verifiedLabel(usuario.isVerified)}
          </span>
        </p>

        <div className={estilos.gridDatos}>
          <div>
            <p className={estilos.labelCampo}>Nombre</p>
            {mostrarConfiguracion ? (
              <input
                id="nombre-usuario"
                className={estilos.inputTexto}
                type="text"
                value={nombreEdit}
                onChange={(e) => setNombreEdit(e.target.value)}
                placeholder="Nombre"
              />
            ) : (
              <p className={estilos.valorCampo}>{usuario.userName}</p>
            )}
          </div>
          <div>
            <p className={estilos.labelCampo}>Correo</p>
            {mostrarConfiguracion ? (
              <input
                id="correo-usuario"
                className={estilos.inputTexto}
                type="email"
                value={correoEdit}
                onChange={(e) => setCorreoEdit(e.target.value)}
                placeholder="correo@dominio.com"
              />
            ) : (
              <p className={estilos.valorCampo}>{usuario.email}</p>
            )}
          </div>
          <div>
            <p className={estilos.labelCampo}>ID</p>
            <p className={estilos.valorCampo}>{usuario.id}</p>
          </div>
          <div>
            <p className={estilos.labelCampo}>País</p>
            {mostrarConfiguracion ? (
              <input
                id="pais-usuario"
                className={estilos.inputTexto}
                value={paisEdit}
                onChange={(e) => setPaisEdit(e.target.value)}
                placeholder="BO"
                maxLength={2}
              />
            ) : (
              <p className={estilos.valorCampo}>{usuario.country ?? "—"}</p>
            )}
          </div>
        </div>

        {mostrarConfiguracion ? (
          <div className={estilos.formularioAdmin}>
            <div className={estilos.filaBotonesAccion}>
              <button
                type="button"
                className={estilos.botonGuardar}
                disabled={guardando}
                onClick={() => void guardarCambios()}
              >
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                className={`${estilos.botonAlternar} ${
                  usuario.isBlocked ? estilos.botonActivar : estilos.botonDesactivar
                }`}
                disabled={alternando}
                onClick={() => void ejecutarToggleBloqueo()}
              >
                {alternando ? "Procesando…" : toggleBlockButtonLabel(usuario.isBlocked)}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
