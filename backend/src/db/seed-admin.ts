import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { resolveDrizzleCredentials } from '../database/drizzle-credentials.js';
import { DrizzleUserRepository } from '../users/infrastructure/drizzle-user.repository.js';
import { schema } from './schema.js';
import { seedSuperAdmin } from './seed-admin-logic.js';

/** Same cost factor as `AuthService` registration / change-password. */
const BCRYPT_ROUNDS = 10;

function requireEnv(name: 'ADMIN_EMAIL' | 'ADMIN_PASSWORD' | 'ADMIN_NAME'): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const email = requireEnv('ADMIN_EMAIL');
  const password = requireEnv('ADMIN_PASSWORD');
  const name = requireEnv('ADMIN_NAME');

  const { url, ssl } = resolveDrizzleCredentials(process.env);
  const pool = new pg.Pool({
    connectionString: url,
    ssl,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  try {
    const db = drizzle(pool, { schema });
    const users = new DrizzleUserRepository(db);
    const result = await seedSuperAdmin(users, { email, password, name }, (plain) =>
      bcrypt.hash(plain, BCRYPT_ROUNDS),
    );

    if (result.status === 'created') {
      console.log(`Created super_admin ${result.email} (${result.userId})`);
    } else {
      console.log(
        `super_admin already exists for ${result.email} (${result.userId}); skipped`,
      );
    }
  } finally {
    await pool.end();
  }
}

try {
  await main();
} catch (error) {
  console.error('seed:admin failed:', error);
  process.exit(1);
}
