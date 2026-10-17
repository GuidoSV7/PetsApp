import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DEV_JWT_SECRET,
  MIN_JWT_SECRET_LENGTH,
  resolveJwtSecret,
} from './jwt-secret.js';
import { authTestModule } from './testing/auth-test-kit.js';

const STRONG = 'x'.repeat(MIN_JWT_SECRET_LENGTH);
const WEAK = 'x'.repeat(MIN_JWT_SECRET_LENGTH - 1);

const config = (env: Record<string, string | undefined>) => ({
  get: (key: string) => env[key],
});

describe('resolveJwtSecret', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('requires at least 32 characters', () => {
    expect(MIN_JWT_SECRET_LENGTH).toBe(32);
  });

  it.each(['production', 'test', 'staging', undefined])(
    'returns a strong JWT_SECRET (NODE_ENV=%s) without warning',
    (nodeEnv) => {
      expect(
        resolveJwtSecret(config({ JWT_SECRET: STRONG, NODE_ENV: nodeEnv })),
      ).toBe(STRONG);
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it.each(['production', 'test', 'staging', undefined])(
    'throws when JWT_SECRET is missing (NODE_ENV=%s)',
    (nodeEnv) => {
      expect(() => resolveJwtSecret(config({ NODE_ENV: nodeEnv }))).toThrow(
        /JWT_SECRET/,
      );
      expect(() =>
        resolveJwtSecret(config({ JWT_SECRET: '', NODE_ENV: nodeEnv })),
      ).toThrow(/JWT_SECRET/);
    },
  );

  it.each(['production', 'test', undefined])(
    'throws when JWT_SECRET is shorter than 32 characters (NODE_ENV=%s)',
    (nodeEnv) => {
      expect(() =>
        resolveJwtSecret(config({ JWT_SECRET: WEAK, NODE_ENV: nodeEnv })),
      ).toThrow(/at least 32/);
    },
  );

  it('never falls back silently without a secret', () => {
    expect(DEV_JWT_SECRET.length).toBeGreaterThanOrEqual(MIN_JWT_SECRET_LENGTH);
    expect(() => resolveJwtSecret(config({}))).toThrow();
  });

  describe('NODE_ENV=development', () => {
    it('uses a dev-only default with a loud warning when JWT_SECRET is missing', () => {
      expect(resolveJwtSecret(config({ NODE_ENV: 'development' }))).toBe(
        DEV_JWT_SECRET,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/JWT_SECRET/));
    });

    it('accepts a weak JWT_SECRET with a warning', () => {
      expect(
        resolveJwtSecret(config({ JWT_SECRET: WEAK, NODE_ENV: 'development' })),
      ).toBe(WEAK);
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/JWT_SECRET/));
    });

    it('still fails when PROD=production marks a production deployment', () => {
      expect(() =>
        resolveJwtSecret(
          config({ NODE_ENV: 'development', PROD: 'production' }),
        ),
      ).toThrow(/JWT_SECRET/);
    });
  });
});

describe('application startup', () => {
  it('fails to bootstrap the JWT strategy without JWT_SECRET', async () => {
    const builder = Test.createTestingModule({
      imports: [authTestModule({ NODE_ENV: 'production' })],
    });

    await expect(builder.compile()).rejects.toThrow(/JWT_SECRET/);
  });

  it('fails to bootstrap the JWT strategy with a weak JWT_SECRET', async () => {
    const builder = Test.createTestingModule({
      imports: [authTestModule({ NODE_ENV: 'production', JWT_SECRET: WEAK })],
    });

    await expect(builder.compile()).rejects.toThrow(/at least 32/);
  });

  it('bootstraps with a strong JWT_SECRET', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [authTestModule({ NODE_ENV: 'production', JWT_SECRET: STRONG })],
    }).compile();

    await moduleRef.close();
  });
});
