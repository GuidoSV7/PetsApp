import type { InternalAxiosRequestConfig } from "axios";
import { getSessionToken } from "@/stores/auth-session";

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
    const mensaje =
      res.data?.message ??
      (error as { message?: string }).message ??
      "Error de API";
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
