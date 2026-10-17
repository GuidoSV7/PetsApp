import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  allowedOrigins,
  corsBootWarning,
  corsOriginOption,
  httpCorsOptions,
  isCorsEnabled,
  parseCorsOrigins,
} from './cors-origins.util.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isCorsEnabled', () => {
  it.each([undefined, '', '  ', 'true', '1', 'yes', 'on', 'TRUE'])(
    'is on for %j',
    (raw) => {
      expect(isCorsEnabled(raw)).toBe(true);
    },
  );

  it.each(['false', '0', 'no', 'off', ' OFF ', 'False'])(
    'is off for %j',
    (raw) => {
      expect(isCorsEnabled(raw)).toBe(false);
    },
  );

  it('reads CORS_ENABLED lazily when no value is passed', () => {
    vi.stubEnv('CORS_ENABLED', 'false');
    expect(isCorsEnabled()).toBe(false);

    vi.stubEnv('CORS_ENABLED', 'true');
    expect(isCorsEnabled()).toBe(true);
  });
});

describe('parseCorsOrigins', () => {
  it.each([undefined, null, '', '  ', ' , '])(
    'falls back to the local frontend origins for %j',
    (raw) => {
      expect(parseCorsOrigins(raw)).toEqual([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ]);
    },
  );

  it('splits a comma list and trims entries', () => {
    expect(
      parseCorsOrigins(' https://app.example.com , https://admin.example.com '),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });
});

describe('corsOriginOption', () => {
  it('reflects the request origin outside production when no list is set', () => {
    vi.stubEnv('CORS_ENABLED', '');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CORS_ORIGIN', '');
    expect(corsOriginOption()).toBe(true);
  });

  it('uses the configured allowlist', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(
      corsOriginOption(
        'true',
        'https://app.example.com, https://admin.example.com',
      ),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it.each(['production', 'test', 'staging', ''])(
    'fails closed (no allowed origin) when NODE_ENV=%j and the list is empty',
    (nodeEnv) => {
      vi.stubEnv('NODE_ENV', nodeEnv);
      expect(corsOriginOption('true', '')).toEqual([]);
      expect(corsOriginOption('true', '   ')).toEqual([]);
    },
  );

  it('still honours a configured list outside development', () => {
    vi.stubEnv('NODE_ENV', 'staging');
    expect(corsOriginOption('true', 'https://app.example.com')).toEqual([
      'https://app.example.com',
    ]);
  });

  it('returns false when CORS is disabled', () => {
    vi.stubEnv('CORS_ENABLED', 'off');
    expect(corsOriginOption()).toBe(false);
  });
});

describe('httpCorsOptions', () => {
  it('exposes Content-Disposition so the browser can read the download name', () => {
    vi.stubEnv('CORS_ENABLED', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CORS_ORIGIN', '');
    expect(httpCorsOptions()).toEqual({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      optionsSuccessStatus: 204,
      exposedHeaders: ['Content-Disposition'],
    });
  });

  it('keeps the enforced allowlist in production', () => {
    vi.stubEnv('CORS_ENABLED', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CORS_ORIGIN', 'https://app.example.com');
    expect(httpCorsOptions()).toMatchObject({
      origin: ['https://app.example.com'],
      exposedHeaders: ['Content-Disposition'],
    });
  });

  it('is false when CORS is disabled', () => {
    vi.stubEnv('CORS_ENABLED', 'off');
    expect(httpCorsOptions()).toBe(false);
  });
});

describe('corsBootWarning', () => {
  it('warns when CORS is on, CORS_ORIGIN is empty and NODE_ENV is not development', () => {
    expect(corsBootWarning('true', '', 'production')).toMatch(/CORS_ORIGIN/);
    expect(corsBootWarning(undefined, undefined, 'test')).toMatch(
      /CORS_ORIGIN/,
    );
  });

  it('stays silent in development, with a configured list, or with CORS off', () => {
    expect(corsBootWarning('true', '', 'development')).toBeNull();
    expect(corsBootWarning('true', 'https://a.test', 'production')).toBeNull();
    expect(corsBootWarning('off', '', 'production')).toBeNull();
  });
});

describe('allowedOrigins', () => {
  it('returns the CORS_ORIGIN list used by the CSRF origin check', () => {
    expect(allowedOrigins('https://a.test, https://b.test')).toEqual([
      'https://a.test',
      'https://b.test',
    ]);
  });

  it('falls back to the local defaults when the list is empty', () => {
    expect(allowedOrigins('')).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });

  it('reads process.env.CORS_ORIGIN lazily when no value is passed', () => {
    vi.stubEnv('CORS_ORIGIN', 'https://env.test');

    expect(allowedOrigins()).toEqual(['https://env.test']);
  });
});
