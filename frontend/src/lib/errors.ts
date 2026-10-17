export type ApiErrorBody = {
  message?: string;
  error?: string;
  statusCode?: number;
};

export class PetsAppApiError extends Error {
  codigoEstado: number;
  cuerpo: unknown;

  constructor(mensaje: string, codigoEstado: number, cuerpo: unknown) {
    super(mensaje);
    this.name = "PetsAppApiError";
    this.codigoEstado = codigoEstado;
    this.cuerpo = cuerpo;
  }
}

export function asPetsAppApiError(error: unknown): PetsAppApiError {
  if (error instanceof PetsAppApiError) return error;
  if (error instanceof Error) {
    const ext = error as Error & { codigoEstado?: number; cuerpo?: unknown };
    return new PetsAppApiError(
      error.message,
      ext.codigoEstado ?? 0,
      ext.cuerpo ?? null,
    );
  }
  return new PetsAppApiError(String(error), 0, null);
}
