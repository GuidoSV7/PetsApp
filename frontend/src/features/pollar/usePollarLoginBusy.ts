"use client";

import { useEffect, useState } from "react";
import { usePollar } from "@pollar/react";
import type { AuthState } from "@pollar/core";

function isBusyStep(step: AuthState["step"]): boolean {
  return (
    step !== "idle" &&
    step !== "authenticated" &&
    step !== "error" &&
    step !== "entering_email" &&
    step !== "entering_code" &&
    step !== "wallet_not_installed"
  );
}

/**
 * Tracks Pollar login progress for the custom gate (Tinkazo-style fire-and-forget).
 */
export function usePollarLoginBusy() {
  const { getClient } = usePollar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return getClient().onAuthStateChange((state: AuthState) => {
      if (state.step === "error") {
        setBusy(false);
        setError(state.message || "No se pudo iniciar sesión");
        return;
      }
      if (state.step === "wallet_not_installed") {
        setBusy(false);
        setError("Instalá Freighter para conectar tu billetera Stellar.");
        return;
      }
      if (state.step === "authenticated" || state.step === "idle") {
        setBusy(false);
        if (state.step === "authenticated") setError(null);
        return;
      }
      setBusy(isBusyStep(state.step));
    });
  }, [getClient]);

  return {
    busy,
    error,
    clearError: () => setError(null),
  };
}
