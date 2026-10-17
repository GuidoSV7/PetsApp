import { existsSync, readFileSync } from 'node:fs';

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
  const isProduction = env.PROD === 'production';
  const sslExplicitlyDisabled = env.DATABASE_SSL === 'false';
  const sslEnabled =
    !sslExplicitlyDisabled && (env.DATABASE_SSL === 'true' || isProduction);

  if (!sslEnabled) return false;

  // In production, do not verify certificates by default (cloud providers).
  const rejectUnauthorized = isProduction
    ? env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
    : env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

  const ssl: PgSslOptions = { rejectUnauthorized };
  const caPath = env.DATABASE_SSL_CA;
  const ca = caPath ? readFile(caPath) : undefined;
  if (ca !== undefined) ssl.ca = ca;
  return ssl;
}
