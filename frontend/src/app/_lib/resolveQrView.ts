// Interpreta la respuesta del POST /businesses/:id/qr-codes para pintar imagen o generar QR desde texto.

export type ResultadoVistaQr =
  | { tipo: "imagen"; src: string; alt: string }
  | { tipo: "texto"; valor: string; titulo?: string }
  | { tipo: "desconocido"; detalle: string };

function cadenaNoVacia(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function buscarCadenaEnObjeto(obj: Record<string, unknown>, claves: string[]): string | null {
  for (const k of claves) {
    const v = obj[k];
    if (cadenaNoVacia(v)) return v.trim();
  }
  return null;
}

/**
 * Saca una URL de imagen, data URL o un payload de texto para codificar en QR.
 * Cubre nombres habituales (camelCase / snake) sin acoplarse a un único contrato del backend.
 */
export function resolveQrView(respuesta: unknown, labelFallback = "Código QR"): ResultadoVistaQr {
  if (respuesta === null || respuesta === undefined) {
    return { tipo: "desconocido", detalle: "Respuesta vacía del servidor." };
  }

  if (cadenaNoVacia(respuesta)) {
    const s = respuesta.trim();
    if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:image")) {
      return { tipo: "imagen", src: s, alt: labelFallback };
    }
    return { tipo: "texto", valor: s, titulo: labelFallback };
  }

  if (typeof respuesta !== "object") {
    return { tipo: "desconocido", detalle: "Formato de respuesta no reconocido." };
  }

  const o = respuesta as Record<string, unknown>;
  const data = o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : o;

  const urlImagen = buscarCadenaEnObjeto(data, [
    "imageUrl",
    "image_url",
    "qrImageUrl",
    "qr_image_url",
    "qrUrl",
    "qr_url",
    "url",
    "pngUrl",
    "png_url",
  ]);
  if (urlImagen && (urlImagen.startsWith("http") || urlImagen.startsWith("data:image"))) {
    return { tipo: "imagen", src: urlImagen, alt: labelFallback };
  }

  const base64 = buscarCadenaEnObjeto(data, ["qrCodeBase64", "qr_code_base64", "base64", "imageBase64"]);
  if (base64 && !base64.startsWith("http")) {
    const src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
    return { tipo: "imagen", src, alt: labelFallback };
  }

  const texto = buscarCadenaEnObjeto(data, [
    "payload",
    "content",
    "data",
    "uri",
    "deepLink",
    "deep_link",
    "paymentUrl",
    "payment_url",
    "solanaPay",
    "solana_pay",
  ]);
  if (texto) {
    return { tipo: "texto", valor: texto, titulo: labelFallback };
  }

  try {
    return {
      tipo: "texto",
      valor: JSON.stringify(respuesta),
      titulo: labelFallback,
    };
  } catch {
    return { tipo: "desconocido", detalle: "No se pudo interpretar la respuesta." };
  }
}
