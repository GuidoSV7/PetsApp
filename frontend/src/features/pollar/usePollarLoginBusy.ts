"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePollar } from "@pollar/react";
import type { AuthState } from "@pollar/core";

/** Clears stuck Freighter/Pollar busy when the wallet popup never settles. */
export const POLLAR_LOGIN_BUSY_TIMEOUT_MS = 45_000;

const TIMEOUT_MESSAGE =
  "La conexión tardó demasiado. Si cerraste Freighter, intentá de nuevo.";
const CANCEL_MESSAGE = "Cancelaste el inicio de sesión.";

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

type BusyCanceller = () => void;

/** Active gate busy canceller so LoginGateModal can clear without parent wiring. */
let activeBusyCanceller: BusyCanceller | null = null;

/** Clears busy on the mounted Pollar login gate, if any. */
export function cancelActivePollarLoginBusy(): void {
  activeBusyCanceller?.();
}

/**
 * Tracks Pollar login progress for the custom gate (Tinkazo-style fire-and-forget).
 */
export function usePollarLoginBusy() {
  const { getClient } = usePollar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBusyTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancelBusy = useCallback(() => {
    clearBusyTimer();
    setBusy(false);
    setError(CANCEL_MESSAGE);
  }, [clearBusyTimer]);

  useEffect(() => {
    activeBusyCanceller = cancelBusy;
    return () => {
      if (activeBusyCanceller === cancelBusy) {
        activeBusyCanceller = null;
      }
    };
  }, [cancelBusy]);

  useEffect(() => {
    return () => {
      clearBusyTimer();
    };
  }, [clearBusyTimer]);

  useEffect(() => {
    return getClient().onAuthStateChange((state: AuthState) => {
      if (state.step === "error") {
        clearBusyTimer();
        setBusy(false);
        setError(state.message || "No se pudo iniciar sesión");
        return;
      }
      if (state.step === "wallet_not_installed") {
        clearBusyTimer();
        setBusy(false);
        setError("Instalá Freighter para conectar tu billetera Stellar.");
        return;
      }
      if (state.step === "authenticated" || state.step === "idle") {
        clearBusyTimer();
        setBusy(false);
        if (state.step === "authenticated") setError(null);
        return;
      }
      const nextBusy = isBusyStep(state.step);
      setBusy(nextBusy);
      if (nextBusy) {
        clearBusyTimer();
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          setBusy(false);
          setError(TIMEOUT_MESSAGE);
        }, POLLAR_LOGIN_BUSY_TIMEOUT_MS);
      } else {
        clearBusyTimer();
      }
    });
  }, [getClient, clearBusyTimer]);

  return {
    busy,
    error,
    clearError: () => setError(null),
    cancelBusy,
  };
}
