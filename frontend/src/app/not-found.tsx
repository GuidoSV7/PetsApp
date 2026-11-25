import Link from "next/link";
import BrandMark from "@/components/ui/BrandMark";
import estilos from "./boundaries.module.css";

/** Root not-found: branded 404 with a way back to the home. */
export default function PaginaNoEncontrada() {
  return (
    <main className={estilos.panel}>
      <div className={estilos.card}>
        <BrandMark size={48} />
        <h1 className={estilos.title}>Perdimos esta página</h1>
        <p className={estilos.detail}>
          Parece que esta dirección no existe o se mudó. Volvé al inicio para
          seguir cuidando a Michi.
        </p>
        <Link href="/" className={estilos.action}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
