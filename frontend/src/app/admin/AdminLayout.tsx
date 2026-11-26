// Layout for the whole `/admin` area (sidebar + content).
// Only `admin` and `super_admin` sessions get in; icons live in `public/iconos`.
"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import BrandMark from "@/components/ui/BrandMark";

import {
  fetchAuthProfile,
  signOutPetsAppUser,
} from "@/features/auth/api/auth.service";
import {
  clearSession,
  getPetsAppSession,
  isAdminRole,
  updateUserInSession,
} from "@/stores/auth-session";
import { iconMaskStyle } from "./_utils/iconMaskStyle";
import estilos from "./admin-styles.module.css";

type AdminNavItem = {
  href: string;
  label: string;
  iconSrc: string;
  isDashboard?: boolean;
};

const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Panel", iconSrc: "/iconos/icon-dashboard.svg", isDashboard: true },
  { href: "/admin/customers", label: "Usuarios", iconSrc: "/iconos/icon-usuarios.svg" },
  { href: "/admin/settings", label: "Configuración", iconSrc: "/iconos/icon-settings.svg" },
  { href: "/admin/design-3d", label: "Diseño 3D", iconSrc: "/iconos/icon-3d.svg" },
];

const MOBILE_NAV_MQ = "(max-width: 720px)";

const PROFILE_GATE_ERROR =
  "No pudimos confirmar tu sesión de administración. Probá de nuevo.";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const currentPath = usePathname();
  const router = useRouter();
  const [sessionReady, setSesionLista] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [navAbierta, setNavAbierta] = useState(false);
  /** Bumps when another tab clears/changes the session so the gate remounts (#23). */
  const [gateEpoch, setGateEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const kickNonAdmin = () => {
      void signOutPetsAppUser().catch(() => undefined);
      clearSession();
      setSesionLista(false);
      setProfileError(null);
      router.replace("/account");
    };

    const revalidateRole = async () => {
      const datos = getPetsAppSession();
      if (!datos) {
        setSesionLista(false);
        setProfileError(null);
        router.replace("/");
        return;
      }
      if (!isAdminRole(datos.user.role)) {
        setSesionLista(false);
        setProfileError(null);
        router.replace("/account");
        return;
      }
      // Do not paint admin chrome until the server confirms the role (#70).
      setProfileError(null);
      try {
        const profile = await fetchAuthProfile();
        if (cancelled) return;
        if (!profile || !isAdminRole(profile.role)) {
          kickNonAdmin();
          return;
        }
        updateUserInSession({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          roles: profile.roles,
          country: profile.country,
        });
        setSesionLista(true);
        setProfileError(null);
      } catch {
        if (cancelled) return;
        // 401 interceptor may already clear; re-check local gate.
        if (!getPetsAppSession()) {
          setSesionLista(false);
          setProfileError(null);
          router.replace("/");
          return;
        }
        setSesionLista(false);
        setProfileError(PROFILE_GATE_ERROR);
      }
    };

    void revalidateRole();

    const onStorage = () => {
      setGateEpoch((n) => n + 1);
      void revalidateRole();
    };

    const onFocus = () => {
      void revalidateRole();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, retryNonce]);

  useLayoutEffect(() => {
    if (!sessionReady) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [sessionReady]);

  useEffect(() => {
    setNavAbierta(false);
  }, [currentPath]);

  useEffect(() => {
    if (!navAbierta) return;
    const onKey = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setNavAbierta(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navAbierta]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const onChange = () => {
      if (!mq.matches) setNavAbierta(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const signOutAndLeave = () => {
    // Best effort: the cookie clear must not block leaving the admin area.
    void signOutPetsAppUser().catch(() => undefined);
    clearSession();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    router.push("/");
  };

  const isActive = (opcion: AdminNavItem) => {
    if (opcion.isDashboard) return currentPath === "/admin";
    return currentPath?.startsWith(opcion.href) ?? false;
  };

  useEffect(() => {
    const activo = document.activeElement;
    if (activo instanceof HTMLElement && activo.closest('[data-purpose="admin-sidebar"]')) {
      activo.blur();
    }
  }, [currentPath]);

  if (!sessionReady) {
    if (profileError) {
      return (
        <div className={estilos.gateEstado} data-purpose="admin-profile-gate-error">
          <p className={estilos.gateError} role="alert">
            {profileError}
          </p>
          <button
            type="button"
            className={estilos.botonReintentarGate}
            data-purpose="admin-profile-gate-retry"
            onClick={() => setRetryNonce((n) => n + 1)}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return (
      <div className={estilos.gateEstado} data-purpose="admin-profile-gate-loading">
        Comprobando sesión…
      </div>
    );
  }

  return (
    <div className={estilos.contenedor} key={gateEpoch}>
      <div className={estilos.barraMovil}>
        <button
          type="button"
          className={estilos.botonMenuMovil}
          aria-expanded={navAbierta}
          aria-controls="admin-sidebar-nav"
          data-purpose="admin-mobile-nav-toggle"
          onClick={() => setNavAbierta((abierta) => !abierta)}
        >
          {navAbierta ? "Cerrar menú" : "Menú"}
        </button>
        <span className={estilos.tituloMovil}>PetsApp Admin</span>
        <button
          type="button"
          className={estilos.botonLogoutMovil}
          onClick={signOutAndLeave}
          data-purpose="admin-logout-trigger-mobile"
        >
          Salir
        </button>
      </div>

      {navAbierta ? (
        <button
          type="button"
          className={estilos.fondoDrawer}
          aria-label="Cerrar menú de navegación"
          data-purpose="admin-mobile-nav-backdrop"
          onClick={() => setNavAbierta(false)}
        />
      ) : null}

      <aside
        id="admin-sidebar-nav"
        className={`${estilos.barra} ${navAbierta ? estilos.barraAbierta : ""}`}
        data-purpose="admin-sidebar"
      >
        <div className={estilos.sidebarHeader}>
          <div className={estilos.brandHeader}>
            <BrandMark className={estilos.brandLogo} size={40} />
            <div className={estilos.brandText}>
              <h2 className={estilos.titulo}>PetsApp</h2>
              <div className={estilos.subtitulo}>Panel de administración</div>
            </div>
          </div>
        </div>

        <nav
          className={`${estilos.navigation} ${estilos.sidebarNavScroll}`}
          aria-label="Secciones de administración"
        >
          {adminNavItems.map((opcion) => (
            <Link
              key={opcion.href}
              href={opcion.href}
              scroll
              className={`${estilos.enlace} ${isActive(opcion) ? estilos.primaryLink : ""}`}
              onClick={() => setNavAbierta(false)}
            >
              <span
                className={estilos.navIconMask}
                style={iconMaskStyle(opcion.iconSrc)}
                aria-hidden
              />
              <span className={estilos.navLinkLabel}>{opcion.label}</span>
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className={estilos.botonLogout}
          onClick={signOutAndLeave}
          data-purpose="admin-logout-trigger"
        >
          <span
            className={estilos.navIconMask}
            style={iconMaskStyle("/iconos/icon-cerrar-sesion.svg")}
            aria-hidden
          />
          <span className={estilos.textoLogout}>Cerrar sesión</span>
        </button>
      </aside>

      <main className={estilos.contenido} data-purpose="admin-main">
        {children}
      </main>
    </div>
  );
}
