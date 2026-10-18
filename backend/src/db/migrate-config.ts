import { join } from 'node:path';
import {
  type DrizzleCredentials,
  resolveDrizzleCredentials,
} from '../database/drizzle-credentials.js';
import type { PgSslEnv } from '../database/pg-ssl.util.js';

export interface MigrationConfig extends DrizzleCredentials {
  /** Absolute path of the drizzle-kit output folder (`drizzle/`). */
  migrationsFolder: string;
}

/**
 * Where the SQL migrations live, relative to the directory of the migrate
 * entry point. `src/db/` and `dist/db/` are both two levels below the package
 * root, so the same relative path works for `tsx src/db/migrate.ts` and for
 * `node dist/db/migrate.js` inside the container.
 */
export function migrationsFolderFor(entryDir: string): string {
  return join(entryDir, '..', '..', 'drizzle');
}

/**
 * Credentials (DATABASE_URL + the shared SSL resolution) and migrations
 * folder for the startup migration run. Throws the same named-variable
 * errors as the runtime pool, so a misconfigured container fails before
 * touching the database.
 */
export function resolveMigrationConfig(
  env: PgSslEnv,
  entryDir: string,
): MigrationConfig {
  return {
    ...resolveDrizzleCredentials(env),
    migrationsFolder: migrationsFolderFor(entryDir),
  };
}
