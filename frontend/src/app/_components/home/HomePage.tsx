"use client";

import { useCallback, useEffect, useState } from "react";
import estilosHome from "../../home.module.css";
import HomeHeader from "./HomeHeader";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { FreighterSignInButton } from "@/features/auth/components/FreighterSignInButton";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import AuthDemoModal from "@/features/auth/components/AuthDemoModal";
import BrandMark from "@/components/ui/BrandMark";
import estilosAuth from "@/features/auth/components/auth-modal.module.css";
import {
  signInWithGoogle,
  signOutPetsAppUser,
} from "@/features/auth/api/auth.service";
import {
  clearSession,
  getPetsAppSession,
  savePetsAppSession,
  type PetsAppSessionData,
} from "@/stores/auth-session";
import { asPetsAppApiError } from "@/lib/errors";
import type { AuthModalMode } from "@/features/auth/types/auth.types";
import { isPollarConfigured } from "@/features/pollar/pollar-config";
import { PollarHomePage } from "@/features/pollar/PollarHomePage";

/** Home: Pollar gate when configured; Nest Google/email fallback otherwise. */
export default function HomePage() {
  if (isPollarConfigured()) {
    return <PollarHomePage />;
  }
  return <NestHomePage />;
}

/** Nest session gate: Google + Freighter (Freighter needs Pollar key to go live). */
function NestHomePage() {
  const [session, setSession] = useState<PetsAppSessionData | null>(null);
  const [ready, setReady] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailModal, setEmailModal] = useState<AuthModalMode | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setSession(getPetsAppSession());
    setReady(true);
  }, []);

  const onGoogleCredential = useCallback(async (idToken: string) => {
    setBusy(true);
    setAuthError(null);
    try {
      const data = await signInWithGoogle(idToken);
      savePetsAppSession(data);
      setSession(data);
    } catch (error) {
      setAuthError(asPetsAppApiError(error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const onLogout = async () => {
    setBusy(true);
    try {
      await signOutPetsAppUser().catch(() => undefined);
    } finally {
      clearSession();
      setSession(null);
      setCoins(null);
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className={estilosHome.contenedor}>
        <HomeHeader />
        <main className={estilosHome.main}>
          <p className={estilosHome.gateLoading} role="status">
            Cargando…
          </p>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={estilosHome.contenedor}>
        <HomeHeader />
        <main id="inicio" className={estilosHome.main}>
          <section className={estilosHome.gate} aria-label="Iniciar sesión">
            <div className={estilosHome.gateBrand}>
              <BrandMark size={48} />
              <h1 className={estilosHome.gateTitle}>PetsApp</h1>
              <p className={estilosHome.gateHint}>
                Iniciá sesión con Google, Freighter o email para cuidar a Michi.
              </p>
            </div>
            <div className={estilosAuth.authStack}>
              <GoogleSignInButton
                onCredential={(token) => void onGoogleCredential(token)}
                disabled={busy}
              />
              <FreighterSignInButton disabled={busy} />
            </div>
            {authError ? (
              <p className={estilosHome.gateError} role="alert">
                {authError}
              </p>
            ) : null}
            <button
              type="button"
              className={estilosHome.gateEmail}
              disabled={busy}
              onClick={() => setEmailModal("sign-in")}
            >
              Usar email y contraseña
            </button>
          </section>
        </main>
        <AuthDemoModal
          abierta={emailModal !== null}
          initialMode={emailModal ?? "sign-in"}
          onClose={() => {
            setEmailModal(null);
            setSession(getPetsAppSession());
          }}
        />
      </div>
    );
  }

  return (
    <div className={estilosHome.contenedor}>
      <HomeHeader
        coins={coins ?? undefined}
        userName={session.user.name}
        onLogout={() => void onLogout()}
      />

      <main id="inicio" className={estilosHome.main}>
        <PetHomeStage onCoinsChange={setCoins} />
      </main>
    </div>
  );
}
