import BrandMark from "@/components/ui/BrandMark";
import { CoinBalance } from "@/features/pet-home/components/CoinBalance";
import estilosHome from "../../home.module.css";

type Props = {
  coins?: number;
  userName?: string;
  onLogout?: () => void;
};

/** Home top bar: brand + coins + optional session controls. */
export default function HomeHeader({ coins, userName, onLogout }: Props) {
  return (
    <header className={estilosHome.header}>
      <div className={estilosHome.headerInner}>
        <div className={estilosHome.marca} aria-label="PetsApp">
          <BrandMark size={28} />
          <div className={estilosHome.tituloMarca}>PetsApp</div>
        </div>
        <div className={estilosHome.headerAcciones}>
          {typeof coins === "number" ? <CoinBalance balance={coins} /> : null}
          {userName && onLogout ? (
            <button
              type="button"
              className={estilosHome.botonSalir}
              onClick={onLogout}
              aria-label={`Cerrar sesión de ${userName}`}
            >
              <svg
                className={estilosHome.botonSalirIcon}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6zm8.3 2.9-1.3-.3a7.2 7.2 0 0 0-.6-1.5l.8-1.1a1 1 0 0 0-.1-1.3l-1.5-1.5a1 1 0 0 0-1.3-.1l-1.1.8c-.47-.26-.97-.47-1.5-.6l-.3-1.3A1 1 0 0 0 12.6 3h-1.2a1 1 0 0 0-1 .8l-.3 1.3c-.53.13-1.03.34-1.5.6l-1.1-.8a1 1 0 0 0-1.3.1L4.7 6.9a1 1 0 0 0-.1 1.3l.8 1.1c-.26.47-.47.97-.6 1.5l-1.3.3A1 1 0 0 0 2.5 12v1.2a1 1 0 0 0 .8 1l1.3.3c.13.53.34 1.03.6 1.5l-.8 1.1a1 1 0 0 0 .1 1.3l1.5 1.5a1 1 0 0 0 1.3.1l1.1-.8c.47.26.97.47 1.5.6l.3 1.3a1 1 0 0 0 1 .8h1.2a1 1 0 0 0 1-.8l.3-1.3c.53-.13 1.03-.34 1.5-.6l1.1.8a1 1 0 0 0 1.3-.1l1.5-1.5a1 1 0 0 0 .1-1.3l-.8-1.1c.26-.47.47-.97.6-1.5l1.3-.3a1 1 0 0 0 .8-1V12a1 1 0 0 0-.8-1z"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
