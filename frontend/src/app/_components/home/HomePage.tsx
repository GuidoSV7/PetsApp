"use client";

import { useEffect, useState } from "react";
import estilosHome from "../../home.module.css";
import type { AuthModalMode } from "@/features/auth/types/auth.types";
import HomeHeader from "./HomeHeader";
import HomeFooter from "./HomeFooter";
import AuthDemoModal from "@/features/auth/components/AuthDemoModal";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";

// Public home: virtual pet stage plus the login/register modal.
export default function HomePage() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalMode, setModalMode] = useState<AuthModalMode>("sign-in");

  const openModal = (modo: AuthModalMode) => {
    setModalMode(modo);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className={estilosHome.contenedor}>
      <HomeHeader onSignIn={() => openModal("sign-in")} />

      <main id="inicio" className={estilosHome.main}>
        <PetHomeStage />
      </main>

      <HomeFooter />

      <AuthDemoModal
        abierta={modalAbierto}
        initialMode={modalMode}
        onClose={cerrarModal}
      />
    </div>
  );
}
