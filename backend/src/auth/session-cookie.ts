import type { CookieOptions, Response } from 'express';

const DEV_SESSION_COOKIE = 'petsapp_session';
/**
 * `__Host-` makes the browser accept the cookie only if it is Secure, has
 * Path=/ and no Domain, so a sibling subdomain cannot plant or shadow it.
 */
const PROD_SESSION_COOKIE = '__Host-petsapp_session';

/**
 * Single resolver for the session cookie name: every read, set and clear goes
 * through it. `secure` is the production flag (`isProductionEnv`); `__Host-`
 * needs Secure, so plain-http local dev keeps the unprefixed name.
 */
export function sessionCookieName(secure: boolean): string {
  return secure ? PROD_SESSION_COOKIE : DEV_SESSION_COOKIE;
}

type CookieResponse = Pick<Response, 'cookie' | 'clearCookie'>;

/**
 * Attributes shared by set and clear (a browser only removes a cookie whose
 * attributes match). No `Domain`: the cookie stays host-only on the host that
 * proxies the API.
 */
function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', path: '/', secure };
}

export function setSessionCookie(
  res: CookieResponse,
  token: string,
  options: { secure: boolean; maxAgeMs?: number },
): void {
  res.cookie(sessionCookieName(options.secure), token, {
    ...baseOptions(options.secure),
    ...(options.maxAgeMs === undefined ? {} : { maxAge: options.maxAgeMs }),
  });
}

export function clearSessionCookie(
  res: CookieResponse,
  options: { secure: boolean },
): void {
  res.clearCookie(
    sessionCookieName(options.secure),
    baseOptions(options.secure),
  );
}

/**
 * Remaining lifetime of a signed JWT in ms, read from its `exp` claim so the
 * cookie expires with the token (JWT_EXPIRES_IN). The token was just signed by
 * this process, so the payload is not verified again. Throws when the claim is
 * missing or unreadable: returning 0 would turn the cookie into a delete
 * (Max-Age=0) and the user could never sign in.
 */
export function tokenLifetimeMs(
  token: string,
  now: number = Date.now(),
): number {
  let exp: unknown;
  try {
    exp = (
      JSON.parse(
        Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
      ) as { exp?: unknown }
    ).exp;
  } catch {
    throw new Error('Session token payload is unreadable: no exp claim');
  }
  if (typeof exp !== 'number') {
    throw new Error('Session token has no exp claim');
  }
  return Math.max(0, exp * 1000 - now);
}

/** Production test shared by the guards and the cookie helpers (`PROD=production` counts). */
export function isProductionEnv(env: {
  NODE_ENV?: string;
  PROD?: string;
}): boolean {
  return env.NODE_ENV === 'production' || env.PROD === 'production';
}
