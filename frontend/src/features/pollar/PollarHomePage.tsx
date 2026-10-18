"use client";

import { useEffect, useState } from "react";
import { WalletType } from "@pollar/core";
import { usePollar } from "@pollar/react";
import estilosHome from "@/app/home.module.css";
import HomeHeader from "@/app/_components/home/HomeHeader";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { LoginGateModal } from "@/features/pollar/LoginGateModal";
import { pollarDisplayName } from "@/features/pollar/pollar-display-name";
import { usePollarLoginBusy } from "@/features/pollar/usePollarLoginBusy";
import { clearSession } from "@/stores/auth-session";

/** Home when Pollar is configured: modal gate, then pet stage. */
export function PollarHomePage() {
  const { isAuthenticated, login, logout, wallet, getClient } = usePollar();
  const { busy, error, clearError } = usePollarLoginBusy();
  const [coins, setCoins] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setMounted(true);
  }, []);

  const userName = pollarDisplayName(getClient().getUserProfile(), wallet);

  const onLogout = () => {
    clearSession();
    setCoins(null);
    logout();
  };

  if (!mounted) {
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

  if (!isAuthenticated) {
    return (
      <div className={estilosHome.contenedor}>
        <HomeHeader />
        <main id="inicio" className={estilosHome.main}>
          <p className={estilosHome.gateHint} aria-hidden="true">
            Entrá para cuidar a Michi.
          </p>
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
        <PetHomeStage onCoinsChange={setCoins} />
      </main>
    </div>
  );
}
