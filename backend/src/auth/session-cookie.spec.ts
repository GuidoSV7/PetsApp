import { describe, expect, it, vi } from 'vitest';
import {
  clearSessionCookie,
  isProductionEnv,
  sessionCookieName,
  setSessionCookie,
  tokenLifetimeMs,
} from './session-cookie.js';

const fakeRes = () => ({ cookie: vi.fn(), clearCookie: vi.fn() });

const jwtWithExp = (exp: number) =>
  `x.${Buffer.from(JSON.stringify({ sub: 'u', exp })).toString('base64url')}.y`;

describe('session cookie', () => {
  it('is named petsapp_session in development and __Host-petsapp_session in production', () => {
    expect(sessionCookieName(false)).toBe('petsapp_session');
    expect(sessionCookieName(true)).toBe('__Host-petsapp_session');
  });

  it('uses the __Host- name with Secure, Path=/ and no Domain in production', () => {
    const res = fakeRes();

    setSessionCookie(res, 'tok', { secure: true, maxAgeMs: 1000 });

    const [name, , options] = res.cookie.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe('__Host-petsapp_session');
    expect(options).toMatchObject({ secure: true, path: '/' });
    expect(options).not.toHaveProperty('domain');
  });

  it('issues a session cookie (no Max-Age) when no lifetime is given', () => {
    const res = fakeRes();

    setSessionCookie(res, 'tok', { secure: false });

    expect(res.cookie.mock.calls[0][2]).not.toHaveProperty('maxAge');
  });

  it('clears the prefixed cookie in production', () => {
    const clear = fakeRes();

    clearSessionCookie(clear, { secure: true });

    expect(clear.clearCookie.mock.calls[0][0]).toBe('__Host-petsapp_session');
  });

  it('sets an httpOnly, Lax, Path=/ cookie with no Domain', () => {
    const res = fakeRes();

    setSessionCookie(res, 'tok', { secure: false, maxAgeMs: 43_200_000 });

    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [name, value, options] = res.cookie.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe('petsapp_session');
    expect(value).toBe('tok');
    expect(options).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false,
      maxAge: 43_200_000,
    });
    expect(options).not.toHaveProperty('domain');
  });

  it('marks the cookie Secure in production', () => {
    const res = fakeRes();

    setSessionCookie(res, 'tok', { secure: true, maxAgeMs: 1000 });

    expect(res.cookie.mock.calls[0][2]).toMatchObject({ secure: true });
  });

  it('clears with the same attributes it was set with', () => {
    const set = fakeRes();
    const clear = fakeRes();

    setSessionCookie(set, 'tok', { secure: true, maxAgeMs: 1000 });
    clearSessionCookie(clear, { secure: true });

    const { maxAge: _maxAge, ...setAttrs } = set.cookie.mock.calls[0][2] as {
      maxAge: number;
    };
    expect(clear.clearCookie).toHaveBeenCalledWith(
      '__Host-petsapp_session',
      setAttrs,
    );
  });

  it('clears a non-secure cookie without Secure', () => {
    const clear = fakeRes();

    clearSessionCookie(clear, { secure: false });

    expect(clear.clearCookie.mock.calls[0][1]).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false,
    });
  });
});

describe('tokenLifetimeMs', () => {
  it('derives the Max-Age from the exp claim (JWT_EXPIRES_IN)', () => {
    const now = 1_700_000_000_000;

    expect(tokenLifetimeMs(jwtWithExp(1_700_000_000 + 43_200), now)).toBe(
      43_200_000,
    );
    expect(tokenLifetimeMs(jwtWithExp(1_700_000_000 + 60), now)).toBe(60_000);
  });

  it('returns 0 for an already expired token', () => {
    const now = 1_700_000_000_000;

    expect(tokenLifetimeMs(jwtWithExp(1_700_000_000 - 5), now)).toBe(0);
  });

  it('throws for a malformed or exp-less token instead of returning 0', () => {
    const now = 1_700_000_000_000;

    expect(() => tokenLifetimeMs('not-a-jwt', now)).toThrow(/exp/);
    expect(() =>
      tokenLifetimeMs(
        `x.${Buffer.from('{"sub":"u"}').toString('base64url')}.y`,
        now,
      ),
    ).toThrow(/exp/);
  });
});

describe('isProductionEnv', () => {
  it('is true for NODE_ENV=production or PROD=production', () => {
    expect(isProductionEnv({ NODE_ENV: 'production' })).toBe(true);
    expect(
      isProductionEnv({ NODE_ENV: 'development', PROD: 'production' }),
    ).toBe(true);
  });

  it('is false otherwise', () => {
    expect(isProductionEnv({ NODE_ENV: 'development' })).toBe(false);
    expect(isProductionEnv({})).toBe(false);
  });
});
