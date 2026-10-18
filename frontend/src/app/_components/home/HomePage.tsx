"use client";

import { useEffect } from "react";
import estilosHome from "../../home.module.css";
import HomeHeader from "./HomeHeader";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";

/** Public home: virtual pet stage. */
export default function HomePage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className={estilosHome.contenedor}>
      <HomeHeader />

      <main id="inicio" className={estilosHome.main}>
        <PetHomeStage />
      </main>
    </div>
  );
}
