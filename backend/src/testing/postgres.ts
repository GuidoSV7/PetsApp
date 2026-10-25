import { inject } from 'vitest';
import { allocateFixture, readTestUrl } from './postgres-lifecycle.js';

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

/** Configuration is checked before accessing worker context or opening clients. */
export async function createTestDb() {
  const url = readTestUrl();
  const context = inject('postgresTestRun');
  if (!context)
    throw new Error('PostgreSQL globalSetup did not provide a test template.');
  return allocateFixture(url, context);
}
