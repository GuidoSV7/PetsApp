import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { createValidationPipe } from '../config/validation-pipe.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AuthController } from './auth.controller.js';
import { GlobalAuthGuard } from './guards/global-auth.guard.js';
import { GOOGLE_TOKEN_VERIFIER } from './google-token.verifier.js';
import { sessionCookieName } from './session-cookie.js';
import {
  TEST_JWT_SECRET,
  createTestEnv,
  type TestEnv,
} from './testing/auth-test-kit.js';
import { USER_REPOSITORY } from '../users/ports/user-repository.port.js';
import { InMemoryUserRepository } from '../users/testing/in-memory-user.repository.js';

const ORIGIN = 'https://app.example.com';
const SESSION_COOKIE = sessionCookieName(false);
const CREDENTIALS = {
  email: 'ada@example.com',
  password: 'initial-secret-1',
  name: 'Ada',
};

type Setup = { app: NestExpressApplication; users: InMemoryUserRepository };

/** Real AuthService: JWT sign/verify, in-memory repository. */
async function createAuthApp(throttleLimit?: number): Promise<Setup> {
  const env: TestEnv = createTestEnv({
    CLIENT_SECRET: 'test-client-secret',
    CORS_ORIGIN: ORIGIN,
  });
  const users = new InMemoryUserRepository();
  const moduleRef = await Test.createTestingModule({
    imports: [
      PassportModule,
      JwtModule.register({ secret: TEST_JWT_SECRET }),
      ...(throttleLimit
        ? [ThrottlerModule.forRoot([{ ttl: 60000, limit: throttleLimit }])]
        : []),
    ],
    controllers: [AuthController],
    providers: [
      { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
      JwtStrategy,
      AuthService,
      { provide: USER_REPOSITORY, useValue: users },
      {
        provide: GOOGLE_TOKEN_VERIFIER,
        useValue: {
          verify: vi.fn(async () => {
            throw new Error('unused in this spec');
          }),
        },
      },
      ...(throttleLimit
        ? [
            { provide: APP_GUARD, useClass: ThrottlerGuard },
            { provide: APP_GUARD, useClass: GlobalAuthGuard },
          ]
        : [{ provide: APP_GUARD, useClass: GlobalAuthGuard }]),
    ],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.use(cookieParser());
  app.useGlobalPipes(createValidationPipe());
  await app.init();
  return { app, users };
}

const setCookie = (res: request.Response): string[] =>
  (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];

const cookieValue = (res: request.Response): string => {
  const found = setCookie(res)
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split(';')[0] as string;
  expect(found).toBeDefined();
  return found as string;
};

const stored = async (users: InMemoryUserRepository) =>
  (await users.findByEmail(CREDENTIALS.email))!;

describe('POST /auth/change-password rotates the session (S6)', () => {
  let setup: Setup;
  let registered: request.Response;

  beforeAll(async () => {
    setup = await createAuthApp();
    registered = await register().expect(201);
  });

  afterAll(async () => {
    await setup?.app?.close();
  });

  const register = () =>
    request(setup.app.getHttpServer())
      .post('/auth/register')
      .set('Origin', ORIGIN)
      .send(CREDENTIALS);

  const changePassword = (cookie: string) =>
    request(setup.app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .send({
        currentPassword: CREDENTIALS.password,
        newPassword: 'renewed-secret-2',
      });

  const changePasswordWrong = (cookie: string) =>
    request(setup.app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .send({ currentPassword: 'wrong-pass', newPassword: 'renewed-secret-2' });

  it('still answers 401 Incorrect password and leaves the session usable (S6, unchanged behavior)', async () => {
    const cookie = cookieValue(registered);

    await changePasswordWrong(cookie);

    // No rotation: the original session still works and the hash is untouched.
    await request(setup.app.getHttpServer())
      .get('/auth/profile')
      .set('Cookie', cookie)
      .expect(200);
    const row = await stored(setup.users);
    expect(await bcrypt.compare(CREDENTIALS.password, row.password)).toBe(true);
  });

  it('returns a brand-new session and revokes the old one, with or without cookie', async () => {
    const oldCookie = cookieValue(registered);
    const originalToken = registered.body.token as string;

    const changed = await changePassword(oldCookie).expect(201);
    const newCookie = cookieValue(changed);
    expect(newCookie).not.toBe(oldCookie);
    expect(changed.body.token).not.toBe(originalToken);

    await request(setup.app.getHttpServer())
      .get('/auth/profile')
      .set('Cookie', oldCookie)
      .expect(401);
    await request(setup.app.getHttpServer())
      .get('/auth/profile')
      .set('Cookie', newCookie)
      .expect(200);
    // password was actually replaced
    const row = await stored(setup.users);
    expect(await bcrypt.compare('renewed-secret-2', row.password)).toBe(true);
  });
});

describe('POST /auth/change-password and /auth/verify-password rate limits (S7)', () => {
  let setup: Setup;
  let cookie: string;
  let initialRow: Awaited<ReturnType<InMemoryUserRepository['create']>>;

  beforeAll(async () => {
    setup = await createAuthApp(5);
    const registered = await request(setup.app.getHttpServer())
      .post('/auth/register')
      .set('Origin', ORIGIN)
      .send(CREDENTIALS)
      .expect(201);
    cookie = cookieValue(registered);
    initialRow = await stored(setup.users);
  });

  afterAll(async () => {
    await setup?.app?.close();
  });

  it('throttles change-password to 5 attempts per minute per IP (S7)', async () => {
    const wrong = () =>
      request(setup.app.getHttpServer())
        .post('/auth/change-password')
        .set('Cookie', cookie)
        .set('Origin', ORIGIN)
        .send({ currentPassword: 'wrong-pass', newPassword: 'renewed-secret-2' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await wrong().expect(401);
    }
    const blocked = await wrong().expect(429);
    expect(blocked.body).toMatchObject({ statusCode: 429 });
    // Rejected attempts keep the stored hash and session usable.
    const row = await stored(setup.users);
    expect(row.password).toBe(initialRow.password);
    await request(setup.app.getHttpServer())
      .get('/auth/profile')
      .set('Cookie', cookie)
      .expect(200);
  });

  it('throttles verify-password to 5 attempts per minute per IP (S7)', async () => {
    const wrong = () =>
      request(setup.app.getHttpServer())
        .post('/auth/verify-password')
        .set('Cookie', cookie)
        .set('Origin', ORIGIN)
        .send({ password: 'wrong-pass' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await wrong().expect(401);
    }
    await wrong().expect(429);
  });
});
