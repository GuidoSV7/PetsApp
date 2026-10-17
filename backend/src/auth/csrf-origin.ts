import type { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

type WriteRequest = Pick<Request, 'method' | 'headers'>;

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * CSRF defense for cookie sessions (SameSite=Lax + Origin check).
 *
 * Safe methods always pass. An unsafe request passes when its `Origin` is in
 * the allowlist; with no `Origin` it passes only if the browser marked it
 * `Sec-Fetch-Site: same-origin`. `Origin` wins over `Sec-Fetch-Site`, and a
 * request carrying neither header fails closed.
 */
export function isSameOriginWrite(
  req: WriteRequest,
  allowed: readonly string[],
): boolean {
  if (SAFE_METHODS.has((req.method ?? '').toUpperCase())) {
    return true;
  }

  const origin = single(req.headers.origin);
  if (origin !== undefined) {
    const candidate = normalizeOrigin(origin);
    return allowed.some((entry) => normalizeOrigin(entry) === candidate);
  }

  return single(req.headers['sec-fetch-site']) === 'same-origin';
}

/**
 * Origin check for the unauthenticated `POST /auth/login` and `/auth/logout`
 * (login CSRF plants an attacker's session; logout CSRF forces a sign-out).
 *
 * - `Origin` present: must be in the allowlist (`null` and foreign fail).
 * - else `Sec-Fetch-Site` present: only `same-origin` passes.
 * - else (curl, server-to-server: no browser headers): passes only when the
 *   request carries no session cookie. A browser always sends `Origin` on
 *   POST, so a cookie without either header is not a legitimate client.
 */
export function isTrustedAuthPost(
  req: WriteRequest,
  allowed: readonly string[],
  hasSessionCookie: boolean,
): boolean {
  const origin = single(req.headers.origin);
  if (origin !== undefined) {
    const candidate = normalizeOrigin(origin);
    return allowed.some((entry) => normalizeOrigin(entry) === candidate);
  }
  const site = single(req.headers['sec-fetch-site']);
  if (site !== undefined) return site === 'same-origin';
  return !hasSessionCookie;
}
