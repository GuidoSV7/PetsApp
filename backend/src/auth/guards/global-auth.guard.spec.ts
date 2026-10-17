import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Controller, Get, Post, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { sessionCookieName } from '../session-cookie.js';
import { GlobalAuthGuard } from './global-auth.guard.js';
import { Public } from '../decorators/public.decorator.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import {
  BLOCKED_ID,
  MEMBER_ID,
  TEST_CLIENT_SECRET,
  authTestModule,
  bearer,
  createTestEnv,
  expiredToken,
  signToken,
  type TestEnv,
} from '../testing/auth-test-kit.js';

@Controller('probe')
class ProbeController {
  @Get('open')
  @Public()
  open() {
    return { ok: true };
  }

  @Post('closed')
  write(@CurrentUser() user?: { id: string }) {
    return { ok: true, userId: user?.id ?? null };
  }

  @Get('closed')
  closed(@CurrentUser() user?: { id: string }) {
    return { ok: true, userId: user?.id ?? null };
  }
}

describe('GlobalAuthGuard (global authentication)', () => {
  let app: INestApplication;
  const env: TestEnv = createTestEnv();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [authTestModule(env)],
      controllers: [ProbeController],
      providers: [{ provide: APP_GUARD, useClass: GlobalAuthGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    for (const key of Object.keys(env)) delete env[key];
    Object.assign(env, createTestEnv({ CLIENT_SECRET: TEST_CLIENT_SECRET }));
  });

  const closed = () => request(app.getHttpServer()).get('/probe/closed');

  it('lets @Public routes through without credentials', async () => {
    await request(app.getHttpServer()).get('/probe/open').expect(200);
  });

  describe('JWT path', () => {
    it('accepts a valid token and populates request.user', async () => {
      const res = await closed()
        .set(bearer(signToken(MEMBER_ID)))
        .expect(200);
      expect(res.body.userId).toBe(MEMBER_ID);
    });

    it('rejects an unverified Bearer value', async () => {
      await closed().set(bearer('garbage')).expect(401);
    });

    it('rejects an expired token', async () => {
      await closed()
        .set(bearer(expiredToken(MEMBER_ID)))
        .expect(401);
    });

    it('rejects a token signed with another secret', async () => {
      const forged = signToken(MEMBER_ID, { secret: 'attacker-secret' });
      await closed().set(bearer(forged)).expect(401);
    });

    it('rejects a valid token of a blocked or unknown user', async () => {
      await closed()
        .set(bearer(signToken(BLOCKED_ID)))
        .expect(401);
      await closed()
        .set(bearer(signToken('missing-user')))
        .expect(401);
    });

    it('does not fall back to a valid client secret when the token is bad', async () => {
      await closed()
        .set(bearer('garbage'))
        .set('X-Client-Secret', TEST_CLIENT_SECRET)
        .expect(401);
    });
  });

  describe('X-Client-Secret path', () => {
    it('accepts the configured secret', async () => {
      await closed().set('X-Client-Secret', TEST_CLIENT_SECRET).expect(200);
    });

    it('rejects a wrong secret', async () => {
      await closed().set('X-Client-Secret', 'nope').expect(401);
    });

    it('rejects a request without any credentials', async () => {
      await closed().expect(401);
    });

    it.each([
      ['PROD=production', { PROD: 'production' }],
      ['NODE_ENV=production', { NODE_ENV: 'production' }],
      ['NODE_ENV unset', { NODE_ENV: undefined }],
    ])('fails closed when CLIENT_SECRET is missing (%s)', async (_, extra) => {
      Object.assign(env, { CLIENT_SECRET: undefined, ...extra });
      await closed().expect(401);
      await closed().set('X-Client-Secret', 'anything').expect(401);
    });

    it('keeps the open dev mode only for NODE_ENV=development without a secret', async () => {
      Object.assign(env, { CLIENT_SECRET: undefined, NODE_ENV: 'development' });
      await closed().expect(200);
      await closed().set(bearer('garbage')).expect(401);
    });

    it('treats PROD=production as production even with NODE_ENV=development', async () => {
      Object.assign(env, {
        CLIENT_SECRET: undefined,
        NODE_ENV: 'development',
        PROD: 'production',
      });
      await closed().expect(401);
    });
  });
  describe('session cookie path', () => {
    const ORIGIN = 'https://app.example.com';
    const cookie = (sub: string) =>
      `${sessionCookieName(false)}=${signToken(sub)}`;

    beforeEach(() => {
      Object.assign(env, { CORS_ORIGIN: ORIGIN });
    });

    it('authenticates a GET with the cookie and no CSRF check', async () => {
      const res = await closed().set('Cookie', cookie(MEMBER_ID)).expect(200);
      expect(res.body.userId).toBe(MEMBER_ID);
    });

    it('accepts a POST from an allowed Origin', async () => {
      const res = await request(app.getHttpServer())
        .post('/probe/closed')
        .set('Cookie', cookie(MEMBER_ID))
        .set('Origin', ORIGIN)
        .expect(201);
      expect(res.body.userId).toBe(MEMBER_ID);
    });

    it('answers 403 to a cookie POST from a foreign Origin before passport runs', async () => {
      await request(app.getHttpServer())
        .post('/probe/closed')
        .set('Cookie', cookie(MEMBER_ID))
        .set('Origin', 'https://evil.test')
        .expect(403);
    });

    it('answers 403, not 401, even when the cookie token is garbage and the Origin is foreign', async () => {
      await request(app.getHttpServer())
        .post('/probe/closed')
        .set('Cookie', `${sessionCookieName(false)}=garbage`)
        .set('Origin', 'https://evil.test')
        .expect(403);
    });

    it('rejects a cookie POST with no Origin and no Sec-Fetch-Site', async () => {
      await request(app.getHttpServer())
        .post('/probe/closed')
        .set('Cookie', cookie(MEMBER_ID))
        .expect(403);
    });

    it('accepts a cookie POST with Sec-Fetch-Site: same-origin', async () => {
      await request(app.getHttpServer())
        .post('/probe/closed')
        .set('Cookie', cookie(MEMBER_ID))
        .set('Sec-Fetch-Site', 'same-origin')
        .expect(201);
    });

    it('lets a Bearer header POST without a session cookie skip the CSRF check', async () => {
      await request(app.getHttpServer())
        .post('/probe/closed')
        .set(bearer(signToken(MEMBER_ID)))
        .set('Origin', 'https://evil.test')
        .expect(201);
    });

    it('answers 403 to a garbage Bearer plus a session cookie on a cross-origin POST', async () => {
      await request(app.getHttpServer())
        .post('/probe/closed')
        .set(bearer('garbage'))
        .set('Cookie', cookie(MEMBER_ID))
        .set('Origin', 'https://evil.test')
        .expect(403);
    });

    it('answers 403 to a valid Bearer plus a session cookie on a cross-origin POST', async () => {
      await request(app.getHttpServer())
        .post('/probe/closed')
        .set(bearer(signToken(MEMBER_ID)))
        .set('Cookie', cookie(MEMBER_ID))
        .set('Origin', 'https://evil.test')
        .expect(403);
    });

    it('does not authenticate through the cookie when the Bearer header is garbage', async () => {
      await request(app.getHttpServer())
        .post('/probe/closed')
        .set(bearer('garbage'))
        .set('Cookie', cookie(MEMBER_ID))
        .set('Origin', ORIGIN)
        .expect(401);
    });

    it('rejects an invalid cookie token on a safe request', async () => {
      await closed()
        .set('Cookie', `${sessionCookieName(false)}=garbage`)
        .expect(401);
    });

    it('keeps the X-Client-Secret path when there is no cookie', async () => {
      await request(app.getHttpServer())
        .post('/probe/closed')
        .set('X-Client-Secret', TEST_CLIENT_SECRET)
        .set('Origin', 'https://evil.test')
        .expect(201);
    });

    describe('in production', () => {
      const PROD_NAME = sessionCookieName(true);

      beforeEach(() => {
        Object.assign(env, { NODE_ENV: 'production' });
      });

      it('authenticates with the __Host- cookie and runs the Origin check on it', async () => {
        const value = `${PROD_NAME}=${signToken(MEMBER_ID)}`;

        await closed().set('Cookie', value).expect(200);
        await request(app.getHttpServer())
          .post('/probe/closed')
          .set('Cookie', value)
          .set('Origin', 'https://evil.test')
          .expect(403);
      });

      it('ignores the development cookie name', async () => {
        await closed().set('Cookie', cookie(MEMBER_ID)).expect(401);
      });
    });

    it('ignores unrelated cookies', async () => {
      await closed().set('Cookie', 'theme=dark').expect(401);
      await closed()
        .set('Cookie', 'theme=dark')
        .set('X-Client-Secret', TEST_CLIENT_SECRET)
        .expect(200);
    });
  });
});
