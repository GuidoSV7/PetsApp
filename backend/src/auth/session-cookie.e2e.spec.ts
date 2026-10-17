import { afterEach, describe, expect, it, vi } from 'vitest';
import { Controller, Get, Req, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AdminUsersController } from '../users/controllers/admin-users.controller.js';
import { UsersService } from '../users/users.service.js';
import { Public } from './decorators/public.decorator.js';
import { configureHttpApp } from '../config/http-setup.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GlobalAuthGuard } from './guards/global-auth.guard.js';
import { sessionCookieName } from './session-cookie.js';
import {
  ADMIN_ID,
  TEST_CLIENT_SECRET,
  TEST_JWT_SECRET,
  authTestModule,
  bearer,
  createTestEnv,
  signToken,
  type TestEnv,
} from './testing/auth-test-kit.js';

const ORIGIN = 'https://app.example.com';
const SESSION_COOKIE = sessionCookieName(false);
const PROD_COOKIE = sessionCookieName(true);
const TWELVE_HOURS = 12 * 60 * 60;
const ID = '11111111-1111-4111-8111-111111111111';

@Controller('probe')
class IpProbeController {
  @Get('ip')
  @Public()
  ip(@Req() req: Request) {
    return { ip: req.ip };
  }
}

const apps: INestApplication[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createApp(
  overrides: TestEnv = {},
  loginToken: string = signToken(ADMIN_ID, { expiresIn: TWELVE_HOURS }),
) {
  const env = createTestEnv({
    CLIENT_SECRET: TEST_CLIENT_SECRET,
    CORS_ORIGIN: ORIGIN,
    ...overrides,
  });
  const usersService = {
    findAllComplete: vi.fn().mockResolvedValue([]),
    toggleBlock: vi.fn().mockResolvedValue({ id: ID, isBlocked: true }),
  };
  const authService = {
    login: vi.fn().mockResolvedValue({
      user: { id: ADMIN_ID },
      token: loginToken,
    }),
  };
  const moduleRef = await Test.createTestingModule({
    imports: [authTestModule(env)],
    controllers: [AuthController, AdminUsersController, IpProbeController],
    providers: [
      { provide: APP_GUARD, useClass: GlobalAuthGuard },
      { provide: AuthService, useValue: authService },
      { provide: UsersService, useValue: usersService },
    ],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureHttpApp(app, env);
  await app.init();
  apps.push(app);
  return { app, usersService, authService };
}

const setCookie = (res: request.Response): string[] =>
  (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];

const sessionCookie = (res: request.Response): string => {
  const found = setCookie(res).find(
    (c) =>
      c.startsWith(`${SESSION_COOKIE}=`) || c.startsWith(`${PROD_COOKIE}=`),
  );
  expect(found).toBeDefined();
  return found as string;
};

const login = (app: INestApplication) =>
  request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'admin@test.local', password: 'secret' });

const tokenWithoutExp = () =>
  new JwtService({ secret: TEST_JWT_SECRET }).sign({
    sub: ADMIN_ID,
    email: 'admin@test.local',
  });

describe('POST /auth/login', () => {
  it('sets an HttpOnly, SameSite=Lax, Path=/ cookie and still returns the token', async () => {
    const { app } = await createApp();

    const res = await login(app).expect(201);
    const cookie = sessionCookie(res);

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Domain=/i);
    expect(cookie).not.toMatch(/Secure/i);
    const maxAge = Number(/Max-Age=(\d+)/i.exec(cookie)?.[1]);
    expect(maxAge).toBeGreaterThan(TWELVE_HOURS - 5);
    expect(maxAge).toBeLessThanOrEqual(TWELVE_HOURS);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: ADMIN_ID });
  });

  it('marks the cookie Secure in production', async () => {
    const { app } = await createApp({ NODE_ENV: 'production' });

    const res = await login(app).expect(201);

    expect(sessionCookie(res)).toMatch(/Secure/i);
  });

  it('puts the same token in the cookie as in the body', async () => {
    const { app } = await createApp();

    const res = await login(app).expect(201);

    expect(sessionCookie(res)).toContain(`${SESSION_COOKIE}=${res.body.token}`);
  });
});

describe('POST /auth/login cookie in production', () => {
  it('uses the __Host- cookie: Secure, Path=/, no Domain', async () => {
    const { app } = await createApp({ NODE_ENV: 'production' });

    const res = await login(app).expect(201);
    const cookie = setCookie(res).find((c) => c.startsWith(`${PROD_COOKIE}=`));

    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Domain=/i);
    expect(setCookie(res).some((c) => c.startsWith(`${SESSION_COOKIE}=`))).toBe(
      false,
    );
  });
});

describe('POST /auth/login without an exp claim', () => {
  it('issues a session cookie, never Max-Age=0', async () => {
    const { app } = await createApp({}, tokenWithoutExp());

    const res = await login(app).expect(201);
    const cookie = sessionCookie(res);

    expect(cookie).not.toMatch(/Max-Age/i);
    expect(cookie).not.toMatch(/Expires=/i);
  });
});

describe('login and logout origin check', () => {
  const credentials = { email: 'admin@test.local', password: 'secret' };
  const sessionValue = `${SESSION_COOKIE}=${signToken(ADMIN_ID)}`;

  it('answers 403 to a cross-site form POST to login and never authenticates', async () => {
    const { app, authService } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'https://evil.test')
      .type('form')
      .send(credentials)
      .expect(403);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('answers 403 when the browser marks the login as cross-site (no Origin)', async () => {
    const { app } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Sec-Fetch-Site', 'cross-site')
      .send(credentials)
      .expect(403);
  });

  it('accepts login from the allowed frontend Origin', async () => {
    const { app } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', ORIGIN)
      .send(credentials)
      .expect(201);
  });

  it('keeps cookie-less curl / server-to-server login working', async () => {
    const { app } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(201);
  });

  it('rejects a login with a session cookie and neither Origin nor Sec-Fetch-Site', async () => {
    const { app } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Cookie', sessionValue)
      .send(credentials)
      .expect(403);
  });

  it('answers 403 to a cross-site logout, so a foreign page cannot force a sign-out', async () => {
    const { app } = await createApp();

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', sessionValue)
      .set('Origin', 'https://evil.test')
      .expect(403);

    expect(setCookie(res)).toEqual([]);
  });

  it('rejects a cookie logout with neither Origin nor Sec-Fetch-Site', async () => {
    const { app } = await createApp();

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', sessionValue)
      .expect(403);
  });

  it('accepts logout from the allowed Origin', async () => {
    const { app } = await createApp();

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', sessionValue)
      .set('Origin', ORIGIN)
      .expect(204);

    expect(sessionCookie(res)).toMatch(/^petsapp_session=;/);
  });

  it('uses the __Host- cookie name to detect a session in production', async () => {
    const { app } = await createApp({ NODE_ENV: 'production' });

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', `${PROD_COOKIE}=${signToken(ADMIN_ID)}`)
      .expect(403);
  });
});

describe('cookie-authenticated requests', () => {
  const cookie = `${SESSION_COOKIE}=${signToken(ADMIN_ID)}`;

  it('authenticates a GET with the cookie', async () => {
    const { app } = await createApp();

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Cookie', cookie)
      .expect(200);
  });

  it('answers 403 to a cross-origin POST and never reaches the service', async () => {
    const { app, usersService } = await createApp();

    await request(app.getHttpServer())
      .post(`/admin/users/${ID}/toggle-block`)
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.test')
      .send({})
      .expect(403);

    expect(usersService.toggleBlock).not.toHaveBeenCalled();
  });

  it('accepts the same POST from the allowed frontend Origin', async () => {
    const { app, usersService } = await createApp();

    await request(app.getHttpServer())
      .post(`/admin/users/${ID}/toggle-block`)
      .set('Cookie', cookie)
      .set('Origin', ORIGIN)
      .send({})
      .expect(201);

    expect(usersService.toggleBlock).toHaveBeenCalledTimes(1);
  });

  it('keeps Bearer authentication working without the CSRF check when there is no cookie', async () => {
    const { app } = await createApp();

    await request(app.getHttpServer())
      .post(`/admin/users/${ID}/toggle-block`)
      .set(bearer(signToken(ADMIN_ID)))
      .set('Origin', 'https://evil.test')
      .send({})
      .expect(201);
  });
});

describe('POST /auth/logout', () => {
  it('answers 204 and expires the cookie with the login attributes', async () => {
    const { app } = await createApp();

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(204);
    const cookie = sessionCookie(res);

    expect(cookie).toMatch(/^petsapp_session=;/);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
  });

  it('expires a Secure cookie in production', async () => {
    const { app } = await createApp({ NODE_ENV: 'production' });

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(204);

    expect(sessionCookie(res)).toMatch(/Secure/i);
  });
});

describe('trust proxy', () => {
  it('uses the forwarded client address behind one proxy hop in production', async () => {
    const { app } = await createApp({ NODE_ENV: 'production' });

    const res = await request(app.getHttpServer())
      .get('/probe/ip')
      .set('X-Forwarded-For', '203.0.113.9')
      .expect(200);

    expect(res.body.ip).toBe('203.0.113.9');
  });

  it('honours only the last hop, so a spoofed first entry is ignored', async () => {
    const { app } = await createApp({ NODE_ENV: 'production' });

    const res = await request(app.getHttpServer())
      .get('/probe/ip')
      .set('X-Forwarded-For', '6.6.6.6, 203.0.113.9')
      .expect(200);

    expect(res.body.ip).toBe('203.0.113.9');
  });

  it('ignores X-Forwarded-For outside production by default', async () => {
    const { app } = await createApp();

    const res = await request(app.getHttpServer())
      .get('/probe/ip')
      .set('X-Forwarded-For', '203.0.113.9')
      .expect(200);

    expect(res.body.ip).not.toBe('203.0.113.9');
  });

  it('follows TRUST_PROXY when set', async () => {
    const { app } = await createApp({ TRUST_PROXY: '2' });

    const res = await request(app.getHttpServer())
      .get('/probe/ip')
      .set('X-Forwarded-For', '203.0.113.9, 10.0.0.1')
      .expect(200);

    expect(res.body.ip).toBe('203.0.113.9');
  });
});
