"use client";

import { useCallback, useEffect, useState } from "react";
import estilosHome from "../../home.module.css";
import HomeHeader from "./HomeHeader";
import { usePetCoins } from "@/features/pet-home/api/use-pet-coins";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { FreighterSignInButton } from "@/features/auth/components/FreighterSignInButton";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import AuthDemoModal from "@/features/auth/components/AuthDemoModal";
import BrandMark from "@/components/ui/BrandMark";
import estilosAuth from "@/features/auth/components/auth-modal.module.css";
import { signInWithGoogle } from "@/features/auth/api/auth.service";
import { getSessionEpoch, savePetsAppSession } from "@/stores/auth-session";
import { useNestSession } from "@/features/auth/useNestSession";
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

/** Nest session gate: email/Google plus independent, lazy Freighter proof. */
function NestHomePage() {
  const { session, epoch, ready, error: sessionError, busy: walletBusy, loginFreighter, logout } = useNestSession();
  const { coins, onCoinsChange, clearCoins } = usePetCoins(session?.user.id, epoch);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailModal, setEmailModal] = useState<AuthModalMode | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const onGoogleCredential = useCallback(async (idToken: string) => {
    setBusy(true);
    setAuthError(null);
    const owner = getSessionEpoch();
    try {
      const data = await signInWithGoogle(idToken);
      if (getSessionEpoch() !== owner) return;
      savePetsAppSession(data);
    } catch (error) {
      setAuthError(asPetsAppApiError(error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const onLogout = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      clearCoins();
      setBusy(false);
    }
  };

  if (!ready || walletBusy) {
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
                Si ya tenés una cuenta con email, ingresá con email y vinculá Freighter desde /account.
              </p>
            </div>
            <div className={estilosAuth.authStack}>
              <GoogleSignInButton
                onCredential={(token) => void onGoogleCredential(token)}
                disabled={busy || walletBusy}
              />
              <FreighterSignInButton disabled={busy || walletBusy} onConnect={() => void loginFreighter()} />
            </div>
            {authError || sessionError ? (
              <p className={estilosHome.gateError} role="alert">
                {authError ?? sessionError}
              </p>
            ) : null}
            <button
              type="button"
              className={estilosHome.gateEmail}
              disabled={busy || walletBusy}
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
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${estilosHome.contenedor} ${estilosHome.contenedorPlay}`}
      data-home-theme="room"
    >
      <HomeHeader
        coins={coins ?? undefined}
        userName={session.user.name}
        onLogout={() => void onLogout()}
      />

      <main id="inicio" className={estilosHome.main}>
        <PetHomeStage key={`${session.user.id}:${epoch}`} ownerId={session.user.id} onCoinsChange={onCoinsChange} />
      </main>
    </div>
  );
}
