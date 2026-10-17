"use client";

import { useEffect, useState } from "react";
import estilosHome from "../../home.module.css";
import type { AuthModalMode } from "../auth/auth-types";
import SafePurchaseHeader from "./SafePurchaseHeader";
import PetsAppLandingContent from "./PetsAppLandingContent";
import SafePurchaseHero from "./SafePurchaseHero";
import SafePurchaseFooter from "./SafePurchaseFooter";
import AuthDemoModal from "../auth/AuthDemoModal";

// Home público PetsApp y modal de login/registro contra el API.
export default function SafePurchasePage() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalMode, setModalMode] = useState<AuthModalMode>("sign-in");

  const openModal = (modo: AuthModalMode) => {
    setModalMode(modo);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
  };

  // Tras cerrar sesión o volver al home, el scroll no debe quedar abajo del documento anterior.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className={estilosHome.contenedor}>
      <SafePurchaseHeader onSignIn={() => openModal("sign-in")} />

      <main id="inicio" className={estilosHome.main}>
        <SafePurchaseHero onStartFree={() => openModal("sign-up")} />
        <PetsAppLandingContent onCreateFreeAccount={() => openModal("sign-up")} />
      </main>

      <SafePurchaseFooter />

      <AuthDemoModal
        abierta={modalAbierto}
        initialMode={modalMode}
        onClose={cerrarModal}
      />
    </div>
  );
}

