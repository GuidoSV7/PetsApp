import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createValidationPipe } from '../config/validation-pipe.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { configureHttpApp } from '../config/http-setup.js';
import {
  ADMIN_ID,
  TEST_CLIENT_SECRET,
  authTestModule,
  bearer,
  createTestEnv,
  signToken,
} from './testing/auth-test-kit.js';

const ORIGIN = 'https://app.example.com';
const OVER = 'x'.repeat(73);
const EXACT = 'y'.repeat(72);

const apps: NestExpressApplication[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createApp() {
  const env = createTestEnv({
    CLIENT_SECRET: TEST_CLIENT_SECRET,
    CORS_ORIGIN: ORIGIN,
  });
  const session = { user: { id: ADMIN_ID }, token: 'jwt-t' };
  const authService = {
    login: vi.fn(async () => session),
    register: vi.fn(async () => session),
    changePassword: vi.fn(async () => ({ message: 'ok', ...session })),
    verifyPassword: vi.fn(async () => ({ verified: true })),
  };
  const moduleRef = await Test.createTestingModule({
    imports: [authTestModule(env)],
    controllers: [AuthController],
    providers: [{ provide: AuthService, useValue: authService }],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.useGlobalPipes(createValidationPipe());
  configureHttpApp(app, env);
  await app.init();
  apps.push(app);
  return { app, authService };
}

describe('password byte limits (S9)', () => {
  it('rejects a login password longer than 72 bytes with 400 and never reaches the service (S9)', async () => {
    const { app, authService } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@example.com', password: OVER })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('accepts an exactly 72-byte ASCII login password (S9)', async () => {
    const { app, authService } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@example.com', password: EXACT })
      .expect(201);

    expect(authService.login).toHaveBeenCalledTimes(1);
  });

  it('counts UTF-8 bytes, not characters: 36 "ñ" fit, 37 do not (S9)', async () => {
    const { app, authService } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@example.com', password: 'ñ'.repeat(36) })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@example.com', password: 'ñ'.repeat(37) })
      .expect(400);

    expect(authService.login).toHaveBeenCalledTimes(1);
  });

  it('rejects a register password longer than 72 bytes (S9)', async () => {
    const { app, authService } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'a@example.com', password: OVER, name: 'Ada' })
      .expect(400);

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('rejects a change-password newPassword longer than 72 bytes (S9)', async () => {
    const { app, authService } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set(bearer(signToken(ADMIN_ID)))
      .send({ currentPassword: 'whatever', newPassword: OVER })
      .expect(400);

    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('rejects a verify-password password longer than 72 bytes (S9)', async () => {
    const { app, authService } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/verify-password')
      .set(bearer(signToken(ADMIN_ID)))
      .send({ password: OVER })
      .expect(400);

    expect(authService.verifyPassword).not.toHaveBeenCalled();
  });
});
