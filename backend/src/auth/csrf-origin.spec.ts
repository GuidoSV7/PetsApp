import { describe, expect, it } from 'vitest';
import { isSameOriginWrite, isTrustedAuthPost } from './csrf-origin.js';

const ALLOWED = ['https://app.example.com', 'http://localhost:3000'];

const req = (method: string, headers: Record<string, string> = {}) => ({
  method,
  headers,
});

describe('isSameOriginWrite', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'get'])(
    'skips the check for safe method %s',
    (method) => {
      expect(
        isSameOriginWrite(
          req(method, { origin: 'https://evil.test' }),
          ALLOWED,
        ),
      ).toBe(true);
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'accepts %s from an allowed Origin',
    (method) => {
      expect(
        isSameOriginWrite(
          req(method, { origin: 'https://app.example.com' }),
          ALLOWED,
        ),
      ).toBe(true);
    },
  );

  it('rejects an unsafe request from a foreign Origin', () => {
    expect(
      isSameOriginWrite(req('POST', { origin: 'https://evil.test' }), ALLOWED),
    ).toBe(false);
    expect(isSameOriginWrite(req('DELETE', { origin: 'null' }), ALLOWED)).toBe(
      false,
    );
  });

  it('does not accept an Origin that merely starts with an allowed one', () => {
    expect(
      isSameOriginWrite(
        req('POST', { origin: 'https://app.example.com.evil.test' }),
        ALLOWED,
      ),
    ).toBe(false);
  });

  it('ignores case and a trailing slash in the allowlist', () => {
    expect(
      isSameOriginWrite(req('POST', { origin: 'https://APP.example.com' }), [
        'https://app.example.com/',
      ]),
    ).toBe(true);
  });

  it('accepts a missing Origin only with Sec-Fetch-Site: same-origin', () => {
    expect(
      isSameOriginWrite(
        req('POST', { 'sec-fetch-site': 'same-origin' }),
        ALLOWED,
      ),
    ).toBe(true);
    expect(
      isSameOriginWrite(
        req('POST', { 'sec-fetch-site': 'cross-site' }),
        ALLOWED,
      ),
    ).toBe(false);
    expect(
      isSameOriginWrite(
        req('POST', { 'sec-fetch-site': 'same-site' }),
        ALLOWED,
      ),
    ).toBe(false);
  });

  it('fails closed when neither Origin nor Sec-Fetch-Site is present', () => {
    expect(isSameOriginWrite(req('POST'), ALLOWED)).toBe(false);
  });

  it('lets Origin win over Sec-Fetch-Site', () => {
    expect(
      isSameOriginWrite(
        req('POST', {
          origin: 'https://evil.test',
          'sec-fetch-site': 'same-origin',
        }),
        ALLOWED,
      ),
    ).toBe(false);
  });

  it('rejects everything unsafe when the allowlist is empty', () => {
    expect(
      isSameOriginWrite(req('POST', { origin: 'https://app.example.com' }), []),
    ).toBe(false);
  });
});

describe('isTrustedAuthPost (login / logout)', () => {
  const post = (headers: Record<string, string> = {}) => req('POST', headers);

  it('accepts an allowed Origin, with or without a session cookie', () => {
    const headers = { origin: 'https://app.example.com' };

    expect(isTrustedAuthPost(post(headers), ALLOWED, false)).toBe(true);
    expect(isTrustedAuthPost(post(headers), ALLOWED, true)).toBe(true);
  });

  it('rejects a foreign or null Origin (cross-site form POST)', () => {
    expect(
      isTrustedAuthPost(post({ origin: 'https://evil.test' }), ALLOWED, false),
    ).toBe(false);
    expect(isTrustedAuthPost(post({ origin: 'null' }), ALLOWED, false)).toBe(
      false,
    );
  });

  it('lets Origin win over Sec-Fetch-Site', () => {
    expect(
      isTrustedAuthPost(
        post({ origin: 'https://evil.test', 'sec-fetch-site': 'same-origin' }),
        ALLOWED,
        false,
      ),
    ).toBe(false);
  });

  it('accepts Sec-Fetch-Site: same-origin without Origin, rejects the other values', () => {
    expect(
      isTrustedAuthPost(
        post({ 'sec-fetch-site': 'same-origin' }),
        ALLOWED,
        true,
      ),
    ).toBe(true);
    for (const value of ['cross-site', 'same-site', 'none']) {
      expect(
        isTrustedAuthPost(post({ 'sec-fetch-site': value }), ALLOWED, false),
      ).toBe(false);
    }
  });

  it('keeps curl / server-to-server (neither header) working only without a cookie', () => {
    expect(isTrustedAuthPost(post(), ALLOWED, false)).toBe(true);
    expect(isTrustedAuthPost(post(), ALLOWED, true)).toBe(false);
  });
});
