import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { resolveMigrationConfig } from './migrate-config.js';

/**
 * Applies the pending SQL migrations from `drizzle/` to `DATABASE_URL`.
 * Runs before the API starts (container CMD, `npm run db:migrate:prod`).
 * Exits 1 on any failure so the app never boots on a stale schema.
 */
async function main(): Promise<void> {
  const { url, ssl, migrationsFolder } = resolveMigrationConfig(
    process.env,
    import.meta.dirname,
  );
  const pool = new pg.Pool({
    connectionString: url,
    ssl,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
    console.log(`Migrations applied from ${migrationsFolder}`);
  } finally {
    await pool.end();
  }
}

try {
  await main();
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
