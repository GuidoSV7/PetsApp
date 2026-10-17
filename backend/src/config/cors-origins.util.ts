/**
 * CORS policy for the HTTP app.
 *
 * CORS is ON unless CORS_ENABLED is false/0/no/off. When on, only origins
 * listed in CORS_ORIGIN are allowed. Only with NODE_ENV=development does an
 * empty list reflect the request Origin (local frontends keep working). In any
 * other environment (production, test, unset, staging...) an empty list fails
 * closed: no origin is allowed and no CORS headers are sent, because
 * reflecting arbitrary origins together with credentials lets any site read
 * authenticated responses.
 *
 * env is read lazily inside each function: ConfigModule loads `.env` after
 * some modules are imported.
 */

const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const DISABLED_VALUES = new Set(['false', '0', 'no', 'off']);

export function isCorsEnabled(
  raw: string | undefined = process.env.CORS_ENABLED,
): boolean {
  const normalized = (raw ?? '').trim().toLowerCase();
  return !DISABLED_VALUES.has(normalized);
}

/** Comma-separated CORS_ORIGIN list. Empty falls back to the local frontend. */
export function parseCorsOrigins(raw?: string | null): string[] {
  const list = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [...DEFAULT_ORIGINS];
}

/**
 * Origins allowed to write with the session cookie (CSRF origin check).
 * Same list as the CORS allowlist; empty falls back to the local frontend.
 * Reads env lazily, like the rest of this module.
 */
export function allowedOrigins(
  raw: string | undefined = process.env.CORS_ORIGIN,
): string[] {
  return parseCorsOrigins(raw);
}

/**
 * `origin` value for the `cors` package.
 * `true` reflects the request Origin (NODE_ENV=development, no CORS_ORIGIN).
 * A string list is the enforced allowlist (empty = nothing allowed).
 * `false` disables CORS.
 */
export function corsOriginOption(
  rawEnabled: string | undefined = process.env.CORS_ENABLED,
  rawOrigins: string | undefined = process.env.CORS_ORIGIN,
): boolean | string[] {
  if (!isCorsEnabled(rawEnabled)) return false;
  const configured = (rawOrigins ?? '').trim();
  if (!configured) return process.env.NODE_ENV === 'development' ? true : [];
  return parseCorsOrigins(configured);
}

/**
 * Boot-time warning when CORS is on but CORS_ORIGIN is empty outside
 * development: the browser origin will get no CORS headers.
 */
export function corsBootWarning(
  rawEnabled: string | undefined = process.env.CORS_ENABLED,
  rawOrigins: string | undefined = process.env.CORS_ORIGIN,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string | null {
  if (!isCorsEnabled(rawEnabled)) return null;
  if ((rawOrigins ?? '').trim() || nodeEnv === 'development') return null;
  return 'CORS_ORIGIN is empty and NODE_ENV is not "development": CORS is fail-closed (no cross-origin browser access). Set CORS_ORIGIN to the frontend origin(s) if a browser calls this API directly.';
}

/** Response headers a browser may read from a cross-origin response. */
export const CORS_EXPOSED_HEADERS = ['Content-Disposition'];

/** Options for `app.enableCors`. */
export function httpCorsOptions():
  | false
  | {
      origin: boolean | string[];
      methods: string;
      credentials: true;
      optionsSuccessStatus: number;
      exposedHeaders: string[];
    } {
  const origin = corsOriginOption();
  if (origin === false) return false;
  return {
    origin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    optionsSuccessStatus: 204,
    exposedHeaders: [...CORS_EXPOSED_HEADERS],
  };
}
