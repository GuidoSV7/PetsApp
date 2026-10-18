import { Agent, fetch as fetchUndici } from "undici";
import { isHardcodedAdminBearer } from "@/features/auth/hardcoded-admin";
import {
  internalApiOrigin,
  shouldSkipTlsVerification,
} from "@/lib/petsapp-api-origin";

/** Keep Nest profile checks snappy so uploads never hang on a dead upstream. */
export const ADMIN_PROFILE_TIMEOUT_MS = 3_000;

type ProfileUser = {
  role?: string;
  roles?: string[];
};

type ProfileResponse = {
  status: number;
  ok: boolean;
  json: () => Promise<unknown>;
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

type FetchProfile = (input: {
  destination: string;
  authorization: string;
  signal: AbortSignal;
}) => Promise<ProfileResponse>;

const defaultFetchProfile: FetchProfile = async ({
  destination,
  authorization,
  signal,
}) => {
  const init: Parameters<typeof fetchUndici>[1] = {
    method: "GET",
    headers: { Authorization: authorization },
    redirect: "manual",
    signal,
  };
  if (shouldSkipTlsVerification(destination)) {
    init.dispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }
  return fetchUndici(destination, init);
};

/** Validates Bearer JWT against Nest `/auth/profile` (admin/super_admin). */
export async function assertAdminBearer(
  authorization: string | null,
  options: {
    fetchProfile?: FetchProfile;
    timeoutMs?: number;
  } = {},
): Promise<AdminAuthResult> {
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      status: 401,
      message: "Authentication required",
    };
  }

  // Bootstrap panel session: never block on Nest/Traefik.
  if (isHardcodedAdminBearer(authorization)) {
    return { ok: true };
  }

  const timeoutMs = options.timeoutMs ?? ADMIN_PROFILE_TIMEOUT_MS;
  const fetchProfile = options.fetchProfile ?? defaultFetchProfile;
  const destination = `${internalApiOrigin()}/auth/profile`;
  const signal = AbortSignal.timeout(timeoutMs);

  try {
    const res = await fetchProfile({
      destination,
      authorization,
      signal,
    });
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
  } catch (err) {
    const timedOut =
      (err instanceof Error && err.name === "TimeoutError") ||
      (err instanceof Error && err.name === "AbortError");
    return {
      ok: false,
      status: 502,
      message: timedOut
        ? "El API no respondió a tiempo al verificar la sesión admin."
        : "No se pudo verificar la sesión admin contra el API",
    };
  }
}
