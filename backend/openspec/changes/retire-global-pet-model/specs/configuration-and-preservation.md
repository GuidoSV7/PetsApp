# Spec: configuration, data and test-execution boundaries

## S7 — Example configuration no longer advertises the model feature

After an approved inspection of the template, `backend/.env.example` SHALL lose
the model-directory configuration block and obsolete comment requiring the seeded
admin to match the frontend hardcoded login.

Unrelated admin-seed settings and configuration SHALL remain. The warning not to
commit real values SHALL remain. Do not reproduce real values in evidence.

### Scenario: inspect a bounded template diff

Given the relevant template contents are available through an approved read or
redacted human-provided lines,
when the example configuration changes,
then its diff removes only the requested block/comment and preserves the warning.
The initial policy-denied read is not evidence. The later explicit target-only
bash authorization permits reading/editing this example template and checking its
bounded diff; no real environment file may be read.

## S8 — No data, migration or ignore-rule cleanup

Root `.gitignore` SHALL retain `backend/uploads/`.
Schema, migrations, auth, guards, roles and unrelated modules SHALL be unchanged.

### Scenario: existing uploads and records remain untouched

Given preexisting local or production model files, directories, records or volumes,
when the source retirement is applied,
then no cleanup, deletion, migration or production database operation is performed.
Existing data is not an implementation artifact to remove. Production cleanup
is a human-only action outside this change.

## S9 — The route test belongs to the normal suite and uses an agreed fixture

The route regression SHALL be named
`backend/src/pet/model-retirement.http.spec.ts`, matching the existing
`**/*.spec.ts` normal Vitest include used by `npm test`.
It SHALL NOT exist only in the separate `*.e2e-spec.ts` suite.

Use createTestDb from src/testing/postgres.ts: private real PostgreSQL clone,
existing migrations and real Drizzle repository/service wiring. Override PG_POOL
and DRIZZLE before compiling actual AppModule, retain guards, and close app then
fixture. Force test ConfigModule loading to ignore real environment files.

### Scenario: run without hidden database fallbacks

Normal discovery must run the HTTP test. On this VPS use a fresh pgtest-db anchor
on127.0.0.1:55432, heavy/max2 and cleanup preserving status. No production URL,
real .env read, localhost:5432 fallback or existing upload-directory access.

## S10 — Authorized implementation and verified evidence, no delivery

Prompt 4 authorizes plan amendments, normal-suite RED before runtime code removal,
GREEN, focused/pet regressions, lint/fullsuite/build, structural checks, review.md
with S1–S10 scenario classification, independent verification and applicable RDD.
No commits, push/deploy or production cleanup. Report every failed/skipped or
unavailable proof honestly; historical planning-only scope is superseded.
