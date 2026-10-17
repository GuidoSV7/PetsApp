import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { sessionCookieName } from '../session-cookie.js';
import { JwtStrategy } from './jwt.strategy.js';

const SESSION_COOKIE = sessionCookieName(false);
const PROD_COOKIE = sessionCookieName(true);

/**
 * Token extraction of `JwtStrategy`: the Bearer header when the request has
 * one, otherwise the session cookie. This matches `GlobalAuthGuard`, which
 * treats an Authorization header as the credential and never falls back.
 * Persistence-free: the repository is an in-memory double.
 */
const SECRET = 'extractor-secret-of-at-least-32-chars';

const configFor = (env: Record<string, string> = {}) =>
  ({
    get: (key: string) => (key === 'JWT_SECRET' ? SECRET : env[key]),
  }) as unknown as ConfigService;

const users = {
  findById: (id: string) =>
    Promise.resolve({
      id,
      email: `${id}@test.local`,
      isActive: true,
      isBlocked: false,
    }),
};

const sign = (sub: string) =>
  new JwtService({}).sign({ sub, email: `${sub}@t.l` }, { secret: SECRET });

type Outcome = { outcome: 'success' | 'fail' | 'error'; value: unknown };

const authenticate = (
  headers: Record<string, string>,
  cookies?: Record<string, string>,
  env: Record<string, string> = {},
) =>
  new Promise<Outcome>((resolve) => {
    const strategy = new JwtStrategy(configFor(env), users as never);
    const instance = Object.create(strategy) as Record<string, unknown> & {
      authenticate(req: unknown): void;
    };
    instance.success = (value: unknown) =>
      resolve({ outcome: 'success', value });
    instance.fail = (value: unknown) => resolve({ outcome: 'fail', value });
    instance.error = (value: unknown) => resolve({ outcome: 'error', value });
    instance.authenticate({ headers, cookies });
  });

describe('JwtStrategy token extraction', () => {
  it('authenticates from the session cookie alone', async () => {
    const result = await authenticate(
      {},
      { [SESSION_COOKIE]: sign('cookie-user') },
    );

    expect(result.outcome).toBe('success');
    expect(result.value).toMatchObject({ id: 'cookie-user' });
  });

  it('still authenticates from a Bearer header alone', async () => {
    const result = await authenticate({
      authorization: `Bearer ${sign('bearer-user')}`,
    });

    expect(result.outcome).toBe('success');
    expect(result.value).toMatchObject({ id: 'bearer-user' });
  });

  it('prefers the Bearer header over the cookie when the header is present', async () => {
    const result = await authenticate(
      { authorization: `Bearer ${sign('bearer-user')}` },
      { [SESSION_COOKIE]: sign('cookie-user') },
    );

    expect(result.value).toMatchObject({ id: 'bearer-user' });
  });

  it('does not fall back to a valid cookie when the Bearer header is garbage', async () => {
    const result = await authenticate(
      { authorization: 'Bearer garbage' },
      { [SESSION_COOKIE]: sign('cookie-user') },
    );

    expect(result.outcome).toBe('fail');
  });

  it('reads the __Host- cookie in production and ignores the dev name there', async () => {
    const prod = { NODE_ENV: 'production' };

    const ok = await authenticate(
      {},
      { [PROD_COOKIE]: sign('prod-user') },
      prod,
    );
    const ignored = await authenticate(
      {},
      { [SESSION_COOKIE]: sign('dev-user') },
      prod,
    );

    expect(ok.value).toMatchObject({ id: 'prod-user' });
    expect(ignored.outcome).toBe('fail');
  });

  it('reads the dev cookie (and not the prefixed name) outside production', async () => {
    const result = await authenticate({}, { [PROD_COOKIE]: sign('prod-user') });

    expect(result.outcome).toBe('fail');
  });

  it('fails without any token and ignores unrelated cookies', async () => {
    expect((await authenticate({}, { other: sign('x') })).outcome).toBe('fail');
    expect((await authenticate({})).outcome).toBe('fail');
  });

  it('rejects a cookie signed with another secret', async () => {
    const forged = new JwtService({}).sign(
      { sub: 'u', email: 'u@t.l' },
      { secret: 'attacker-secret-attacker-secret-attacker' },
    );

    const result = await authenticate({}, { [SESSION_COOKIE]: forged });

    expect(result.outcome).toBe('fail');
  });
});
