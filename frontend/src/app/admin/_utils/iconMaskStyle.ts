import type { CSSProperties } from "react";

// Construye variables CSS para iconos con mascara (SVG como mask + color de fondo).
export function iconMaskStyle(
  rutaIcono: string,
  colorIcono?: string
): CSSProperties {
  const variables: Record<string, string> = {
    "--url-mascara": `url("${rutaIcono}")`,
  };
  if (colorIcono) variables["--color-icono-mascara"] = colorIcono;
  return variables as CSSProperties;
}
