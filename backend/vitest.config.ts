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
    // pglite boot + migrations is slow when many workers start at once.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
    // Each worker can hold a pglite WASM heap; keep the fan-out bounded.
    maxWorkers: 4,
  },
});
