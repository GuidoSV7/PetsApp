"use client";

// RouteThemeProvider: define `data-area` según la ruta para que `globals.css`
// cambie el tema (variables CSS) entre `/` y `/admin`.
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Determina en qué sección estamos para aplicar el tema correcto.
export default function RouteThemeProvider({
  children: hijos,
}: Readonly<{
  children: ReactNode;
}>) {
  const rutaActual = usePathname();

  let area: "principal" | "admin" = "principal";
  if (rutaActual?.startsWith("/admin")) area = "admin";

  return <div data-area={area}>{hijos}</div>;
}

