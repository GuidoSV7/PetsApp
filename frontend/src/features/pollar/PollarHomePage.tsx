"use client";

import { useEffect, useRef, useState } from "react";
import { usePollar } from "@pollar/react";
import estilosHome from "@/app/home.module.css";
import HomeHeader from "@/app/_components/home/HomeHeader";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { LoginGateModal } from "@/features/pollar/LoginGateModal";
import { pollarDisplayName } from "@/features/pollar/pollar-display-name";
import { usePollarLoginBusy } from "@/features/pollar/usePollarLoginBusy";
import { getPetsAppSession } from "@/stores/auth-session";
import { usePetCoins } from "@/features/pet-home/api/use-pet-coins";
import { useNestSession } from "@/features/auth/useNestSession";

/** Home when Pollar is configured: modal gate, then pet stage. */
export function PollarHomePage() {
  const { isAuthenticated, login, logout, wallet, getClient } = usePollar();
  const nest = useNestSession();
  const { busy, error, clearError } = usePollarLoginBusy();
  const { coins, onCoinsChange, clearCoins } = usePetCoins(nest.session?.user.id, nest.epoch);
  const hadNestOwner = useRef(Boolean(getPetsAppSession()));
  if (nest.session) hadNestOwner.current = true;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setMounted(true);
  }, []);

  const userName = nest.session?.user.name ?? pollarDisplayName(getClient().getUserProfile(), wallet);

  const onLogout = () => {
    clearCoins();
    hadNestOwner.current = false;
    void nest.logout();
    logout();
  };

  if (!mounted || !nest.ready || nest.busy) {
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

  if (!nest.session && !isAuthenticated) {
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
          busy={busy || nest.busy}
          error={error ?? nest.error}
          onGoogle={() => {
            clearError();
            login({ provider: "google" });
          }}
          onFreighter={() => {
            clearError();
            void nest.loginFreighter();
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
        {!nest.session && hadNestOwner.current ? <p role="alert">Volvé a iniciar sesión para continuar.</p> :
          <PetHomeStage key={nest.session ? `${nest.session.user.id}:${nest.epoch}` : `pollar:${wallet?.address ?? "session"}:${nest.epoch}`} ownerId={nest.session?.user.id} onCoinsChange={onCoinsChange} />}

      </main>
    </div>
  );
}
