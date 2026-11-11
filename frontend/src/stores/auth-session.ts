import type { PetsAppApiRole } from "@/features/auth/types/auth.types";

export type SessionRole = PetsAppApiRole;

const SESSION_ROLES: readonly SessionRole[] = ["admin", "super_admin", "member"];

/** Roles allowed into the `/admin` area (super admin outranks admin). */
const ADMIN_ROLES: readonly SessionRole[] = ["admin", "super_admin"];

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: SessionRole;
  roles: SessionRole[];
  country: string | null;
  /** Not issued by the API today; kept optional for a future wallet link. */
  walletAddress?: string | null;
};

export type PetsAppSessionData = {
  token: string;
  user: SessionUser;
};

const SESSION_KEY = "petsapp_session_v1";
const LEGACY_SESSION_KEY = "petsapp_sesion_v1";

/**
 * The JWT never reaches storage (S1): it lives only in this per-tab memory
 * slot. The API's HttpOnly session cookie is the durable credential.
 */
let memoriaToken: string | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isSessionRole(value: unknown): value is SessionRole {
  return typeof value === "string" && (SESSION_ROLES as readonly string[]).includes(value);
}

export function isAdminRole(role: SessionRole | undefined | null): boolean {
  return role !== undefined && role !== null && ADMIN_ROLES.includes(role);
}

/** Where a user lands right after signing in. */
export function landingPathForRole(role: SessionRole): string {
  return isAdminRole(role) ? "/admin" : "/";
}

type StoredSession = { token?: unknown; user?: unknown };

function esUsuarioValido(user: unknown): user is SessionUser {
  return (
    typeof user === "object" &&
    user !== null &&
    typeof (user as SessionUser).email === "string" &&
    isSessionRole((user as SessionUser).role)
  );
}

/** Persists the user only; the token stays in this tab's memory. */
function persistirSoloUsuario(user: SessionUser, origen: string | null) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
  if (origen && origen !== SESSION_KEY) {
    window.localStorage.removeItem(origen);
  }
}

function leerAlmacenamiento(): { user: SessionUser } | null {
  const origen =
    window.localStorage.getItem(SESSION_KEY) !== null
      ? SESSION_KEY
      : window.localStorage.getItem(LEGACY_SESSION_KEY) !== null
        ? LEGACY_SESSION_KEY
        : null;
  if (!origen) return null;
  try {
    const data = JSON.parse(window.localStorage.getItem(origen) ?? "") as StoredSession;
    if (!esUsuarioValido(data?.user)) return null;
    // Tombstone for sessions created by the retired browser-local constructor.
    if (data.user.id === "hardcoded-admin") return null;
    // Legacy persisted token: drop it, keep the user (S1 migration on read).
    if (typeof data.token === "string" && data.token.length > 0) {
      persistirSoloUsuario(data.user, origen);
    } else if (origen !== SESSION_KEY) {
      persistirSoloUsuario(data.user, origen);
    }
    return { user: data.user };
  } catch {
    return null;
  }
}

export function savePetsAppSession(data: PetsAppSessionData) {
  if (typeof window === "undefined") return;
  memoriaToken = data.token || null;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ user: data.user }));
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getPetsAppSession(): PetsAppSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const guardado = leerAlmacenamiento();
    if (!guardado) return null;
    return { token: memoriaToken ?? "", user: guardado.user };
  } catch {
    return null;
  }
}

export function getSessionToken(): string | null {
  return memoriaToken;
}

export function updateUserInSession(user: SessionUser) {
  const current = getPetsAppSession();
  if (!current) return;
  savePetsAppSession({ token: current.token, user });
}

export function clearSession() {
  if (typeof window === "undefined") return;
  memoriaToken = null;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function getSession(): { email: string; role: SessionRole } | null {
  const s = getPetsAppSession();
  if (!s) return null;
  return { email: normalizeEmail(s.user.email), role: s.user.role };
}
