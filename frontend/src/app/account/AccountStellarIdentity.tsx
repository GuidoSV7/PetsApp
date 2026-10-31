"use client";

import { useEffect, useRef, useState } from "react";
import { authenticateWithFreighter, fetchStellarIdentity, type StellarIdentity } from "@/features/stellar-auth/stellar-auth";
import { getPetsAppSession, getSessionEpoch, type SessionUser } from "@/stores/auth-session";

export function AccountStellarIdentity({ user }: { user: SessionUser }) {
  const [identity, setIdentity] = useState<StellarIdentity | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    const epoch = getSessionEpoch();
    void fetchStellarIdentity().then((result) => {
      if (alive.current && getSessionEpoch() === epoch) { setIdentity(result.identity); setLoaded(true); }
    }).catch((cause) => {
      if (alive.current && getSessionEpoch() === epoch) setError(cause instanceof Error ? cause.message : "No pudimos consultar la identidad Stellar.");
    });
    return () => { alive.current = false; };
  }, [user.id]);

  const link = async () => {
    if (busy || !loaded) return;
    setBusy(true); setError(null);
    const request = authenticateWithFreighter({ purpose: "link", ...(user.email !== null ? { password } : {}) });
    const epoch = getSessionEpoch();
    try {
      const result = await request;
      if (alive.current && getSessionEpoch() === epoch && getPetsAppSession()?.user.id === user.id && result) setIdentity(result.identity);
    } catch (cause) {
      if (alive.current && getSessionEpoch() === epoch) setError(cause instanceof Error ? cause.message : "No pudimos vincular Freighter.");
    } finally {
      if (alive.current) { setBusy(false); setPassword(""); }
    }
  };
  return (
    <section aria-label="Identidad Stellar" style={{ marginBottom: 20 }}>
      <h2>Freighter · testnet</h2>
      {identity ? <p style={{ overflowWrap: "anywhere" }}>{identity.address}</p> : (
        <>
          <p>{loaded ? "Sin vínculo Stellar." : "Consultando identidad Stellar…"}</p>
          <p>Para vincular, volvé a ingresar si pasaron 5 minutos. Comprobar la contraseña no renueva ese plazo.</p>
          {user.email !== null ? (
            <label>Contraseña actual
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
            </label>
          ) : null}
          <button type="button" onClick={() => void link()} disabled={!loaded || busy || (user.email !== null && !password)}>
            {busy ? "Vinculando…" : "Vincular Freighter"}
          </button>
        </>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
