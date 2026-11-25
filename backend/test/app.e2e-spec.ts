import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterEach, beforeEach, describe, it } from 'vitest';

// The pool connects lazily, so AppModule boots without a reachable database.
process.env.JWT_SECRET ??= 'e2e-jwt-secret-of-at-least-32-characters';
process.env.DATABASE_URL ??=
  'postgresql://petsapp:petsapp@localhost:5432/petsapp';
process.env.NODE_ENV ??= 'test';

const { AppModule } = await import('./../src/app.module.js');

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET / is a public liveness probe', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /users/me is protected by the global guard', () => {
    return request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('GET /health/ready is public and answers 503 while the database is unreachable', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(503)
      .expect({ statusCode: 503, message: 'Database unavailable' });
  });

  afterEach(async () => {
    await app.close();
  });
});
