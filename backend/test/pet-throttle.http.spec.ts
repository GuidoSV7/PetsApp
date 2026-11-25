import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureHttpApp } from '../src/config/http-setup.js';
import { DRIZZLE, PG_POOL } from '../src/database/database.tokens.js';
import { createTestDb, type TestDb } from '../src/testing/postgres.js';

const GUEST = '55555555-5555-4555-8555-555555555555';

/**
 * Per-client throttle on the pet endpoints (S4): creation/read 60 per minute,
 * `POST /pet/actions/:action` 30 per minute, 429 beyond.
 */
describe('pet endpoint throttling (HTTP)', () => {
  let app: NestExpressApplication;
  let fixture: TestDb;

  beforeAll(async () => {
    fixture = await createTestDb();
    // AppModule must never load a real environment file, even during RED.
    const forRoot = ConfigModule.forRoot.bind(ConfigModule);
    vi.spyOn(ConfigModule, 'forRoot').mockImplementation((options) =>
      forRoot({ ...options, ignoreEnvFile: true }),
    );
    const { AppModule } = await import('../src/app.module.js');
    const values: Record<string, string> = {
      NODE_ENV: 'test',
      PROD: 'test',
      TRUST_PROXY: '0',
      JWT_SECRET: 'throttle-http-test-secret-at-least-32-characters',
      JWT_EXPIRES_IN: '12h',
      DATABASE_URL: 'postgresql://must-not-be-used.invalid/application',
    };
    const config = {
      get: (key: string) => values[key],
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(PG_POOL)
      .useValue({ end: async () => undefined, query: async () => ({ rows: [] }) })
      .overrideProvider(DRIZZLE)
      .useValue(fixture.db)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureHttpApp(app, { NODE_ENV: 'test', TRUST_PROXY: '0' });
    await app.init();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture?.close();
      vi.restoreAllMocks();
    }
  });

  it('allows 60 pet state reads per minute and throttles the 61st with 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 61; i++) {
      const response = await request(app.getHttpServer())
        .get('/pet/state')
        .set('X-Pet-Guest-Key', GUEST);
      statuses.push(response.status);
    }
    expect(statuses.filter((s) => s === 200)).toHaveLength(60);
    expect(statuses.filter((s) => s === 429)).toHaveLength(1);
    expect(statuses.filter((s) => s >= 500)).toHaveLength(0);
  });

  it('allows 30 care actions per minute and throttles the 31st with 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const response = await request(app.getHttpServer())
        .post('/pet/actions/pet')
        .set('X-Pet-Guest-Key', GUEST);
      statuses.push(response.status);
    }
    expect(statuses.filter((s) => s === 201)).toHaveLength(30);
    expect(statuses.filter((s) => s === 429)).toHaveLength(1);
    expect(statuses.filter((s) => s >= 500)).toHaveLength(0);
  });
});
