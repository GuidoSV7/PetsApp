import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { Logger } from 'drizzle-orm/logger';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { join } from 'node:path';
import type { DrizzleDb } from '../database/database.module.js';
import { schema } from '../db/schema.js';

export interface TestDb {
  db: DrizzleDb;
  client: PGlite;
  close: () => Promise<void>;
}

const MIGRATIONS_FOLDER = join(import.meta.dirname, '..', '..', 'drizzle');

/**
 * Fresh in-memory Postgres with the real migrations applied. The pglite
 * drizzle db is cast once to `DrizzleDb`: both expose the same query-builder
 * API, only the driver differs.
 */
export async function createTestDb(
  options: { migrate?: boolean; logger?: Logger } = {},
): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema, logger: options.logger });
  if (options.migrate !== false) {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  }
  return {
    db: db as unknown as DrizzleDb,
    client,
    close: () => client.close(),
  };
}
