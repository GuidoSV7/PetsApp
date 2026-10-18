"use client";

import { useEffect, useRef, useState } from "react";
import estilos from "./auth-modal.module.css";

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
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

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

  if (!clientId) {
    return (
      <p className={estilos.error} role="alert">
        Falta configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID.
      </p>
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
