import { signOutPetsAppUser } from "@/features/auth/api/auth.service";
import { clearSession } from "@/stores/auth-session";

/** Shown when POST /auth/logout fails but local UI was cleared anyway (#82). */
export const LOGOUT_COOKIE_WARNING =
  "No pudimos cerrar la sesión en el servidor. Si recargás, puede que sigas adentro.";

const LOGOUT_COOKIE_PENDING_KEY = "petsapp_logout_cookie_pending";

export function markLogoutCookiePending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LOGOUT_COOKIE_PENDING_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

export function clearLogoutCookiePending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LOGOUT_COOKIE_PENDING_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function consumeLogoutCookiePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const pending = window.sessionStorage.getItem(LOGOUT_COOKIE_PENDING_KEY) === "1";
    if (pending) window.sessionStorage.removeItem(LOGOUT_COOKIE_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}

/**
 * Best-effort Nest cookie clear, then always drop the local session.
 * Returns whether the API logout succeeded (cookie may remain on failure).
 */
export async function signOutPetsAppAndClearLocal(): Promise<{
  cookieCleared: boolean;
}> {
  let cookieCleared = true;
  try {
    await signOutPetsAppUser();
  } catch {
    cookieCleared = false;
  }
  clearSession();
  if (!cookieCleared) {
    markLogoutCookiePending();
  } else {
    clearLogoutCookiePending();
  }
  return { cookieCleared };
}

/** Retry clearing the Nest cookie after a failed logout (local session already gone). */
export async function retrySignOutPetsAppCookie(): Promise<boolean> {
  try {
    await signOutPetsAppUser();
    clearLogoutCookiePending();
    return true;
  } catch {
    markLogoutCookiePending();
    return false;
  }
}
