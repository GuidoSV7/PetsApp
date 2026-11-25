"use client";

import BrandMark from "@/components/ui/BrandMark";
import estilos from "./boundaries.module.css";

/** Route error boundary: Spanish message with a retry through `reset()`. */
export default function ErrorRuta({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={estilos.panel}>
      <div className={estilos.card}>
        <BrandMark size={48} />
        <h1 className={estilos.title}>Ups… algo salió mal</h1>
        <p className={estilos.detail}>
          No pudimos mostrar esta sección. Podés intentar de nuevo; si sigue
          fallando, vuelve en un rato.
        </p>
        <button type="button" className={estilos.action} onClick={() => reset()}>
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
