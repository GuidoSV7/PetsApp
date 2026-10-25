# Spec: explicit configuration and per-run migrations

## S1 — Missing configuration fails closed

createTestDb reads TEST_DATABASE_URL only. Missing/blank value fails before clients
or SQL, even with DATABASE_URL set, with exactly:

`TEST_DATABASE_URL is required for database tests; provide an isolated PostgreSQL test database URL.`

Malformed/non-PostgreSQL values fail before SQL without secrets. No fallback.
Without the URL, globalSetup does not connect/fail: pure tests continue.

## S2 — Production-compatible migration

Use pg and drizzle-orm/node-postgres/migrator against existing backend/drizzle,
without production credential resolution or schema/migration changes. Fixtures
must support the retained real repository/service queries. Failed migration
cleans owned partial resources and never provides an incomplete template.

## S3 — One fresh template per run, before workers

globalSetup creates/migrates a uniquely namespaced template once, closes migration
connections and marks IS_TEMPLATE true / ALLOW_CONNECTIONS false. project.provide
passes serializable template/namespace metadata and the helper uses inject.
Concurrent runs get distinct namespaces. No cache/hash/advisory lock.
Stop/report if installed Vitest does not support the expected API.

## S4 — Honest version coverage

Record actual VPS16.15 versus human-reported production18. CI/local18 coverage is
reported separately; do not claim execution without evidence or upgrade the shared
cluster.
