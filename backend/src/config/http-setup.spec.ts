import { describe, expect, it } from 'vitest';
import { parseTrustProxy } from './http-setup.js';

describe('parseTrustProxy', () => {
  it('defaults to one hop in production and none elsewhere', () => {
    expect(parseTrustProxy(undefined, true)).toBe(1);
    expect(parseTrustProxy('', true)).toBe(1);
    expect(parseTrustProxy(undefined, false)).toBe(false);
  });

  it('reads an explicit hop count', () => {
    expect(parseTrustProxy('2', true)).toBe(2);
    expect(parseTrustProxy(' 1 ', false)).toBe(1);
  });

  it('treats 0 as no proxy', () => {
    expect(parseTrustProxy('0', true)).toBe(false);
  });

  it.each(['true', 'loopback', '-1', '1.5', 'abc'])(
    'rejects %s because trusting an unbounded chain is spoofable',
    (raw) => {
      expect(() => parseTrustProxy(raw, true)).toThrow(/TRUST_PROXY/);
    },
  );
});
