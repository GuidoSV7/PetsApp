import { existsSync, readFileSync } from 'node:fs';
import { isProductionEnv } from '../auth/session-cookie.js';

export type PgSslEnv = Record<string, string | undefined>;
export type ReadCaFile = (path: string) => string | undefined;

export interface PgSslOptions {
  rejectUnauthorized: boolean;
  ca?: string;
}

export type PgSsl = false | PgSslOptions;

const readCaFromDisk: ReadCaFile = (path) =>
  existsSync(path) ? readFileSync(path).toString() : undefined;

/**
 * Single source of truth for Postgres SSL options. Shared by the Drizzle
 * DatabaseModule and drizzle.config.ts.
 */
export function resolvePgSsl(
  env: PgSslEnv,
  readFile: ReadCaFile = readCaFromDisk,
): PgSsl {
  const sslExplicitlyDisabled = env.DATABASE_SSL === 'false';
  const sslEnabled =
    !sslExplicitlyDisabled &&
    (env.DATABASE_SSL === 'true' ||
      isProductionEnv({ NODE_ENV: env.NODE_ENV, PROD: env.PROD }));

  if (!sslEnabled) return false;

  // When SSL is on, verify certificates by default; DATABASE_SSL_REJECT_UNAUTHORIZED=false is the explicit opt-out.
  const rejectUnauthorized = env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

  const ssl: PgSslOptions = { rejectUnauthorized };
  const caPath = env.DATABASE_SSL_CA;
  const ca = caPath ? readFile(caPath) : undefined;
  if (ca !== undefined) ssl.ca = ca;
  return ssl;
}
