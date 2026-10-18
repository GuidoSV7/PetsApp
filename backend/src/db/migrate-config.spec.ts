import { describe, expect, it } from 'vitest';
import {
  migrationsFolderFor,
  resolveMigrationConfig,
} from './migrate-config.js';

const URL = 'postgresql://pets:secret@db.internal:5432/petsapp';

describe('migrationsFolderFor', () => {
  it.each([
    ['/app/dist/db', '/app/drizzle'],
    ['/repo/backend/src/db', '/repo/backend/drizzle'],
  ])('resolves drizzle/ two levels above %s', (entryDir, expected) => {
    expect(migrationsFolderFor(entryDir)).toBe(expected);
  });
});

describe('resolveMigrationConfig', () => {
  it('combines the pool credentials with the migrations folder', () => {
    expect(
      resolveMigrationConfig(
        { DATABASE_URL: URL, DATABASE_SSL: 'false', PROD: 'production' },
        '/app/dist/db',
      ),
    ).toEqual({ url: URL, ssl: false, migrationsFolder: '/app/drizzle' });
  });

  it('turns SSL on in production unless DATABASE_SSL=false', () => {
    expect(
      resolveMigrationConfig(
        { DATABASE_URL: URL, PROD: 'production' },
        '/app/dist/db',
      ).ssl,
    ).toEqual({ rejectUnauthorized: false });
  });

  it('fails fast naming the missing variable, never its value', () => {
    expect(() => resolveMigrationConfig({}, '/app/dist/db')).toThrow(
      'Missing database env var: DATABASE_URL',
    );
  });
});
