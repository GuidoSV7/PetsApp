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
              Salir
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
