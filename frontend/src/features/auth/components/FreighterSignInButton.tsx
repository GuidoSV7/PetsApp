"use client";

import estilos from "./auth-modal.module.css";
import { isStellarConfigured } from "@/features/stellar-auth/config";

type Props = {
  /** Uses our independent Nest proof in either home branch. */
  onConnect?: () => void;
  disabled?: boolean;
};

/** Freighter availability depends on our public trust roots, never Pollar. */
export function FreighterSignInButton({ onConnect, disabled }: Props) {
  if (!isStellarConfigured()) {
    return (
      <button
        type="button"
        className={`${estilos.googleSoon} ${estilos.freighterSoon}`}
        disabled
        aria-disabled="true"
        aria-label="Freighter — Próximamente"
      >
        <span className={estilos.googleSoonIcon} aria-hidden="true">
          <WalletGlyph />
        </span>
        <span className={estilos.googleSoonLabel}>Freighter</span>
        <span className={estilos.soonBadge}>Próximamente</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${estilos.googleSoon} ${estilos.freighterReady}`}
      disabled={disabled}
      onClick={onConnect}
      aria-label="Conectar Freighter"
    >
      <span className={estilos.googleSoonIcon} aria-hidden="true">
        <WalletGlyph />
      </span>
      <span className={estilos.googleSoonLabel}>Freighter</span>
    </button>
  );
}

function WalletGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V9h1.5A1.5 1.5 0 0 1 22 10.5v7A1.5 1.5 0 0 1 20.5 19h-15A2.5 2.5 0 0 1 3 16.5v-9zm16 3.5h-2.2a1.3 1.3 0 1 0 0 2.6H19V11z"
      />
    </svg>
  );
}
