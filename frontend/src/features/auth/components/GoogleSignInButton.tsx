"use client";

import { useEffect, useRef, useState } from "react";
import estilos from "./auth-modal.module.css";
import {
  googleClientId,
  isGoogleSignInConfigured,
} from "@/features/auth/google-auth-config";

const GIS_SRC = "https://accounts.google.com/gsi/client";

type Props = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            ux_mode?: string;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              shape?: string;
              text?: string;
              width?: number;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${GIS_SRC}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("GIS")), {
        once: true,
      });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Sign-In"));
    document.head.appendChild(script);
  });
}

/** Google Identity Services button → ID token callback. */
export function GoogleSignInButton({ onCredential, disabled }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = googleClientId();

  useEffect(() => {
    if (!clientId || disabled) return;
    let cancelled = false;

    void (async () => {
      try {
        await loadGisScript();
        if (cancelled || !hostRef.current || !window.google?.accounts?.id) {
          return;
        }
        hostRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) onCredential(response.credential);
          },
          auto_select: false,
          ux_mode: "popup",
        });
        window.google.accounts.id.renderButton(hostRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 320,
          locale: "es",
        });
        setError(null);
      } catch {
        if (!cancelled) {
          setError("No pudimos cargar el botón de Google.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, onCredential]);

  if (!isGoogleSignInConfigured()) {
    return (
      <button
        type="button"
        className={estilos.googleSoon}
        disabled
        aria-disabled="true"
        aria-label="Google — Próximamente"
      >
        <span className={estilos.googleSoonIcon} aria-hidden="true">
          <GoogleGlyph />
        </span>
        <span className={estilos.googleSoonLabel}>Próximamente</span>
      </button>
    );
  }

  return (
    <div className={estilos.googleWrap}>
      <div
        ref={hostRef}
        className={estilos.googleHost}
        aria-label="Continuar con Google"
      />
      {error ? (
        <p className={estilos.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
