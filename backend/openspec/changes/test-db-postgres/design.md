# Design: private PostgreSQL clones for database specs

## Current evidence

Planning baseline: d7a936dbe64aef8d4d032d5d1e355ee8d9c48c23.
Prompt 2 authorizes implementation/tests after these amendments. Planning facts
remain historical; actual execution results go in review.md.

| Surface | Evidence |
| --- | --- |
| Existing helper | backend/src/testing/pglite.ts unconditionally constructs the embedded engine; its optional logger/migrate:false arguments have no consumers. |
| Production driver/type | backend/src/database/database.module.ts uses pg plus NodePgDatabase<typeof schema>. No production edit needed. |
| Production migrator | backend/src/db/migrate.ts imports migrate from drizzle-orm/node-postgres/migrator and uses the existing drizzle folder. |
| Discovery | backend/vitest.config.ts includes **/*.spec.ts; forks pool, configured maxWorkers=4. Execute with --maxWorkers=2 on the shared VPS. |
| Normal CI | .github/workflows/ci.yml backend unit step runs npx vitest run --maxWorkers=2 and currently has no PostgreSQL service. |
| Stale guidance | backend/README.md:17,83,113–115 and .cursor/rules/backend-agent.mdc:14,29 refer to the old engine/no-server setup. |

## Future edit surfaces

| Action | Path | Bound |
| --- | --- | --- |
| Add | backend/src/testing/postgres.ts | Required test URL, immutable template, clone ownership, pg/Drizzle fixture and close lifecycle. |
| Add | backend/src/testing/postgres-lifecycle.ts | Administrative functions shared by setup/helper, without worker-only inject. |
| Add | backend/src/testing/postgres.global-setup.ts | Per-run template, provide and returned teardown. |
| Edit | backend/vitest.config.ts | Register globalSetup, retain normal discovery/forks, cap workers at two. |
| Delete | backend/src/testing/pglite.ts | After all five callers move; no compatibility alias retaining old imports. |
| Add | backend/src/testing/postgres.spec.ts | Configuration, template publication/context, migration failure and disposal contract tests. |
| Edit | backend/src/users/infrastructure/drizzle-user.repository.spec.ts | Import path, exec→query, describe engine label; preserve all assertions. |
| Edit | backend/src/roles/infrastructure/drizzle-role.repository.spec.ts | Same narrow adaptations. |
| Edit | backend/src/pet/infrastructure/drizzle-pet.repository.spec.ts | Same narrow adaptations. |
| Edit | backend/src/pet/pet.service.spec.ts | Import path and exec→query only. |
| Edit | backend/src/pet/pet.controller.spec.ts | Import path and exec→query only. |
| Edit | backend/package.json and backend/package-lock.json | Uninstall direct @electric-sql/pglite with npm, no unrelated upgrades. |
| Edit | backend/README.md | Required test URL, local PostgreSQL/Docker, privileges, isolation, cleanup and VPS commands. |
| Edit | .cursor/rules/backend-agent.mdc | Align test-engine statements only; retain architecture/security guidance. |
| Edit | .github/workflows/ci.yml | PostgreSQL 18 service and isolated unit-test URL/lifecycle; preserve E2E/frontend steps. |

Installed Vitest is 4.1.12. Official globalSetup/project.provide/inject API was
consulted; runtime proof must confirm it. Stop/report incompatibility, do not add
another runner or cross-file barrier.

Preserve postgres-semantics.ts/.spec.ts, repository contract files, in-memory
adapters, production modules/config/migration entrypoints, schema and migrations.
Do not edit backend/.env.example for this change.

## Five consumer compatibility

| Spec | Existing cases, static count | Existing database use |
| --- | ---: | --- |
| users/infrastructure/drizzle-user.repository.spec.ts | 25 | TRUNCATE users; parameterized typed query returning rows. |
| roles/infrastructure/drizzle-role.repository.spec.ts | 5 | Three reset exec calls and parameterized user insertion. |
| pet/infrastructure/drizzle-pet.repository.spec.ts | 3 | TRUNCATE pet_states. |
| pet/pet.service.spec.ts | 6 | Same reset; DRIZZLE provider injection. |
| pet/pet.controller.spec.ts | 4 | Same reset; real repository/service injection. |

All allocate once in beforeAll and close in afterAll: one helper allocation is
one private database for each current file. Do not key clones solely by worker ID:
a worker executes more than one file. Extra helper contract tests may allocate
multiple independent fixtures in one file.

Retain createTestDb(), TestDb, db, client and close(). client becomes a pg pool/
client with query(sql, params) and rows, eliminating the old type cast to a
different driver's DrizzleDb. Change seven exec calls to query without rewriting
their SQL or expectations. Remove obsolete engine words from three describe labels.
No test.concurrent within an existing file: its tests share per-file TRUNCATE state.

The unused migrate:false escape hatch is removed. Every published template is
migrated; optional diagnostic logging must not become a migration bypass.

## Required URL and ownership

Read only TEST_DATABASE_URL for the test connection. Never read/resolve production
DATABASE_URL or load a production .env to obtain it. Missing/blank value fails
before constructing a client or performing SQL:

`TEST_DATABASE_URL is required for database tests; provide an isolated PostgreSQL test database URL.`

Malformed/non-PostgreSQL URLs fail without leaking the URL/password and without
SQL. Explicit connection failures retain redacted context; no embedded-engine or
localhost:5432 fallback.

On the VPS, the run wrapper provisions a fresh anchor with pgtest-db create.
The helper uses that URL's endpoint/credentials for test-only administration and
connects its maintenance session to the stable postgres database. It creates/drops
only generated, recorded PetsApp fixture databases, never tables in the maintenance
database or an arbitrary application database.

Use a cryptographically unique per-run namespace plus random clone identifiers,
independent of the anchor name; no migration identity hash is used. Database names must be valid bounded PostgreSQL identifiers, safely
quoted, without raw filename/URL interpolation. Verify ownership before disposal.
The helper does not drop the supplied anchor; the outer wrapper owns it.

## Per-run globalSetup, cloning and teardown (Prompt 2)

- Without TEST_DATABASE_URL, globalSetup returns without connecting/failing.
  The helper checks S1 before inject or client construction when requested.
- globalSetup chooses a cryptographically unique run namespace, creates one
  template, uses the production node-postgres Drizzle migrator with backend/drizzle,
  closes its migration pool and marks IS_TEMPLATE true / ALLOW_CONNECTIONS false.
- project.provide passes serializable template/namespace data; helper uses inject.
  Shared lifecycle code must not import worker-only Vitest runtime APIs.
- Every allocation clones the same run template into a unique owned database.
  Migration pool max1, fixture pool max2; quote identifiers and bound waits.
- close() closes its pool then drops its clone, idempotently. Partial setup cleans
  owned resources before rethrowing.
- Global teardown removes only exact current-run generated clones, unmarks its
  template IS_TEMPLATE false before dropping it, then closes admin connections.
  No retained template/cache, identity hash or advisory lock.
- Prove complete cleanup on success and an intentional test failure. SIGKILL can
  bypass teardown; retain ownership-scoped diagnostics/exact-name orphan cleanup.
  Never clean another run or unrelated database/session.

## Isolation in one helper spec

postgres.spec.ts allocates two fixtures together with Promise.all, asserts
different current_database(), inserts the same key with distinct values and
verifies private reads. Truncating one must leave the other unchanged. Separately
test unique names for each allocation. Close fixtures in finally.
No permanent cross-file barriers, paired participant specs or nested workers.

## VPS wrapper and fallback

pgtest-db create/drop owns an empty run anchor; code owns one template/run and
its clones. Preserve test exit status through cleanup. Full suite uses heavy and
--maxWorkers=2; no duplicate pgtest-db migrated-template layer.

If CREATEDB is unavailable elsewhere, stop clearly. Proposed alternative: one
externally migrated run database via pgtest-db clone, files serially, wrapper
cleanup. No automatic lower-isolation fallback.

## README and CI

Document TEST_DATABASE_URL as an administrative URL for an explicitly isolated
test run. On a developer machine, a dedicated postgres:18 Docker container bound
to loopback (for example host port 55432), with CREATEDB and a fresh run anchor,
is sufficient. Explain container creation/cleanup and no production URL reuse.
Do not launch this example on the VPS: port 55432 already belongs to its test cluster.

CI gets a PostgreSQL 18 service, readiness healthcheck, unique run anchor and
unit-step-only TEST_DATABASE_URL. pgtest-db is VPS tooling, not assumed available
on hosted CI/local machines; use psql or existing pg to provision/dispose their
anchors. Keep the existing two-worker cap. Do not set job-wide DATABASE_URL or
make the E2E fallback start using this service accidentally; keep the service on
the dedicated test port and preserve the E2E step/configuration.

## Dependency/reference scope and follow-ups

Uninstall the direct embedded-engine package and delete its helper after callers
move. Verify npm's installed graph and root lock declarations; do not assume an
uninstall's effect without checking. Drizzle 0.45.4 advertises the package as an
optional peer in lock metadata (~4379/4414). Preserve genuine third-party metadata,
not an installed engine package or application import. Do not upgrade Drizzle or
hand-corrupt its peer map just to make a text grep empty.

Active src/test, current README/rules/CI and direct dependencies must no longer
rely on or recommend the old engine. Historical OpenSpec/ODD/Git records remain.
The paused retirement plan retains its history and will be reconciled with the new
helper when resumed.

E2E follow-up only: test/app.e2e-spec.ts has a localhost:5432 DATABASE_URL fallback.
Do not fix, execute against an unintended database or change it here.

## Evidence and risks

- Cluster probe: one SELECT via pgtest-db admin-url; target 127.0.0.1:55432,
  role postgres, CREATEDB/superuser true, PostgreSQL 16.15. This was planning-only;
  subsequent real migration/clone/cleanup evidence is in review.md.
- Production 18 is human-reported. VPS16 versus CI/local18 is an explicit coverage
  difference, not permission to upgrade shared infrastructure.
- Record actual template, clone and full-suite timings. Do not execute the old
  engine for a baseline. RED is the new helper spec failing on missing helper or
  missing URL validation; no temporary harness.
- Risks: data/DDL ownership (item 1), concurrency (item 4), CI/dependency changes
  (item 5). Also protect fail-closed test/production connection separation.
- Official references:
  [CREATE DATABASE](https://www.postgresql.org/docs/16/sql-createdatabase.html),
  [template databases](https://www.postgresql.org/docs/16/manage-ag-templatedbs.html),
  [database-local advisory locks](https://www.postgresql.org/docs/16/view-pg-locks.html),
  [Drizzle migrations](https://orm.drizzle.team/docs/migrations).
