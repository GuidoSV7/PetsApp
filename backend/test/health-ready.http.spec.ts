import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestDb, type TestDb } from '../src/testing/postgres.js';
import { readTestUrl } from '../src/testing/postgres-lifecycle.js';

process.env.JWT_SECRET ??= 'health-ready-jwt-secret-of-at-least-32-characters';
process.env.NODE_ENV ??= 'test';

/**
 * Readiness with a reachable database (S8): `GET /health/ready` is public and
 * answers ok when `SELECT 1` succeeds.
 */
describe('GET /health/ready (reachable database)', () => {
  let app: INestApplication<App>;
  let fixture: TestDb;

  beforeAll(async () => {
    fixture = await createTestDb();
    process.env.DATABASE_URL = readTestUrl();
    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture?.close();
    }
  });

  it('answers ok without any credentials (public)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
