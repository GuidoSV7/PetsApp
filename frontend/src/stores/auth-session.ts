export type SessionRole = "admin" | "merchant";

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: SessionRole;
  country: string;
  walletAddress: string | null;
  isVerified?: boolean;
  isActive?: boolean;
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
    if (
      !data?.token ||
      !data?.user?.email ||
      (data.user.role !== "admin" && data.user.role !== "merchant")
    ) {
      return null;
    }
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
