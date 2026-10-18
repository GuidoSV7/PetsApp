import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GlobalAuthGuard } from './guards/global-auth.guard.js';
import {
  ADMIN_ID,
  MEMBER_ID,
  SUPER_ADMIN_ID,
  TEST_CLIENT_SECRET,
  authTestModule,
  bearer,
  createTestEnv,
  signToken,
  type TestEnv,
} from './testing/auth-test-kit.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/users.module.js';
import { UsersService } from '../users/users.service.js';
import { RolesModule } from '../roles/roles.module.js';
import { RolesService } from '../roles/roles.service.js';

/** Persistence-free service double: every method resolves to `{}`. */
function serviceStub(): object {
  return new Proxy(
    {},
    {
      get: (_, key) =>
        typeof key === 'string' && !/^(then|constructor|on|before)/.test(key)
          ? () => Promise.resolve({})
          : undefined,
    },
  );
}

const ID = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'https://app.example.com';
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

const ADMIN_ONLY: Array<[Method, string]> = [
  ['get', '/admin/users'],
  ['get', `/admin/users/${ID}`],
  ['patch', `/admin/users/${ID}`],
  ['post', `/admin/users/${ID}/toggle-block`],
  ['get', '/admin/roles'],
];

const SUPER_ADMIN_ONLY: Array<[Method, string, object]> = [
  ['post', '/admin/roles', { name: 'Vet', permissions: ['users:read'] }],
  ['patch', '/admin/roles/admin', { active: false }],
  ['put', `/admin/users/${ID}/roles`, { roles: ['admin'] }],
];

const AUTHENTICATED: Array<[Method, string]> = [
  ['get', '/users/me'],
  ['patch', '/users/me'],
  ['get', '/auth/profile'],
];

describe('route guards (real modules, stubbed persistence)', () => {
  let app: INestApplication;
  const env: TestEnv = createTestEnv();

  beforeAll(async () => {
    const builder = Test.createTestingModule({
      imports: [authTestModule(env), UsersModule, RolesModule],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: serviceStub() },
        { provide: APP_GUARD, useClass: GlobalAuthGuard },
      ],
    })
      .overrideProvider(UsersService)
      .useValue(serviceStub())
      .overrideProvider(RolesService)
      .useValue(serviceStub());
    app = (await builder.compile()).createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    for (const key of Object.keys(env)) delete env[key];
    Object.assign(
      env,
      createTestEnv({ CLIENT_SECRET: TEST_CLIENT_SECRET, CORS_ORIGIN: ORIGIN }),
    );
  });

  const call = (method: Method, path: string, body: object = {}) => {
    const req = request(app.getHttpServer())[method](path);
    return method === 'get' ? req : req.send(body);
  };
  const admin = bearer(signToken(ADMIN_ID));
  const member = bearer(signToken(MEMBER_ID));
  const superAdmin = bearer(signToken(SUPER_ADMIN_ID));

  describe.each(ADMIN_ONLY)('admin-only %s %s', (method, path) => {
    it('returns 401 without a token', async () => {
      await call(method, path).expect(401);
    });

    it('returns 401 with an unverified Bearer value', async () => {
      await call(method, path).set(bearer('garbage')).expect(401);
    });

    it('returns 403 for a valid MEMBER token', async () => {
      await call(method, path).set(member).expect(403);
    });

    it('lets a valid ADMIN token through the guards', async () => {
      const res = await call(method, path).set(admin);
      expect([401, 403, 404]).not.toContain(res.status);
    });

    it('lets a SUPER_ADMIN token through too (it outranks admin)', async () => {
      const res = await call(method, path).set(superAdmin);
      expect([401, 403, 404]).not.toContain(res.status);
    });
  });

  describe.each(SUPER_ADMIN_ONLY)(
    'super-admin-only %s %s',
    (method, path, body) => {
      it('returns 403 for a valid ADMIN token', async () => {
        await call(method, path, body).set(admin).expect(403);
      });

      it('lets a valid SUPER_ADMIN token through the guards', async () => {
        const res = await call(method, path, body).set(superAdmin);
        expect([401, 403, 404]).not.toContain(res.status);
      });
    },
  );

  describe.each(AUTHENTICATED)('authenticated %s %s', (method, path) => {
    it('rejects missing and unverified credentials', async () => {
      await call(method, path).expect(401);
      await call(method, path).set(bearer('garbage')).expect(401);
    });

    it('accepts a valid MEMBER token', async () => {
      const res = await call(method, path).set(member);
      expect(res.status).toBeLessThan(300);
    });
  });

  const REGISTER = { email: 'a@b.c', password: 'longenough', name: 'A' };

  it('serves the @Public session routes without credentials from the allowed Origin', async () => {
    await call('post', '/auth/login', { email: 'a@b.c', password: 'x' })
      .set('Origin', ORIGIN)
      .expect(201);
    await call('post', '/auth/register', REGISTER)
      .set('Origin', ORIGIN)
      .expect(201);
    await call('post', '/auth/logout').set('Origin', ORIGIN).expect(204);
  });

  it('refuses the @Public session routes from a foreign Origin (login CSRF)', async () => {
    const foreign = 'https://evil.example.com';
    await call('post', '/auth/login', { email: 'a@b.c', password: 'x' })
      .set('Origin', foreign)
      .expect(403);
    await call('post', '/auth/register', REGISTER)
      .set('Origin', foreign)
      .expect(403);
  });

  describe('X-Client-Secret', () => {
    it('is accepted only when it matches the configured secret, on routes without a role', async () => {
      await call('get', '/users/me')
        .set('X-Client-Secret', TEST_CLIENT_SECRET)
        .expect(401);
      await call('get', '/auth/profile')
        .set('X-Client-Secret', 'wrong')
        .expect(401);
    });

    it('does not bypass the JWT + role checks on admin-only routes', async () => {
      await call('get', '/admin/users')
        .set('X-Client-Secret', TEST_CLIENT_SECRET)
        .expect(401);
    });
  });
});
