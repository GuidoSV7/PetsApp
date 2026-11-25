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
import { signOutPetsAppUser } from "@/features/auth/api/auth.service";
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
    // Best-effort Nest cookie clear alongside Pollar + local session (#53 / S4).
    void signOutPetsAppUser().catch(() => undefined);
    clearSession();
    setCoins(null);
    logout();
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
