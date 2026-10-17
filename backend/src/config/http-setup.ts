import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { isProductionEnv } from '../auth/session-cookie.js';

/**
 * Hops of reverse proxy to trust for the client IP (`req.ip`, the throttler
 * key). Default: 1 in production (the frontend proxy), none elsewhere. Only a
 * hop count is accepted: `true` or a CIDR list would let a client spoof its
 * address with a forged X-Forwarded-For.
 */
export function parseTrustProxy(
  raw: string | undefined,
  isProd: boolean,
): number | false {
  const value = (raw ?? '').trim();
  if (value === '') return isProd ? 1 : false;
  if (!/^\d+$/.test(value)) {
    throw new Error(
      `TRUST_PROXY must be a non-negative integer hop count, got "${value}"`,
    );
  }
  const hops = Number(value);
  return hops === 0 ? false : hops;
}

/** Cookie parsing and proxy trust shared by `main.ts` and the e2e specs. */
export function configureHttpApp(
  app: NestExpressApplication,
  env: {
    NODE_ENV?: string;
    PROD?: string;
    TRUST_PROXY?: string;
  } = process.env,
): void {
  app.use(cookieParser());
  app.set(
    'trust proxy',
    parseTrustProxy(env.TRUST_PROXY, isProductionEnv(env)),
  );
}
