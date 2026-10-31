"use client";
import { useEffect, useRef } from "react";
import type { PetChoice } from "../api/account-pet";
import styles from "./pet-home.module.css";

/** One explicit choice, with native modal focus containment and Escape dismissal. */
export function PetClaimDialog({ choose, dismiss }: { choose: (choice: PetChoice) => void; dismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute("open", "");
    return () => dialog?.close?.();
  }, []);
  return <dialog ref={ref} className={styles.claimDialog} aria-labelledby="pet-claim-title" aria-describedby="pet-claim-explanation" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <h2 id="pet-claim-title">¿Qué mascota querés conservar?</h2>
    <p id="pet-claim-explanation">El otro gato quedará archivado para soporte y no estará disponible en la app.</p>
    <button type="button" onClick={() => choose("keep_account")}>Conservar el de mi cuenta</button>
    <button type="button" onClick={() => choose("keep_guest")}>Conservar el de este dispositivo</button>
    <button type="button" onClick={dismiss}>Ahora no</button>
  </dialog>;
}
