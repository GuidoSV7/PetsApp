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

export function savePetsAppSession(data: PetsAppSessionData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getPetsAppSession(): PetsAppSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ??
      window.localStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PetsAppSessionData;
    if (!data?.token || !data?.user?.email || !isSessionRole(data.user.role)) {
      return null;
    }
    // Tombstone for sessions created by the retired browser-local constructor.
    if (data.user.id === "hardcoded-admin") return null;
    return data;
  } catch {
    return null;
  }
}

export function getSessionToken(): string | null {
  return getPetsAppSession()?.token ?? null;
}

export function updateUserInSession(user: SessionUser) {
  const current = getPetsAppSession();
  if (!current) return;
  savePetsAppSession({ token: current.token, user });
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function getSession(): { email: string; role: SessionRole } | null {
  const s = getPetsAppSession();
  if (!s) return null;
  return { email: normalizeEmail(s.user.email), role: s.user.role };
}
