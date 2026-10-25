# Spec: concurrent clones and complete per-run cleanup

## S5 — Concurrent isolation in one helper spec

postgres.spec.ts allocates two fixtures with Promise.all, asserts different
current_database(), writes the same key/distinct values and verifies private
reads. Truncating one leaves the other unchanged. A separate test proves unique
names for every allocation. No permanent cross-file barrier or participant specs.

## S6 — Idempotent disposal and global teardown

close() closes its pool then drops only its clone; repeated close is safe.
Global teardown removes leftover clones of this run, unmarks the template
IS_TEMPLATE false, drops it and closes admin connections. Setup failure cleans
owned resources before rethrowing. Verify zero clones/template after normal
completion and an intentional failing test. Wrapper preserves test exit status.
SIGKILL may bypass cleanup: document exact-owned-name orphan recovery.

## S7 — Explicit VPS orchestration

pgtest-db creates/drops an empty run anchor on 127.0.0.1:55432; code owns template
and clones. Full suites use heavy and at most two workers, no duplicate cache.
Without CREATEDB, stop and propose an external per-run clone plus serial files;
do not silently share a concurrent mutable database.

## S8 — Run ownership and template safety

Only names generated within the exact current unique namespace may be dropped/
terminated. Quote/bound identifiers, never consult production credentials or create
shared maintenance tables. No cross-run cache, hashes or advisory locks. Close all
template connections before cloning and unmark before dropping. Another run's
namespace remains intact during normal/failure cleanup.
