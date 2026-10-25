import { afterEach, describe, expect, inject, it, vi } from 'vitest';
import type { TestProject } from 'vitest/node';
import pg from 'pg';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestDb } from './postgres.js';
import setup from './postgres.global-setup.js';
import {
  allocateFixture,
  databaseUrl,
  listRunDatabases,
  newRunContext,
  startTestRun,
} from './postgres-lifecycle.js';

const REQUIRED =
  'TEST_DATABASE_URL is required for database tests; provide an isolated PostgreSQL test database URL.';
const testUrl = process.env.TEST_DATABASE_URL!;

async function audit<T extends pg.QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  const client = new pg.Client({
    connectionString: databaseUrl(testUrl, 'postgres'),
  });
  await client.connect();
  try {
    return (await client.query<T>(sql, values)).rows;
  } finally {
    await client.end();
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('PostgreSQL test fixtures', () => {
  it('requires the test URL before any connection, ignoring production configuration', async () => {
    vi.stubEnv('TEST_DATABASE_URL', undefined);
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://must-not-be-used.invalid/production',
    );
    const connect = vi.spyOn(pg.Pool.prototype, 'connect');
    await expect(createTestDb()).rejects.toThrow(REQUIRED);
    expect(connect).not.toHaveBeenCalled();
  });

  it.each([' ', 'not a URL', 'https://example.invalid/test'])(
    'rejects invalid test URL %j without connecting',
    async (value) => {
      vi.stubEnv('TEST_DATABASE_URL', value);
      const connect = vi.spyOn(pg.Pool.prototype, 'connect');
      await expect(createTestDb()).rejects.toThrow(
        value.trim() ? 'TEST_DATABASE_URL must be a PostgreSQL URL.' : REQUIRED,
      );
      expect(connect).not.toHaveBeenCalled();
    },
  );

  it('does not connect or provide a template when global setup has no test URL', async () => {
    vi.stubEnv('TEST_DATABASE_URL', undefined);
    const connect = vi.spyOn(pg.Pool.prototype, 'connect');
    const provide = vi.fn();
    expect(await setup({ provide } as unknown as TestProject)).toBeUndefined();
    expect(provide).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  it('receives the migrated connection-free run template through provide/inject', async () => {
    const context = inject('postgresTestRun');
    const template = await audit<{
      datistemplate: boolean;
      datallowconn: boolean;
      sessions: number;
    }>(
      'SELECT datistemplate, datallowconn, (SELECT count(*)::int FROM pg_stat_activity WHERE datname=$1) AS sessions FROM pg_database WHERE datname=$1',
      [context.template],
    );
    expect(template).toEqual([
      { datistemplate: true, datallowconn: false, sessions: 0 },
    ]);
    const fixture = await createTestDb();
    try {
      expect(
        (await fixture.client.query('SELECT code FROM roles ORDER BY code'))
          .rows,
      ).toEqual([
        { code: 'admin' },
        { code: 'member' },
        { code: 'super_admin' },
      ]);
      expect(
        Number(
          (
            await fixture.client.query(
              'SELECT count(*) FROM drizzle.__drizzle_migrations',
            )
          ).rows[0].count,
        ),
      ).toBeGreaterThan(0);
    } finally {
      await fixture.close();
    }
  });

  it('clones concurrently with isolated same-key writes and independent truncate', async () => {
    const fixtures = await Promise.all([createTestDb(), createTestDb()]);
    try {
      const names = await Promise.all(
        fixtures.map(
          async ({ client }) =>
            (await client.query('SELECT current_database() AS name')).rows[0]
              .name,
        ),
      );
      expect(names[0]).not.toBe(names[1]);
      await Promise.all(
        fixtures.map(async ({ client }, index) => {
          await client.query(
            'CREATE TABLE fixture_probe (id integer PRIMARY KEY, value text NOT NULL)',
          );
          await client.query('INSERT INTO fixture_probe VALUES (1, $1)', [
            index === 0 ? 'first' : 'second',
          ]);
        }),
      );
      expect(
        (await fixtures[0].client.query('SELECT * FROM fixture_probe')).rows,
      ).toEqual([{ id: 1, value: 'first' }]);
      expect(
        (await fixtures[1].client.query('SELECT * FROM fixture_probe')).rows,
      ).toEqual([{ id: 1, value: 'second' }]);
      await fixtures[0].client.query('TRUNCATE fixture_probe');
      expect(
        (await fixtures[0].client.query('SELECT * FROM fixture_probe')).rows,
      ).toEqual([]);
      expect(
        (await fixtures[1].client.query('SELECT * FROM fixture_probe')).rows,
      ).toEqual([{ id: 1, value: 'second' }]);
    } finally {
      await Promise.all(fixtures.map((fixture) => fixture.close()));
    }
  });

  it('assigns a fresh database name to every allocation', async () => {
    const names: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const fixture = await createTestDb();
      try {
        names.push(
          (await fixture.client.query('SELECT current_database() AS name'))
            .rows[0].name,
        );
      } finally {
        await fixture.close();
      }
    }
    expect(new Set(names).size).toBe(3);
  });

  it('disposes the owned clone idempotently, including simultaneous close calls', async () => {
    const fixture = await createTestDb();
    const name = (
      await fixture.client.query('SELECT current_database() AS name')
    ).rows[0].name;
    await Promise.all([fixture.close(), fixture.close()]);
    await fixture.close();
    expect(
      await audit('SELECT datname FROM pg_database WHERE datname=$1', [name]),
    ).toEqual([]);
    expect(
      await audit('SELECT datname FROM pg_database WHERE datname=$1', [
        inject('postgresTestRun').template,
      ]),
    ).toHaveLength(1);
  });

  it('global teardown removes leftover clones and unmarks/drops only its own template', async () => {
    const provided = new Map<string, unknown>();
    const teardown = await setup({
      provide: (key: string, value: unknown) => provided.set(key, value),
    } as unknown as TestProject);
    const context = provided.get('postgresTestRun') as ReturnType<
      typeof newRunContext
    >;
    try {
      const leftover = await allocateFixture(testUrl, context);
      await leftover.client.end(); // Deliberately leave its database for global teardown.
      expect(await listRunDatabases(testUrl, context)).toHaveLength(2);
    } finally {
      await teardown!();
    }
    await teardown!();
    expect(await listRunDatabases(testUrl, context)).toEqual([]);
    expect(
      await audit('SELECT datname FROM pg_database WHERE datname=$1', [
        inject('postgresTestRun').template,
      ]),
    ).toHaveLength(1);
  });

  it('cleans partial template creation when migration setup fails', async () => {
    const context = newRunContext();
    const emptyMigrations = await mkdtemp(
      join(tmpdir(), 'petsapp-empty-migrations-'),
    );
    try {
      await expect(
        startTestRun(testUrl, context, emptyMigrations),
      ).rejects.toThrow();
      expect(await listRunDatabases(testUrl, context)).toEqual([]);
    } finally {
      await rm(emptyMigrations, { recursive: true });
    }
  });
});
