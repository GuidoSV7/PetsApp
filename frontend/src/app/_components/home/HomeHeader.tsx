import BrandMark from "@/components/ui/BrandMark";
import { CoinBalance } from "@/features/pet-home/components/CoinBalance";
import estilosHome from "../../home.module.css";

type Props = {
  coins?: number;
};

/** Public home top bar: brand + coin pill. */
export default function HomeHeader({ coins }: Props) {
  return (
    <header className={estilosHome.header}>
      <div className={estilosHome.headerInner}>
        <div className={estilosHome.marca} aria-label="PetsApp">
          <BrandMark size={28} />
          <div className={estilosHome.tituloMarca}>PetsApp</div>
        </div>
        {typeof coins === "number" ? <CoinBalance balance={coins} /> : null}
      </div>
    </header>
  );
}
