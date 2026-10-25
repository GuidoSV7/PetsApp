import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    env: { TZ: 'UTC' },
    globalSetup: ['./src/testing/postgres.global-setup.ts'],
    // Allow isolated database setup on the shared test cluster.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
    // Bound CPU and database concurrency on shared runners.
    maxWorkers: 2,
  },
});
