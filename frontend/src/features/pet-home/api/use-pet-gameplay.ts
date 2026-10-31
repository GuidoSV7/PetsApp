"use client";

import { useEffect, useRef, useState } from "react";
import { getPetsAppSession, getSessionEpoch, subscribeSession } from "@/stores/auth-session";
import { fetchPetState, isUuid, readGuestKey, retireGuestKey, type PetRequestTarget, type PetStateResponse } from "./pet.service";
import { claimPet, clearPetClaim, petClaimStatus, petFailure, petMode, readPetClaim, rememberPrivateOwner, savePetClaim, type PetChoice, type PetClaim } from "./account-pet";

type Work = (target?: PetRequestTarget) => Promise<PetStateResponse>;
type Lifecycle = { current: () => boolean; load: (manual?: boolean) => Promise<void>; choose: (choice: PetChoice) => Promise<void>; mutate: (work: Work, failure: string, bounce?: boolean) => Promise<void> };
const unavailable = "La mascota de tu cuenta no está disponible en este momento.";
const reauthenticate = "Volvé a iniciar sesión para continuar.";

/** One mounted owner generation gates every request, continuation and UI callback. */
export function usePetGameplay(ownerId: string | undefined, onState: (state: PetStateResponse, bounce?: boolean) => void) {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [retry, setRetry] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const callback = useRef(onState); callback.current = onState;
  const renderedOwner = useRef(ownerId); renderedOwner.current = ownerId;
  const lifecycle = useRef<Lifecycle | null>(null);
  useEffect(() => {
    const epoch = getSessionEpoch();
    const session = getPetsAppSession();
    const sessionId = session?.user.id;
    const controller = new AbortController();
    let mounted = true;
    let working = false;
    let pending: PetClaim | null = null;
    let stale = false;
    let confirmed = false;
    let rejected = false;
    setBlocked(false);
    const current = () => mounted && !controller.signal.aborted && getSessionEpoch() === epoch && renderedOwner.current === ownerId && getPetsAppSession()?.user.id === sessionId;
    const authorized = ownerId === sessionId;
    const mode = authorized ? petMode(session) : "unavailable";
    const target: PetRequestTarget | undefined = mode === "private" ? { private: true, signal: controller.signal } : undefined;
    const publish = (state: PetStateResponse, bounce = false) => { if (current()) callback.current(state, bounce); };
    const fail = (cause: unknown, fallback: string) => {
      if (!current()) return;
      const failure = petFailure(cause);
      stale = failure.code === "PET_CONFLICT_STALE" || failure.code === "PET_OPERATION_DECISION_MISMATCH";
      if (failure.status === 401 || failure.status === 403) { rejected = true; setBlocked(true); }
      setError(failure.status === 401 ? reauthenticate : failure.status === 503 ? unavailable : stale ? "El conflicto cambió. Revisalo manualmente antes de continuar." : fallback);
      setRetry(true);
    };
    const finishClaim = () => {
      if (!current() || !ownerId) return;
      rememberPrivateOwner(ownerId);
      retireGuestKey(pending?.guestKey ?? null);
      clearPetClaim(ownerId);
      pending = null; confirmed = true; setDialog(false);
    };
    const readCurrent = async () => {
      const state = await fetchPetState(target);
      publish(state);
    };
    const recover = async () => {
      if (!pending?.choice) return;
      if (pending.guestKey !== readGuestKey()) throw new Error("Device key changed; pending choice retained");
      const result = await petClaimStatus(pending.operationId, controller.signal);
      if (!current()) return;
      if (result.status !== "confirmed") {
        await claimPet({ operationId: pending.operationId, choice: pending.choice }, controller.signal);
        if (!current()) return;
      }
      finishClaim();
      await readCurrent();
    };
    const load = async (manual = false) => {
      if (!current() || working) return;
      working = true; setBusy(true); setError(null); setRetry(false); setDialog(false);
      try {
        if (!authorized) { setError(reauthenticate); return; }
        if (mode === "unavailable") { setError(session ? unavailable : reauthenticate); return; }
        if (mode === "private" && ownerId) rememberPrivateOwner(ownerId);
        if (mode === "guest" || confirmed) { await readCurrent(); return; }
        if (!ownerId) return;
        pending = readPetClaim(ownerId);
        if (stale && manual) { clearPetClaim(ownerId); pending = null; stale = false; }
        if (pending?.choice) { await recover(); return; }
        if (pending && !manual) { setRetry(true); return; }
        const guestKey = readGuestKey();
        // Retain the exact request key across awaits, even if this device changes it.
        pending = null;
        try {
          await claimPet(guestKey ? { guestKey } : {}, controller.signal);
          if (!current()) return;
          rememberPrivateOwner(ownerId); retireGuestKey(guestKey); clearPetClaim(ownerId); confirmed = true;
          await readCurrent();
        } catch (cause) {
          if (!current()) return;
          const failure = petFailure(cause);
          if (failure.status !== 409 || failure.code !== "PET_CONFLICT" || !failure.operationId || !isUuid(failure.operationId)) throw cause;
          pending = { ownerId, guestKey, operationId: failure.operationId };
          savePetClaim(pending); setDialog(true);
        }
      } catch (cause) { fail(cause, "No pudimos cargar a tu michi. Reintentá en un momento."); }
      finally { working = false; if (current()) setBusy(false); }
    };
    const choose = async (choice: PetChoice) => {
      if (!current() || working || !pending || pending.choice) return;
      working = true; setBusy(true); setError(null); setDialog(false);
      try {
        pending = { ...pending, choice };
        // Persist BEFORE sending. A lost response cannot erase an explicit decision.
        savePetClaim(pending);
        await claimPet({ operationId: pending.operationId, choice }, controller.signal);
        if (!current()) return;
        finishClaim(); await readCurrent();
      } catch (cause) { fail(cause, "No pudimos confirmar la elección. Reintentá para recuperar la misma operación."); }
      finally { working = false; if (current()) setBusy(false); }
    };
    const mutate = async (work: Work, failure: string, bounce = false) => {
      if (!current() || working || rejected || mode === "unavailable") return;
      working = true; setBusy(true);
      try { const state = await work(target); if (current()) { publish(state, bounce); setError(null); } }
      catch (cause) { fail(cause, failure); }
      finally { working = false; if (current()) setBusy(false); }
    };
    lifecycle.current = { current, load, choose, mutate };
    const stop = subscribeSession(() => {
      if (getSessionEpoch() !== epoch) { controller.abort(); setBusy(true); setDialog(false); setError(reauthenticate); setRetry(false); }
    });
    void load();
    return () => { mounted = false; controller.abort(); stop(); };
  }, [ownerId]);
  return {
    busy, blocked, error, dialog, retry,
    current: lifecycle.current?.current ?? (() => false),
    retryLoad: () => void lifecycle.current?.load(true),
    choose: (choice: PetChoice) => void lifecycle.current?.choose(choice),
    dismiss: () => { if (lifecycle.current?.current()) { setDialog(false); setRetry(true); } },
    mutate: (work: Work, failure: string, bounce?: boolean) => lifecycle.current?.mutate(work, failure, bounce),
  };
}
