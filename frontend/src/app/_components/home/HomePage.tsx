"use client";

import { useEffect, useState } from "react";
import estilosHome from "../../home.module.css";
import type { AuthModalMode } from "../auth/auth-types";
import HomeHeader from "./HomeHeader";
import HomeFooter from "./HomeFooter";
import AuthDemoModal from "../auth/AuthDemoModal";

// Public PetsApp home: neutral hero plus the login/register modal against the API.
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

  // After sign-out or returning home, scroll must not stay at the previous document's bottom.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className={estilosHome.contenedor}>
      <HomeHeader onSignIn={() => openModal("sign-in")} />

      <main id="inicio" className={estilosHome.main}>
        <section className={estilosHome.hero}>
          <div className={estilosHome.heroTexto}>
            <h1 className={estilosHome.heroTitulo}>
              <span className={estilosHome.tituloNeonCyan}>PetsApp</span>
            </h1>
            <p className={estilosHome.heroSubtexto}>
              Cuidá, encontrá y acompañá a tus mascotas desde un solo lugar.
            </p>
            <div className={estilosHome.botonesHero}>
              <button
                type="button"
                className={estilosHome.botonPrimario}
                onClick={() => openModal("sign-in")}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </section>
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
