import { Logger } from '@nestjs/common';

/** HS256 needs a key of at least 256 bits; 32 characters is the floor. */
export const MIN_JWT_SECRET_LENGTH = 32;

/** Only ever used in explicit local development. Never deploy with it. */
export const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-do-not-deploy';

type ConfigReader = { get(key: string): unknown };

const logger = new Logger('JwtSecret');

/**
 * Single source of truth for the JWT signing/verification secret.
 *
 * Outside explicit local development (`NODE_ENV=development` and not
 * `PROD=production`) a missing or short `JWT_SECRET` throws, so the
 * application fails at startup instead of accepting tokens signed with a
 * guessable key. In development it falls back to `DEV_JWT_SECRET` (or keeps
 * the weak value) and logs a loud warning.
 */
export function resolveJwtSecret(config: ConfigReader): string {
  const raw = config.get('JWT_SECRET');
  const secret = typeof raw === 'string' ? raw : '';
  if (secret.length >= MIN_JWT_SECRET_LENGTH) {
    return secret;
  }

  const problem = secret
    ? `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`
    : 'JWT_SECRET is not set';

  if (!isLocalDevelopment(config)) {
    throw new Error(
      `${problem}. Refusing to start: set a random JWT_SECRET of at least ${MIN_JWT_SECRET_LENGTH} characters (e.g. \`openssl rand -base64 48\`).`,
    );
  }

  logger.warn(
    `!!! INSECURE: ${problem}. Using ${secret ? 'the weak value' : 'a dev-only default'} because NODE_ENV=development. Tokens are forgeable; never deploy like this. !!!`,
  );
  return secret || DEV_JWT_SECRET;
}

function isLocalDevelopment(config: ConfigReader): boolean {
  return (
    config.get('NODE_ENV') === 'development' &&
    config.get('PROD') !== 'production'
  );
}
