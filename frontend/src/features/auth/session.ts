import { fetchAuthProfile, signOutPetsAppUser } from "./api/auth.service";
import { clearSession, getPetsAppSession, getSessionEpoch, isSessionRole, savePetsAppSession, type PetsAppSessionData } from "@/stores/auth-session";
import { freighter } from "@/features/stellar-auth/freighter";
import { isWalletMember } from "@/features/stellar-auth/stellar-auth";

// A leftover HttpOnly cookie after offline logout must not auto-restore on navigation.
let loggedOutEpoch: number | undefined;

/** Local storage is only a hint; the server profile confirms the current owner. */
export async function hydrateNestSession(): Promise<PetsAppSessionData> {
  const epoch = getSessionEpoch();
  if (epoch === loggedOutEpoch) throw new Error("Volvé a iniciar sesión para continuar.");
  const previous = getPetsAppSession();
  try {
    const user = await fetchAuthProfile();
    if (getSessionEpoch() !== epoch) throw new Error("La sesión cambió. Volvé a iniciar sesión.");
    if (!user?.id || typeof user.name !== "string" || !isSessionRole(user.role) ||
        (previous?.token ? !user.email : !isWalletMember(user))) throw new Error("Volvé a iniciar sesión para continuar.");
    const session: PetsAppSessionData = previous?.token ? { ...previous, user } : { method: "stellar", token: null, user };
    savePetsAppSession(session);
    return session;
  } catch (error) {
    if (getSessionEpoch() === epoch) clearSession();
    throw error;
  }
}
export async function logoutNestSession() {
  // Invalidate immediately: an offline request must not leave an owner or pending proof live.
  let request: Promise<void> | undefined;
  try { request = signOutPetsAppUser(); } catch { /* best effort server cleanup */ }
  clearSession();
  loggedOutEpoch = getSessionEpoch();
  freighter.disconnect();
  try { await request; } catch { /* local cleanup already completed */ }
}
