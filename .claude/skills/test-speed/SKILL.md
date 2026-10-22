---
name: test-speed
description: Make a repo's test suites faster (Vitest isolation/pool splits, environment choice, PGlite snapshots, Postgres template databases, NestJS module reuse, Playwright server/build reuse). Use when asked to speed up tests, when a suite is slow, or when onboarding a new project's tests on this VPS.
---

# Speed up a repo's tests

Measured on our repos in October 2026. Apply **one recipe at a time**, measure before and after, and keep test counts identical: same passed, same skipped. A speedup that changes results is a bug.

## 0. Baseline first
1. Record the versions: Vitest (3 / 4 / 5 differ, see notes), Vite, Next, Playwright, PGlite.
2. Run the suite once and record wall time and pass/fail counts. On the shared agent VPS, run it under `heavy -- …`. On Vitest ≥ 4.1, `--experimental.importDurations.print` shows slow imports.
3. Note the files that already fail, so you do not blame the change for them.

## 1. Vitest: turn off isolation where it is safe (biggest win)
- ElayBet backend measured **172 s → 26 s** with `--no-isolate`.
- Try `vitest run --no-isolate` and diff the failures against the baseline. Files that fail only without isolation leak state (module singletons, `vi.mock`, timers). Keep those in an isolated project:
  ```ts
  test: { pool: 'forks', projects: [
    { extends: true, test: { name: 'unit', isolate: false, include: ['src/**/*.spec.ts'], exclude: ['**/*.integration.spec.ts', ...LEAKY] } },
    { extends: true, test: { name: 'isolated', isolate: true, include: ['**/*.integration.spec.ts', ...LEAKY] } },
  ] }
  ```
- On Vitest 3, check that per-project `isolate` is honoured: count the files per project. If it is not, use two config files.
- Do **not** use `threads` when the config sets `env.TZ`, because TZ does not apply inside worker threads. Stay on `forks`.

## 2. Frontend: environment per test type
- Tests that need no DOM run on `environment: 'node'` + `isolate: false`. Measured **159 s → 9 s** for 206 files.
- DOM tests run on `environment: 'jsdom'`, `pool: 'vmForks'`. Measured 406 s → about 98 s total. Some files break under vm pools (`instanceof` across realms); move those to a `forks` project.
- Name DOM-needing `.ts` tests `*.dom.test.ts`, so `include` patterns stay simple.
- Do not switch to happy-dom without benchmarking: `getByRole`-heavy suites can get much slower.

## 3. PGlite: migrate once, then load a snapshot
- create + migrate measured **2.2 s**; `loadDataDir` of a migrated dump measured **0.42 s**.
- In `globalSetup`, migrate one instance, `dumpDataDir('none')` to a file keyed by a hash of the migrations folder, and pass the path with `provide`. Workers do `PGlite.create({ loadDataDir: new Blob([readFileSync(inject('pgliteSnapshot'))]) })`.
- Do not pass it through `process.env`, which does not reach workers in every pool.
- With `isolate: false`, keep one template per worker and `clone()` it (about 0.5 s).
- Memory: about 700 MB for the first instance and about 200 MB for each extra one. Close instances in `afterAll`. Keep ≤ 3 workers on a 6 GB budget (the agent VPS caps each session at 6 GB).

## 4. Real Postgres: template databases in code
- create + migrate measured **1.37 s**; `CREATE DATABASE … TEMPLATE … STRATEGY FILE_COPY` measured **30-80 ms**.
- In the repo's real-PG helper:
  1. Build the template once, under a `pg_advisory_lock`: `tpl_<hash of migrations>`, migrate it, then `ALTER DATABASE … WITH IS_TEMPLATE true ALLOW_CONNECTIONS false`.
  2. Clone it for each suite.
- No connection may be open to a template while it is cloned.
- On the shared agent VPS, `pgtest-db clone` gives the same effect from the shell without code changes.
- Use per-test rollback when the code lets you inject the connection (2 ms vs about 100 ms for TRUNCATE). Keep TRUNCATE for multi-connection or concurrency suites.

## 5. NestJS
- Build the `TestingModule` in `beforeAll`, not `beforeEach`, when providers are stateless.
- Keep AppModule and wiring specs in the isolated project.
- With supertest, call `app.listen(0)` once and reuse the server.

## 6. Playwright E2E
- Use `webServer` (array) with `reuseExistingServer: true`, `url` readiness and `gracefulShutdown`. Use ports your environment reserves for apps. On the agent VPS that means 3002/3003/3112 only; 3000/3001 are host services.
- Skip `next build` when the frontend has not changed: stamp it with `git rev-parse HEAD:<frontend>` plus a dirty check. Never delete `.next/cache` (Next ≥ 16.3 caches builds there).
- Locally use `trace: 'off'`; re-run a failing test with `--trace on`. Agents can also use `--last-failed` and `--only-changed`.
- `workers: 2` only after shared-data tests get `{ lock: '<resource>' }` (Playwright ≥ 1.63) or one account per worker.
- Reset seeded data by cloning a seeded template database instead of re-running the seed.

## Version notes
- Vitest 3: `VITEST_MAX_FORKS`/`_THREADS`, `poolOptions`. Vitest 4+: `VITEST_MAX_WORKERS`, top-level `maxWorkers`/`isolate`/`execArgv`.
- `experimental.recordDependencies` (reliable `--changed`/`related`) needs **≥ 5.0.4**. `importDurations` needs ≥ 4.1.
- Upgrading to Vitest 5 is reported as 8-25% faster. It requires Vite ≥ 6.4 and Node ≥ 22.12, and `clearMocks` defaults to `true`. After changing SWC/tsconfig decorator options, run `vitest --clearCache`.

## Deliver
- Commit per recipe, following the repo's own rules (AGENTS.md: branch policy, build gates).
- Report: before/after time, test counts before/after (must match), and files moved to isolated projects with the reason.
