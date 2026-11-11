"use client";

import estilos from "./boundaries.module.css";

/** Root shell error: last resort before the browser, keeps the brand green. */
export default function ErrorGlobal({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <main className={estilos.panel}>
          <div className={estilos.card}>
            <h1 className={estilos.title}>Error inesperado</h1>
            <p className={estilos.detail}>
              Algo falló en la aplicación. Probá recargar para volver a entrar.
            </p>
            <button
              type="button"
              className={estilos.action}
              onClick={() => reset()}
            >
              Intentar de nuevo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
