# Proposal: PostgreSQL-backed backend test databases

Status: Prompt 2 validates/amends the plan and authorizes implementation/tests, no commits.
Dependency: retire-global-pet-model is paused, validated and unimplemented until this change is ready.

## Outcome

Replace the five database specs' embedded engine with real PostgreSQL while
preserving their assertions and production code. A required TEST_DATABASE_URL
identifies an isolated test-run database/cluster. A fresh template is migrated once per run in Vitest globalSetup before workers.
project.provide/inject passes its namespace/name; fixtures clone it privately.
Teardown removes all run clones, unmarks and drops the template. No cache, hash
or advisory lock remains.

Use the production node-postgres Drizzle migrator against existing migrations.
Remove the old helper and direct embedded-engine dependency after all callers move.

## Verified environment, not assumptions

| Check | Observed result |
| --- | --- |
| Connection source | pgtest-db admin-url, target validated as 127.0.0.1:55432 before SELECT. |
| Server | PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1), server_version_num 160015. |
| Role | postgres; CREATEDB=true, superuser=true. |
| Maintenance database | postgres. |
| Production version | 18, supplied by the human; no production connection was made. |
| DDL tested now | None. Privileges establish feasibility, not an executed clone/migration proof. |

The read-only query executed through the endpoint-checked pgtest-db maintenance URL was:

```sql
SELECT json_build_object(
  'server_version', current_setting('server_version'),
  'server_version_num', current_setting('server_version_num'),
  'current_role', current_user,
  'can_create_databases', r.rolcreatedb OR r.rolsuper,
  'role_createdb', r.rolcreatedb,
  'role_superuser', r.rolsuper,
  'maintenance_database', current_database(),
  'server_port', inet_server_port()
)
FROM pg_roles r WHERE r.rolname = current_user;
```

Probe exit: 0. URL/credentials were not printed. pgtest-db usage inspection
advertised create/clone/drop/admin-url; its --help usage path returned exit 2,
not a failed database test. No create/clone/drop command ran.

The shared cluster is **not PostgreSQL 18**. This proposal uses the available real
PostgreSQL cluster and records the version gap; it does not authorize upgrading
shared infrastructure. CI/local examples should use PostgreSQL 18. Passing on 16
alone must not be described as exact production-version parity.

## Scope and inventory

See [design.md](design.md) for exact paths and lifecycle.
Acceptance:
- [configuration and migration](specs/configuration-and-migrations.md)
- [parallel isolation and cleanup](specs/isolation-and-lifecycle.md)
- [compatibility and boundaries](specs/compatibility-and-scope.md)

Future changes include the new helper and its tests, five consumers' imports/
cleanup calls/obsolete describe labels, package manifest/lockfile, backend README,
stale backend instructions and the CI unit-test database setup.

CI currently explicitly assumes no PostgreSQL service. Leaving it unchanged would
break the normal test job. Change only that job's service/unit-test setup; do not
modify the E2E suite, configuration, command or production DATABASE_URL.

## Findings and interpretation

- All five callers invoke createTestDb() without options. Keep its public
  create/db/client/close shape; remove the unused migrate:false bypass.
- There are 43 existing cases across the five consumers, counted statically.
  They have not been executed as a planning baseline.
- Seven client.exec calls become client.query with identical SQL. Existing
  parameterized query/rows usage is compatible with pg.
- Pure postgres-semantics helpers/specs and in-memory repository fakes are not
  the embedded engine and stay unchanged.
- Requested .claude/skills/test-speed/SKILL.md was unavailable. The active shared
  test-speed skill contains the requested “Real Postgres: template databases in
  code” recipe and was consulted instead.
- Literal zero occurrences of the retired engine name in every repository byte
  is not possible while preserving history and third-party metadata. The
  acceptance scope is no active use, installed package or direct dependency;
  historical OpenSpec/ODD records and Drizzle's optional-peer lock metadata remain.

## Alternatives

CREATEDB is available, so private per-file clones are the primary design.
If another test environment lacks it, fail clearly rather than silently share a
database. Proposed alternative: provision one migrated run database externally
with pgtest-db clone, run files serially, and drop it in the run wrapper. That is
an explicit alternative strategy, not an automatic fallback hidden in the helper.

## Non-goals and delivery

No production code/connection, schema, migrations or existing assertions change.
No E2E fixes, production queries, cluster upgrade, broad cleanup or shared-template
pruning. No implementation of the paused model retirement.

Prompt 2 supersedes planning-only status. After ODD amendments, implement via
TDD → verification → applicable RDD. Execution evidence goes in review.md.
The previous model retirement stays paused.
No commits now; future authorized commits use Conventional Commits without
Co-authored-by or “Generated with…” trailers. No push or deployment.
