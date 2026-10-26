# Spec: PostgreSQL persistence, migration and rollout

Status: implemented and functionally verified on disposable PostgreSQL16.15; actual upgrade/rollout evidence is in ../review.md. No production operation.

## S7 — Add one handwritten migration and journal entry

0004_coat_pattern.sql MUST begin with `SET LOCAL lock_timeout = '5s';`, followed by `--> statement-breakpoint`, then add coat_pattern varchar(16) NOT NULL DEFAULT 'solid' to pet_states. Schema mapping MUST match. No CHECK, UPDATE backfill, old migration edit or snapshot regeneration.

Append idx4/version7/tag0004_coat_pattern/breakpoints:true with when1792291000001, strictly greater than the existing0003 when1792291000000. Keep all previous entries unchanged. Reconcile first if another migration has landed before implementation.

Drizzle skips entries whose when is less than OR EQUAL to the latest applied timestamp. The existing sole0000 snapshot omits pet_states; drizzle-kit generate MUST NOT be used for this change.

Acceptance: assert the exact SET LOCAL line is first and the breakpoint precedes ALTER TABLE; migration/journal structural assertions, unchanged0000–0003 SQL and snapshot checks, and the actual upgrade in S9. No duplicate CREATE TABLE or re-emitted name/coin columns.

## S8 — Repository round-trip and unknown-value reads

Repository create and update MUST write coat.pattern; row mapping MUST normalize the database value. Verify a new row reads solid and a changed known pattern survives a fresh read. Actions/name updates MUST retain it.

In an isolated PostgreSQL fixture, use direct SQL to set coat_pattern='zebra'. Reading through the real repository and GET /pet/state MUST return solid without a read-time repair write. A normal API input zebra/striped MUST still be rejected rather than normalized on write.

Existing identifiers, colors, coins, needs, names, counters and timestamps MUST retain their behavior; no unrelated repository-port or endpoint changes.

## S9 — Prove upgrade from0000–0003, not just fresh creation

Using the test-db-postgres lifecycle, build a uniquely owned template/run from an owned temporary migration folder with unchanged0000–0003 SQL and only those journal entries. Allocate a fixture, insert legacy pet data without the future column and capture the existing fields.

Run the real Drizzle migrator with the full migration folder on that fixture. Assert:

- 0004 is recorded with the proposed when and the column is varchar(16), NOT NULL, DEFAULT solid.
- Existing rows read pattern solid, while all previously stored fields/counters remain unchanged.
- Newly inserted pets also receive solid; the original SQL/journal prefix and snapshot remain unchanged.

Normal repository/service/HTTP tests use createTestDb(), which already clones the latest migrated template. That alone MUST NOT be counted as the upgrade test. Reuse startTestRun's migration-folder argument and allocateFixture; do not add nonexistent createTestDb options or redesign helpers.

Always close owned fixture pools, dispose the run and remove its temporary migration folder in finally, including failed assertions. TEST_DATABASE_URL MUST target disposable local PostgreSQL; no production URL, seed or schema operation.

## S10 — Compatible, non-destructive rollout

The backend deployment MUST apply0004 at container startup before starting the API, in the same deploy. Confirmed Docker CMD: `node dist/db/migrate.js && exec node dist/main.js`; migration failure prevents app startup. Installed Drizzle wraps migration statements in one transaction, so SET LOCAL applies to the following ALTER TABLE. The old backend can continue inserting rows with solid supplied by the database default while rollout progresses.

The later pattern-sending frontend MUST deploy only after this backend is in production. Before backend deployment, forbidNonWhitelisted rejects pattern even if the column already exists.

PostgreSQL11+ avoids rewriting existing rows for a constant ADD COLUMN default; this MUST NOT be described as no lock. The migration's5s lock_timeout bounds lock acquisition and fails startup quickly on contention instead of waiting indefinitely. No production DDL, automatic deploy, data deletion or DROP rollback is authorized by this plan.

Keeping old colors-only clients working and omitting CHECK permits later append-only pattern additions without a constraint migration. A future value exceeding varchar(16) would need an explicit storage-contract change; it is not part of this feature.

Traceability: [domain S1–S3](coat-contract.md), [HTTP S4–S6](http-compatibility.md), [design](../design.md), [tasks](../tasks.md).
