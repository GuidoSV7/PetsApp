"use client";

import BrandMark from "@/components/ui/BrandMark";
import estilosHome from "../../home.module.css";

// Public home top bar: brand and sign-in trigger.
export default function HomeHeader({
  onSignIn,
}: Readonly<{
  onSignIn: () => void;
}>) {
  return (
    <header className={estilosHome.header}>
      <div className={estilosHome.headerInner}>
        <div className={estilosHome.marca} aria-label="PetsApp">
          <BrandMark size={36} />
          <div className={estilosHome.tituloMarca}>PetsApp</div>
        </div>

        <div className={estilosHome.headerAcciones}>
          <button
            type="button"
            className={estilosHome.botonHeader}
            onClick={onSignIn}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
