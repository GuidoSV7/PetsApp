import { describe, expect, it } from 'vitest';
import {
  drizzleCredentialsForCommand,
  resolveDrizzleCredentials,
} from './drizzle-credentials.js';

const URL = 'postgresql://pets:secret@db.local:5433/petsapp';

describe('resolveDrizzleCredentials', () => {
  it('maps DATABASE_URL and the shared SSL resolver', () => {
    expect(
      resolveDrizzleCredentials({ DATABASE_URL: URL, DATABASE_SSL: 'true' }),
    ).toEqual({ url: URL, ssl: { rejectUnauthorized: true } });
  });

  it('names the missing variable instead of defaulting', () => {
    expect(() => resolveDrizzleCredentials({})).toThrow(
      'Missing database env var: DATABASE_URL',
    );
    expect(() => resolveDrizzleCredentials({ DATABASE_URL: '  ' })).toThrow(
      'Missing database env var: DATABASE_URL',
    );
  });

  it('rejects a URL that is not a postgres URL without leaking it', () => {
    try {
      resolveDrizzleCredentials({ DATABASE_URL: 'mysql://x:secret@h/db' });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toMatch(/postgres/);
      expect((error as Error).message).not.toContain('secret');
    }
  });
});

describe('drizzleCredentialsForCommand', () => {
  it.each([['generate'], ['check'], ['export'], ['up']])(
    'does not require credentials for offline command %s',
    (command) => {
      expect(
        drizzleCredentialsForCommand(['node', 'drizzle-kit', command], {}),
      ).toBeUndefined();
    },
  );

  it.each([['migrate'], ['push'], ['pull'], ['introspect'], ['studio']])(
    'fails fast without env for connected command %s',
    (command) => {
      expect(() =>
        drizzleCredentialsForCommand(['node', 'drizzle-kit', command], {}),
      ).toThrow('Missing database env var');
    },
  );

  it('resolves credentials for connected commands when env is complete', () => {
    expect(
      drizzleCredentialsForCommand(['node', 'drizzle-kit', 'migrate'], {
        DATABASE_URL: URL,
      }),
    ).toEqual({ url: URL, ssl: false });
  });
});
