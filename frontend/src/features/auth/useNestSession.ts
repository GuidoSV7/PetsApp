"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPetsAppSession, getSessionEpoch, invalidateSessionOwner, subscribeSession, type PetsAppSessionData } from "@/stores/auth-session";
import { hydrateNestSession, logoutNestSession } from "./session";

/** Both home branches and /account observe the same store, not a second auth authority. */
export function useNestSession() {
  const [session, setSession] = useState<PetsAppSessionData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const alive = useRef(false);
  const connecting = useRef(false);
  useEffect(() => {
    alive.current = true;
    const sync = () => { setSession(getPetsAppSession()); setEpoch(getSessionEpoch()); setReady(true); };
    const stop = subscribeSession(sync);
    void hydrateNestSession().then(() => {
      if (alive.current) { sync(); setError(null); }
    }).catch(() => {
      if (alive.current) {
        sync();
        if (!getPetsAppSession()) setError("Volvé a iniciar sesión para continuar.");
      }
    });
    return () => {
      alive.current = false; stop();
      if (connecting.current) invalidateSessionOwner();
    };
  }, []);

  const loginFreighter = useCallback(async () => {
    if (connecting.current) return;
    connecting.current = true; setBusy(true); setError(null);
    try {
      const { authenticateWithFreighter } = await import("@/features/stellar-auth/stellar-auth");
      if (alive.current) await authenticateWithFreighter();
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : "No pudimos conectar Freighter.");
    } finally {
      connecting.current = false;
      if (alive.current) setBusy(false);
    }
  }, []);
  const logout = useCallback(async () => {
    setError(null); setBusy(true);
    try { await logoutNestSession(); }
    finally { if (alive.current) setBusy(false); }
  }, []);
  return { session, epoch, ready, error, busy, loginFreighter, logout };
}
