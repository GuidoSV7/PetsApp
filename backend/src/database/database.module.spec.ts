import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { poolInstances } = vi.hoisted(() => ({
  poolInstances: [] as Array<{
    options: Record<string, unknown>;
    end: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('pg', () => {
  class Pool {
    options: Record<string, unknown>;
    end = vi.fn().mockResolvedValue(undefined);
    constructor(options: Record<string, unknown>) {
      this.options = options;
      poolInstances.push(this);
    }
  }
  return { Pool, default: { Pool } };
});

import { DatabaseModule } from './database.module.js';
import { DRIZZLE, PG_POOL } from './database.tokens.js';

const build = async (env: Record<string, string>) =>
  Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        skipProcessEnv: true,
        load: [() => env],
      }),
      DatabaseModule,
    ],
  }).compile();

const base = { DATABASE_URL: 'postgresql://pets:secret@db.local:5433/petsapp' };

describe('DatabaseModule', () => {
  beforeEach(() => {
    poolInstances.length = 0;
  });
  afterEach(() => vi.clearAllMocks());

  it('builds the pool from DATABASE_URL', async () => {
    const moduleRef = await build(base);
    const pool = moduleRef.get(PG_POOL);

    expect(pool).toBe(poolInstances[0]);
    expect(poolInstances[0].options).toEqual({
      connectionString: base.DATABASE_URL,
      ssl: false,
      max: 10,
      connectionTimeoutMillis: 5000,
    });
  });

  it('refuses to start without DATABASE_URL', async () => {
    await expect(build({})).rejects.toThrow(/DATABASE_URL/);
  });

  it('honors DB_POOL_MAX and the shared SSL resolver', async () => {
    await build({
      ...base,
      DB_POOL_MAX: '7',
      DATABASE_SSL: 'true',
      DATABASE_SSL_REJECT_UNAUTHORIZED: 'false',
    });
    expect(poolInstances[0].options).toMatchObject({
      max: 7,
      ssl: { rejectUnauthorized: false },
    });
  });

  it('honors DB_CONNECTION_TIMEOUT_MS', async () => {
    await build({ ...base, DB_CONNECTION_TIMEOUT_MS: '1500' });
    expect(poolInstances[0].options.connectionTimeoutMillis).toBe(1500);
  });

  it.each(['', 'abc', '0', '-1'])(
    'falls back to 5000 ms when DB_CONNECTION_TIMEOUT_MS=%j',
    async (value) => {
      await build({ ...base, DB_CONNECTION_TIMEOUT_MS: value });
      expect(poolInstances[0].options.connectionTimeoutMillis).toBe(5000);
    },
  );

  it('provides a drizzle instance bound to the pool', async () => {
    const moduleRef = await build(base);
    const db = moduleRef.get<{ $client: unknown }>(DRIZZLE);
    expect(db.$client).toBe(moduleRef.get(PG_POOL));
  });

  it('closes the pool exactly once on shutdown', async () => {
    const moduleRef = await build(base);
    await moduleRef.init();
    await moduleRef.close();
    expect(poolInstances[0].end).toHaveBeenCalledTimes(1);
  });

  it.each(['', 'abc', '0', '-1', '2.5'])(
    'falls back to a pool of 10 when DB_POOL_MAX=%j',
    async (value) => {
      await build({ ...base, DB_POOL_MAX: value });
      expect(poolInstances[0].options.max).toBe(10);
    },
  );

  describe('with runner env set', () => {
    const leaked = { PROD: 'production', DB_POOL_MAX: '99' } as const;
    const saved: Record<string, string | undefined> = {};

    beforeEach(() => {
      for (const [key, value] of Object.entries(leaked)) {
        saved[key] = process.env[key];
        process.env[key] = value;
      }
    });

    afterEach(() => {
      for (const key of Object.keys(leaked)) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    });

    it('ignores process.env and only uses the loaded config', async () => {
      await build(base);
      expect(poolInstances[0].options).toMatchObject({ ssl: false, max: 10 });
    });
  });
});
