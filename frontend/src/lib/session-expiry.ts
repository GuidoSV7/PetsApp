import { clearSession } from "@/stores/auth-session";

let redirectEnCurso = false;

/**
 * Shared 401 handling (S8): clears the local session and sends the user to
 * the right entry (/login for admin routes, / otherwise). Skips the redirect
 * when already at the target so it can never loop.
 */
export function handleSessionExpired(): void {
  clearSession();
  if (typeof window === "undefined" || redirectEnCurso) return;
  const { pathname } = window.location;
  const target = pathname.startsWith("/admin") ? "/login" : "/";
  if (pathname === target) return;
  redirectEnCurso = true;
  window.location.assign(target);
}
