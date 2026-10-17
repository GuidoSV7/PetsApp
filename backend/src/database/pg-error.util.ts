/**
 * Drizzle >= 0.44 wraps driver errors in `DrizzleQueryError`, keeping the
 * original `pg` error in `cause`. Reads the SQLSTATE from either shape.
 */
export function pgErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const e = error as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}
