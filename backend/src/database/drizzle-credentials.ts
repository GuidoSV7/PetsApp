import { type PgSsl, type PgSslEnv, resolvePgSsl } from './pg-ssl.util.js';

export interface DrizzleCredentials {
  url: string;
  ssl: PgSsl;
}

/**
 * Builds Postgres credentials (drizzle-kit and the runtime pool) from env.
 * Fails fast instead of silently targeting localhost/postgres. Error messages
 * name the variable, never its value.
 */
export function resolveDrizzleCredentials(env: PgSslEnv): DrizzleCredentials {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('Missing database env var: DATABASE_URL');
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error('DATABASE_URL must be a postgres:// or postgresql:// URL');
  }
  return { url, ssl: resolvePgSsl(env) };
}

/** drizzle-kit commands that open a database connection. */
const CONNECTED_COMMANDS = new Set([
  'migrate',
  'push',
  'pull',
  'introspect',
  'studio',
]);

/**
 * Offline commands (generate, check, export, up) only read the schema, so
 * credentials are required only when the invoked command connects.
 */
export function drizzleCredentialsForCommand(
  argv: readonly string[],
  env: PgSslEnv,
): DrizzleCredentials | undefined {
  const connects = argv.some((arg) => CONNECTED_COMMANDS.has(arg));
  return connects ? resolveDrizzleCredentials(env) : undefined;
}
