import { NextRequest, NextResponse } from "next/server";
import { internalApiOrigin } from "@/lib/petsapp-api-origin";

/**
 * Server-side gate for /admin/** (S2): without a session cookie the request
 * never reaches the admin area, and the session's role is verified against
 * the internal API before entry. The client AdminLayout check stays as
 * defense in depth.
 */
const SESSION_COOKIES = ["__Host-petsapp_session", "petsapp_session"] as const;

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

function leerCookieSesion(req: NextRequest): { nombre: string; valor: string } | null {
  for (const nombre of SESSION_COOKIES) {
    const valor = req.cookies.get(nombre)?.value;
    if (valor) return { nombre, valor };
  }
  return null;
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const cookie = leerCookieSesion(req);
  if (!cookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const destino = `${internalApiOrigin().replace(/\/$/, "")}/auth/profile`;
  try {
    const res = await fetch(destino, {
      headers: { cookie: `${cookie.nombre}=${cookie.valor}` },
      cache: "no-store",
    });
    if (res.ok) {
      const perfil = (await res.json()) as { role?: string; roles?: string[] };
      const roles = [perfil.role, ...(perfil.roles ?? [])];
      if (roles.some((rol) => rol !== undefined && ADMIN_ROLES.has(rol))) {
        return NextResponse.next();
      }
    }
    return NextResponse.redirect(new URL("/account", req.url));
  } catch (error) {
    // Backend unavailable: let the request through. The API still enforces
    // @Roles(ADMIN) and the client AdminLayout check remains in depth.
    console.warn(
      "[proxy] No se pudo verificar el perfil del admin:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.next();
  }
}

export const config = {
  matcher: "/admin/:path*",
};
