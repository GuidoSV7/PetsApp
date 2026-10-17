// Cliente HTTP hacia el backend PetsApp: login, registro, perfil y cuenta.
// Centraliza la URL base y el header Bearer para no repetir lógica en componentes.

import { PetsAppApiError } from "@/lib/errors";
import { petsappPublicClientUrl } from "@/lib/petsapp-api-origin";
import {
  signInPetsAppUser,
  obtenerPerfilAuth,
  obtenerUsuarioYo,
  registerPetsAppUser,
} from "@/features/auth/api/auth.service";
import type {
  LoginRegisterResponse,
  PetsAppApiRole,
  PetsAppUserResponse,
} from "@/features/auth/types/auth.types";

export { PetsAppApiError };
export {
  signInPetsAppUser,
  obtenerPerfilAuth,
  obtenerUsuarioYo,
  registerPetsAppUser,
};
export type { LoginRegisterResponse, PetsAppApiRole, PetsAppUserResponse };

export function getPetsAppBaseUrl() {
  return petsappPublicClientUrl();
}

export type ApiErrorBody = {
  message?: string;
  error?: string;
  statusCode?: number;
};

async function parsearError(respuesta: Response): Promise<never> {
  let cuerpo: unknown;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }
  const mensaje =
    typeof cuerpo === "object" &&
    cuerpo !== null &&
    "message" in cuerpo &&
    typeof (cuerpo as ApiErrorBody).message === "string"
      ? (cuerpo as ApiErrorBody).message!
      : respuesta.statusText || "Error de red";
  throw new PetsAppApiError(mensaje, respuesta.status, cuerpo);
}

function mensajeErrorRed(base: string, causa: unknown): string {
  const texto =
    causa instanceof Error ? causa.message : typeof causa === "string" ? causa : "";
  const esConexion =
    /failed to fetch|networkerror|load failed|connection refused|aborted/i.test(texto) ||
    texto === "";
  if (esConexion) {
    return `No se pudo conectar con el API (${base}). ¿Está el backend en marcha en ese puerto? (p. ej. npm run start:dev en la carpeta del servidor).`;
  }
  return `Error de red: ${texto || "desconocido"}`;
}

async function solicitudJson<T>(
  ruta: string,
  opciones: RequestInit & { token?: string }
): Promise<T> {
  const base = getPetsAppBaseUrl();
  const encabezados = new Headers(opciones.headers);
  if (!encabezados.has("Content-Type") && opciones.body !== undefined) {
    encabezados.set("Content-Type", "application/json");
  }
  if (opciones.token) {
    encabezados.set("Authorization", `Bearer ${opciones.token}`);
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}${ruta}`, {
      ...opciones,
      headers: encabezados,
    });
  } catch (causa) {
    throw new PetsAppApiError(mensajeErrorRed(base, causa), 0, causa);
  }

  if (!respuesta.ok) {
    await parsearError(respuesta);
  }

  if (respuesta.status === 204) {
    return undefined as T;
  }

  const texto = await respuesta.text();
  if (!texto) return undefined as T;
  return JSON.parse(texto) as T;
}

// Perfil / users/me: ver @/features/auth/api/auth.service (re-export arriba)

export async function updateCurrentUser(token: string, datos: { fullName: string }) {
  return solicitudJson<PetsAppUserResponse>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify({ fullName: datos.fullName.trim() }),
  });
}

export async function deleteCurrentUserAccount(token: string, contrasena: string) {
  return solicitudJson<void>("/users/me", {
    method: "DELETE",
    token,
    body: JSON.stringify({ password: contrasena }),
  });
}

export async function changePetsAppPassword(
  token: string,
  contrasenaActual: string,
  contrasenaNueva: string
) {
  return solicitudJson<unknown>("/auth/change-password", {
    method: "POST",
    token,
    body: JSON.stringify({
      currentPassword: contrasenaActual,
      newPassword: contrasenaNueva,
    }),
  });
}

export async function verifyPetsAppPassword(token: string, contrasena: string) {
  return solicitudJson<unknown>("/auth/verify-password", {
    method: "POST",
    token,
    body: JSON.stringify({ password: contrasena }),
  });
}

// --- Panel admin: usuarios (listado paginado, detalle, rol/activo y alternar estado).

/** Interpreta el JSON del listado porque el backend puede devolver `data`, `users` o un arreglo plano. */
function normalizarListadoAdminUsuarios(
  crudo: unknown,
  paginaPedida: number,
  limitePedido: number
): {
  usuarios: PetsAppUserResponse[];
  total: number;
  pagina: number;
  limite: number;
} {
  if (Array.isArray(crudo)) {
    return {
      usuarios: crudo as PetsAppUserResponse[],
      total: crudo.length,
      pagina: paginaPedida,
      limite: limitePedido,
    };
  }
  if (crudo && typeof crudo === "object") {
    const o = crudo as Record<string, unknown>;
    const posibleLista = o.data ?? o.users ?? o.items;
    const usuarios = Array.isArray(posibleLista)
      ? (posibleLista as PetsAppUserResponse[])
      : [];
    const total =
      typeof o.total === "number"
        ? o.total
        : typeof o.totalItems === "number"
          ? o.totalItems
          : usuarios.length;
    const pagina = typeof o.page === "number" ? o.page : paginaPedida;
    const limite = typeof o.limit === "number" ? o.limit : limitePedido;
    return { usuarios, total, pagina, limite };
  }
  return { usuarios: [], total: 0, pagina: paginaPedida, limite: limitePedido };
}

export type AdminUserListFilters = {
  /** Si se indica, el API filtra por rol (p. ej. para excluir cuentas admin del listado). */
  role?: PetsAppApiRole;
  search?: string;
};

export async function listAdminUsers(
  token: string,
  pagina: number,
  limite: number,
  filtros?: AdminUserListFilters
) {
  const consulta = new URLSearchParams({
    page: String(pagina),
    limit: String(limite),
  });
  if (filtros?.role) consulta.set("role", filtros.role);
  if (filtros?.search) consulta.set("search", filtros.search);
  const crudo = await solicitudJson<unknown>(`/admin/users?${consulta.toString()}`, {
    method: "GET",
    token,
  });
  return normalizarListadoAdminUsuarios(crudo, pagina, limite);
}

export async function getAdminUserById(token: string, idUsuario: string) {
  return solicitudJson<PetsAppUserResponse>(`/admin/users/${encodeURIComponent(idUsuario)}`, {
    method: "GET",
    token,
  });
}

export async function updateAdminUser(
  token: string,
  idUsuario: string,
  datos: {
    role: PetsAppApiRole;
    isActive: boolean;
    email?: string;
    country?: string;
  }
) {
  const cuerpo: {
    role: PetsAppApiRole;
    isActive: boolean;
    email?: string;
    country?: string;
  } = {
    role: datos.role,
    isActive: datos.isActive,
  };
  if (typeof datos.email === "string") cuerpo.email = datos.email.trim();
  if (typeof datos.country === "string") cuerpo.country = datos.country.trim();

  return solicitudJson<PetsAppUserResponse>(`/admin/users/${encodeURIComponent(idUsuario)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(cuerpo),
  });
}

/** Alterna activo/inactivo en servidor (POST dedicado). */
export async function toggleAdminUserActive(token: string, idUsuario: string) {
  return solicitudJson<PetsAppUserResponse | void>(
    `/admin/users/${encodeURIComponent(idUsuario)}/toggle-active`,
    {
      method: "POST",
      token,
    }
  );
}

/** Marca un usuario como verificado en backend admin. */
export async function verifyAdminUser(token: string, idUsuario: string) {
  return solicitudJson<PetsAppUserResponse | void>(
    `/admin/users/${encodeURIComponent(idUsuario)}/verify`,
    {
      method: "POST",
      token,
    }
  );
}
