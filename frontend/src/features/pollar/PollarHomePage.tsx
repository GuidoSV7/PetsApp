"use client";

import { useEffect, useState } from "react";
import { WalletType } from "@pollar/core";
import { usePollar } from "@pollar/react";
import estilosHome from "@/app/home.module.css";
import HomeHeader from "@/app/_components/home/HomeHeader";
import BrandMark from "@/components/ui/BrandMark";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { LoginGateModal } from "@/features/pollar/LoginGateModal";
import { pollarDisplayName } from "@/features/pollar/pollar-display-name";
import { usePollarLoginBusy } from "@/features/pollar/usePollarLoginBusy";
import {
  LOGOUT_COOKIE_WARNING,
  consumeLogoutCookiePending,
  retrySignOutPetsAppCookie,
  signOutPetsAppAndClearLocal,
} from "@/features/auth/api/sign-out";
import { useOptionalNotification } from "@/app/_components/NotificationsProvider";

/** Home when Pollar is configured: modal gate, then pet stage. */
export function PollarHomePage() {
  const notify = useOptionalNotification();
  const { isAuthenticated, login, logout, wallet, getClient } = usePollar();
  const { busy, error, clearError } = usePollarLoginBusy();
  const [coins, setCoins] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [logoutCookiePending, setLogoutCookiePending] = useState(false);
  const [logoutRetryBusy, setLogoutRetryBusy] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (consumeLogoutCookiePending()) {
      setLogoutCookiePending(true);
    }
    setMounted(true);
  }, []);

  const userName = pollarDisplayName(getClient().getUserProfile(), wallet);

  const onLogout = () => {
    void (async () => {
      const { cookieCleared } = await signOutPetsAppAndClearLocal();
      setCoins(null);
      logout();
      if (!cookieCleared) {
        setLogoutCookiePending(true);
        notify?.showNotification(LOGOUT_COOKIE_WARNING);
      } else {
        setLogoutCookiePending(false);
      }
    })();
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

  if (!mounted) {
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

  if (!isAuthenticated) {
    return (
      <div className={estilosHome.contenedor}>
        <HomeHeader />
        {/* Nest-parity brand backdrop; document h1 lives in LoginGateModal (aria-modal). */}
        <main id="inicio" className={estilosHome.main}>
          <section className={estilosHome.gate} aria-hidden="true">
            <div className={estilosHome.gateBrand}>
              <BrandMark size={48} />
              <p className={estilosHome.gateTitle}>PetsApp</p>
              <p className={estilosHome.gateHint}>
                Entrá para cuidar a Michi.
              </p>
            </div>
          </section>
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
        </main>
        <LoginGateModal
          open
          busy={busy}
          error={error}
          onGoogle={() => {
            clearError();
            login({ provider: "google" });
          }}
          onFreighter={() => {
            clearError();
            login({ provider: WalletType.FREIGHTER });
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
        userName={userName}
        onLogout={onLogout}
      />
      <main id="inicio" className={estilosHome.main}>
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
        <PetHomeStage onCoinsChange={setCoins} />
      </main>
    </div>
  );
}
