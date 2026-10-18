import BrandMark from "@/components/ui/BrandMark";
import estilosHome from "../../home.module.css";

/** Public home top bar: brand only. */
export default function HomeHeader() {
  return (
    <header className={estilosHome.header}>
      <div className={estilosHome.headerInner}>
        <div className={estilosHome.marca} aria-label="PetsApp">
          <BrandMark size={28} />
          <div className={estilosHome.tituloMarca}>PetsApp</div>
        </div>
      </div>
    </header>
  );
}
