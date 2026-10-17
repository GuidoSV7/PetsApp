// Layout para todo el area `/admin` (barra lateral + contenido).
// Solo entra sesión con rol API `admin`; iconos en `public/iconos`.
"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { clearSession, getPetsAppSession } from "../demoAuth";
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
  // { href: "/admin/analytics", label: "Analítica", iconSrc: "/iconos/icon-analytics.svg" },
  { href: "/admin/transactions", label: "Transacciones", iconSrc: "/iconos/icon-transacciones.svg" },
  { href: "/admin/customers", label: "Clientes", iconSrc: "/iconos/icon-usuarios.svg" },
  { href: "/admin/settings", label: "Configuración", iconSrc: "/iconos/icon-settings.svg" },
];

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const currentPath = usePathname();
  const router = useRouter();
  const [sessionReady, setSesionLista] = useState(false);

  useEffect(() => {
    const datos = getPetsAppSession();
    if (!datos) {
      router.replace("/");
      return;
    }
    if (datos.user.role !== "admin") {
      router.replace("/");
      return;
    }
    setSesionLista(true);
  }, [router]);

  useLayoutEffect(() => {
    if (!sessionReady) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [sessionReady]);

  const signOutAndLeave = () => {
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
    return (
      <div className={estilos.contenedor} style={{ padding: 28, fontWeight: 700 }}>
        Comprobando sesión…
      </div>
    );
  }

  return (
    <div className={estilos.contenedor}>
      <aside className={estilos.barra} data-purpose="admin-sidebar">
        <div className={estilos.sidebarHeader}>
          <div className={estilos.brandHeader}>
            <Image
              className={estilos.logoSolana}
              src="/imagenes/logo1-solana.png"
              alt="Solana"
              width={40}
              height={40}
              priority
            />
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
