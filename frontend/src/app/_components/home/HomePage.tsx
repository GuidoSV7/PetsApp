"use client";

import { useEffect, useState } from "react";
import estilosHome from "../../home.module.css";
import HomeHeader from "./HomeHeader";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";

/** Public home: virtual pet stage hydrated from the Nest pet API. */
export default function HomePage() {
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className={estilosHome.contenedor}>
      <HomeHeader coins={coins ?? undefined} />

      <main id="inicio" className={estilosHome.main}>
        <PetHomeStage onCoinsChange={setCoins} />
      </main>
    </div>
  );
}
