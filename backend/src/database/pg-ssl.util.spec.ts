import { describe, expect, it } from 'vitest';
import { resolvePgSsl } from './pg-ssl.util.js';

const readFile = (path: string) =>
  path === '/certs/ca.pem' ? 'CA-CONTENTS' : undefined;

describe('resolvePgSsl', () => {
  it.each([
    ['none set', {}, false],
    ['PROD=production', { PROD: 'production' }, { rejectUnauthorized: false }],
    [
      'PROD=production, REJECT=true',
      { PROD: 'production', DATABASE_SSL_REJECT_UNAUTHORIZED: 'true' },
      { rejectUnauthorized: true },
    ],
    [
      'DATABASE_SSL=true',
      { DATABASE_SSL: 'true' },
      { rejectUnauthorized: true },
    ],
    [
      'DATABASE_SSL=true, REJECT=false',
      { DATABASE_SSL: 'true', DATABASE_SSL_REJECT_UNAUTHORIZED: 'false' },
      { rejectUnauthorized: false },
    ],
    [
      'DATABASE_SSL=true, CA path',
      { DATABASE_SSL: 'true', DATABASE_SSL_CA: '/certs/ca.pem' },
      { rejectUnauthorized: true, ca: 'CA-CONTENTS' },
    ],
    [
      'DATABASE_SSL=true, CA path missing',
      { DATABASE_SSL: 'true', DATABASE_SSL_CA: '/certs/none.pem' },
      { rejectUnauthorized: true },
    ],
    [
      'DATABASE_SSL=false beats PROD=production',
      { PROD: 'production', DATABASE_SSL: 'false' },
      false,
    ],
  ])('%s', (_name, env, expected) => {
    expect(resolvePgSsl(env, readFile)).toEqual(expected);
  });

  it('uses the filesystem by default and tolerates a missing CA file', () => {
    expect(
      resolvePgSsl({ DATABASE_SSL: 'true', DATABASE_SSL_CA: '/no/such/file' }),
    ).toEqual({ rejectUnauthorized: true });
  });
});
