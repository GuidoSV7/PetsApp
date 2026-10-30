import { describe, it, expect, vi } from 'vitest';
import { prepareStellarFlow, readStellarFlow, setStellarFlowCookie, stellarFlowCookieName, stellarHash } from './stellar-flow-cookie.js';

describe('Stellar browser flow cookie', () => {
  it('creates an unpredictable 256-bit browser flow and reuses only well-formed cookies', () => {
    const flow = prepareStellarFlow(undefined, 'login', false);
    expect.soft(flow).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect.soft(prepareStellarFlow(undefined, 'login', false)).not.toBe(flow);
    expect.soft(prepareStellarFlow({ petsapp_stellar_login: 'a'.repeat(43) }, 'login', false)).toBe('a'.repeat(43));
    expect.soft(prepareStellarFlow({ petsapp_stellar_login: '' }, 'login', false)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it('rejects absent/malformed/cross-purpose/cross-environment flows without producing a cookie', () => {
    for (const cookies of [undefined, {}, { petsapp_stellar_login: '' }, { petsapp_stellar_login: ['a'.repeat(43)] }, { petsapp_stellar_login: 'a'.repeat(42) }, { petsapp_stellar_login: '/'.repeat(43) }, { petsapp_stellar_link: 'a'.repeat(43) }, { '__Host-petsapp_stellar_login': 'a'.repeat(43) }]) {
      expect.soft(() => readStellarFlow(cookies, 'login', false)).toThrow('Invalid Stellar flow');
    }
  });
  it('uses host-only HttpOnly SameSite Lax five-minute cookies, with Secure and __Host- in production', () => {
    for (const secure of [false, true]) for (const purpose of ['login', 'link'] as const) {
      const cookie = vi.fn(); setStellarFlowCookie({ cookie }, purpose, secure, 'a'.repeat(43));
      expect.soft(cookie).toHaveBeenCalledExactlyOnceWith(stellarFlowCookieName(purpose, secure), 'a'.repeat(43), { path: '/', maxAge: 300_000, httpOnly: true, sameSite: 'lax', secure });
      expect.soft(stellarFlowCookieName(purpose, secure).startsWith('__Host-')).toBe(secure);
    }
  });
  it('minimizes and domain-separates identifiers with a shared keyed HMAC', () => {
    const secret = 'synthetic-hmac-key-for-flow-tests';
    const hash = stellarHash(secret, 'ip', '127.0.0.1');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(stellarHash(secret, 'ip', '127.0.0.1'));
    expect(hash).not.toBe(stellarHash(secret, 'flow', '127.0.0.1'));
    expect(hash).not.toBe(stellarHash('other-key', 'ip', '127.0.0.1'));
    expect(hash).not.toContain('127.0.0.1');
  });
});
