import type { InternalAxiosRequestConfig } from "axios";
import { getSessionToken } from "@/stores/auth-session";

/** English bodies the `/petsapp-api` proxy used to emit; map for Spanish UI (#79). */
const PROXY_ERROR_ES: Record<string, string> = {
  "Invalid path": "Ruta no válida.",
  "Upstream unavailable":
    "El servicio no está disponible. Probá de nuevo en un rato.",
};

/** Maps known proxy English codes to Rioplatense Spanish; other strings pass through. */
export function mapProxyErrorMessage(message: string): string {
  return PROXY_ERROR_ES[message] ?? message;
}

export function applyRequestAuthPolicy(config: InternalAxiosRequestConfig) {
  const token = getSessionToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
}

export function mapApiResponseError(error: unknown): Error {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { data?: { message?: string }; status?: number } })
      .response
  ) {
    const res = (
      error as { response: { data?: { message?: string }; status: number } }
    ).response;
    const raw =
      res.data?.message ??
      (error as { message?: string }).message ??
      "Error de API";
    const mensaje = mapProxyErrorMessage(raw);
    const err = new Error(mensaje) as Error & {
      codigoEstado?: number;
      cuerpo?: unknown;
    };
    err.codigoEstado = res.status;
    err.cuerpo = res.data;
    return err;
  }
  return error instanceof Error ? error : new Error(String(error));
}
