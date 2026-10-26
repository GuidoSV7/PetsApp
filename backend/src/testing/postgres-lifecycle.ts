import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type {} from 'vitest';
import { schema } from '../db/schema.js';

export interface TestRunContext {
  prefix: string;
  template: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    postgresTestRun: TestRunContext;
  }
}

export const REQUIRED_TEST_URL =
  'TEST_DATABASE_URL is required for database tests; provide an isolated PostgreSQL test database URL.';

export function readTestUrl(): string {
  const value = process.env.TEST_DATABASE_URL?.trim();
  if (!value) throw new Error(REQUIRED_TEST_URL);
  return validateUrl(value);
}

function validateUrl(value: string): string {
  try {
    const url = new URL(value);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    ) {
      throw new Error('Invalid URL');
    }
    return value;
  } catch {
    throw new Error('TEST_DATABASE_URL must be a PostgreSQL URL.');
  }
}

export function databaseUrl(value: string, name: string): string {
  const url = new URL(validateUrl(value));
  url.pathname = `/${name}`;
  return url.toString();
}

export function newRunContext(): TestRunContext {
  const prefix = `petsapp_test_${randomUUID().replaceAll('-', '')}`;
  return { prefix, template: `${prefix}_tpl` };
}

function validateContext(context: TestRunContext): void {
  if (
    !/^petsapp_test_[a-f0-9]{32}$/.test(context.prefix) ||
    context.template !== `${context.prefix}_tpl`
  ) {
    throw new Error('Invalid PostgreSQL test run namespace.');
  }
}

function owns(context: TestRunContext, name: string): boolean {
  validateContext(context);
  return (
    name === context.template ||
    new RegExp(`^${context.prefix}_db_[a-f0-9]{12}$`).test(name)
  );
}

function identifier(name: string): string {
  if (!/^[a-z0-9_]{1,63}$/.test(name))
    throw new Error('Invalid test database identifier.');
  return `"${name}"`;
}

function pool(url: string, name: string, max = 1): pg.Pool {
  return new pg.Pool({
    connectionString: databaseUrl(url, name),
    max,
    connectionTimeoutMillis: 5_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
  });
}

export async function listRunDatabases(
  url: string,
  context: TestRunContext,
): Promise<string[]> {
  validateContext(context);
  const admin = pool(url, 'postgres');
  try {
    const result = await admin.query<{ datname: string }>(
      'SELECT datname FROM pg_database WHERE left(datname, length($1))=$1 ORDER BY datname',
      [context.prefix],
    );
    return result.rows
      .map(({ datname }) => datname)
      .filter((name) => owns(context, name));
  } finally {
    await admin.end();
  }
}

async function dropOwned(
  admin: pg.Pool,
  context: TestRunContext,
  name: string,
): Promise<void> {
  if (!owns(context, name))
    throw new Error('Refusing to drop an unowned test database.');
  const { rows } = await admin.query<{ datistemplate: boolean }>(
    'SELECT datistemplate FROM pg_database WHERE datname=$1',
    [name],
  );
  if (!rows.length) return;
  if (rows[0].datistemplate) {
    await admin.query(
      `ALTER DATABASE ${identifier(name)} WITH IS_TEMPLATE false`,
    );
  }
  await admin.query(`DROP DATABASE IF EXISTS ${identifier(name)} WITH (FORCE)`);
}

async function disposeRun(url: string, context: TestRunContext): Promise<void> {
  const names = await listRunDatabases(url, context);
  const admin = pool(url, 'postgres');
  try {
    for (const name of names.filter((name) => name !== context.template)) {
      await dropOwned(admin, context, name);
    }
    await dropOwned(admin, context, context.template);
    console.info(`[test-db] cleaned ${context.prefix}`);
  } finally {
    await admin.end();
  }
}

/** One fresh migrated template per invocation, independent of all other runs. */
export async function startTestRun(
  url: string,
  context = newRunContext(),
  migrationsFolder = join(import.meta.dirname, '..', '..', 'drizzle'),
): Promise<{ context: TestRunContext; close: () => Promise<void> }> {
  validateUrl(url);
  validateContext(context);
  const started = performance.now();
  const admin = pool(url, 'postgres');
  let created = false;
  try {
    await admin.query(
      `CREATE DATABASE ${identifier(context.template)} TEMPLATE template0`,
    );
    created = true;
    const migrationPool = pool(url, context.template);
    try {
      await migrate(drizzle(migrationPool, { schema }), { migrationsFolder });
    } finally {
      await migrationPool.end();
    }
    await admin.query(
      `ALTER DATABASE ${identifier(context.template)} WITH IS_TEMPLATE true ALLOW_CONNECTIONS false`,
    );
    console.info(
      `[test-db] template ${context.template} ${(performance.now() - started).toFixed(1)}ms`,
    );
  } catch (error) {
    if (created) {
      try {
        await disposeRun(url, context);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Test database setup and cleanup failed.',
        );
      }
    }
    throw error;
  } finally {
    await admin.end();
  }
  let closing: Promise<void> | undefined;
  return { context, close: () => (closing ??= disposeRun(url, context)) };
}

/** Every allocation owns a distinct physical database, never a worker-wide singleton. */
export async function allocateFixture(url: string, context: TestRunContext) {
  validateUrl(url);
  validateContext(context);
  const started = performance.now();
  const name = `${context.prefix}_db_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const admin = pool(url, 'postgres');
  try {
    await admin.query(
      `CREATE DATABASE ${identifier(name)} TEMPLATE ${identifier(context.template)}`,
    );
  } finally {
    await admin.end();
  }
  const client = pool(url, name, 2);
  let closing: Promise<void> | undefined;
  const close = () =>
    (closing ??= (async () => {
      try {
        await client.end();
      } finally {
        const disposer = pool(url, 'postgres');
        try {
          await dropOwned(disposer, context, name);
        } finally {
          await disposer.end();
        }
      }
    })());
  console.info(
    `[test-db] clone ${name} ${(performance.now() - started).toFixed(1)}ms`,
  );
  return { db: drizzle(client, { schema }), client, close };
}
