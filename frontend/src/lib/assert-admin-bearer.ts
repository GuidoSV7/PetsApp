import { Agent, fetch as fetchUndici } from "undici";
import {
  internalApiOrigin,
  shouldSkipTlsVerification,
} from "@/lib/petsapp-api-origin";

type ProfileUser = {
  role?: string;
  roles?: string[];
};

function isAdminRole(user: ProfileUser): boolean {
  const roles = user.roles?.length
    ? user.roles
    : user.role
      ? [user.role]
      : [];
  return roles.includes("admin") || roles.includes("super_admin");
}

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/** Validates Bearer JWT against Nest `/auth/profile` (admin/super_admin). */
export async function assertAdminBearer(
  authorization: string | null,
): Promise<AdminAuthResult> {
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      status: 401,
      message: "Authentication required",
    };
  }

  const destination = `${internalApiOrigin()}/auth/profile`;
  const init: Parameters<typeof fetchUndici>[1] = {
    method: "GET",
    headers: { Authorization: authorization },
    redirect: "manual",
  };
  if (shouldSkipTlsVerification(destination)) {
    init.dispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }

  try {
    const res = await fetchUndici(destination, init);
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        status: res.status,
        message:
          "Sesión admin inválida. Entrá de nuevo en /login con credenciales Nest.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: 502,
        message: "No se pudo verificar la sesión admin contra el API",
      };
    }
    const user = (await res.json()) as ProfileUser;
    if (!isAdminRole(user)) {
      return {
        ok: false,
        status: 403,
        message: "Se requiere rol admin",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      status: 502,
      message: "No se pudo verificar la sesión admin contra el API",
    };
  }
}
