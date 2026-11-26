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
  fetchAuthProfile,
  signInWithGoogle,
} from "@/features/auth/api/auth.service";
import {
  LOGOUT_COOKIE_WARNING,
  consumeLogoutCookiePending,
  retrySignOutPetsAppCookie,
  signOutPetsAppAndClearLocal,
} from "@/features/auth/api/sign-out";
import {
  clearSession,
  getPetsAppSession,
  savePetsAppSession,
  updateUserInSession,
  type PetsAppSessionData,
} from "@/stores/auth-session";
import { asPetsAppApiError } from "@/lib/errors";
import type { AuthModalMode } from "@/features/auth/types/auth.types";
import { isPollarConfigured } from "@/features/pollar/pollar-config";
import { PollarHomePage } from "@/features/pollar/PollarHomePage";
import { useOptionalNotification } from "@/app/_components/NotificationsProvider";

/** Home: Pollar gate when configured; Nest Google/email fallback otherwise. */
export default function HomePage() {
  if (isPollarConfigured()) {
    return <PollarHomePage />;
  }
  return <NestHomePage />;
}

/** Nest session gate: Google + Freighter (Freighter needs Pollar key to go live). */
function NestHomePage() {
  const notify = useOptionalNotification();
  const [session, setSession] = useState<PetsAppSessionData | null>(null);
  const [ready, setReady] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailModal, setEmailModal] = useState<AuthModalMode | null>(null);
  const [logoutCookiePending, setLogoutCookiePending] = useState(false);
  const [logoutRetryBusy, setLogoutRetryBusy] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (consumeLogoutCookiePending()) {
      setLogoutCookiePending(true);
    }
    let cancelled = false;

    const boot = async () => {
      const local = getPetsAppSession();
      if (!local) {
        if (!cancelled) {
          setSession(null);
          setReady(true);
        }
        return;
      }

      try {
        const profile = await fetchAuthProfile();
        if (cancelled) return;
        updateUserInSession({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          roles: profile.roles,
          country: profile.country,
        });
        setSession(getPetsAppSession());
      } catch (error) {
        if (cancelled) return;
        const status = asPetsAppApiError(error).codigoEstado;
        // 401 interceptor may already clear; force gate either way (#64).
        if (status === 401 || !getPetsAppSession()) {
          clearSession();
          setSession(null);
        } else {
          // Transient API failure: keep local cache so the user is not locked out.
          setSession(local);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void boot();

    // Cross-tab: another tab's clearSession/save updates localStorage (#23).
    const onStorage = () => {
      setSession(getPetsAppSession());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const onGoogleCredential = useCallback(async (idToken: string) => {
    setBusy(true);
    setAuthError(null);
    try {
      const data = await signInWithGoogle(idToken);
      savePetsAppSession(data);
      setSession(data);
      setLogoutCookiePending(false);
    } catch (error) {
      setAuthError(asPetsAppApiError(error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const onLogout = async () => {
    setBusy(true);
    try {
      const { cookieCleared } = await signOutPetsAppAndClearLocal();
      setSession(null);
      setCoins(null);
      if (!cookieCleared) {
        setLogoutCookiePending(true);
        notify?.showNotification(LOGOUT_COOKIE_WARNING);
      } else {
        setLogoutCookiePending(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const onRetryLogoutCookie = async () => {
    setLogoutRetryBusy(true);
    try {
      const ok = await retrySignOutPetsAppCookie();
      if (ok) {
        setLogoutCookiePending(false);
      } else {
        notify?.showNotification(LOGOUT_COOKIE_WARNING);
      }
    } finally {
      setLogoutRetryBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className={estilosHome.contenedor}>
        <HomeHeader />
        <main id="inicio" className={estilosHome.main}>
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
            {logoutCookiePending ? (
              <div className={estilosHome.gateError} role="alert">
                <p>{LOGOUT_COOKIE_WARNING}</p>
                <button
                  type="button"
                  className={estilosHome.gateEmail}
                  disabled={logoutRetryBusy}
                  onClick={() => void onRetryLogoutCookie()}
                >
                  Reintentar cierre de sesión
                </button>
              </div>
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
        <PetHomeStage onCoinsChange={setCoins} />
      </main>
    </div>
  );
}
