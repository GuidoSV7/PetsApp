# Spec: retained assertions, operational setup and boundaries

## S9 — Preserve existing five specs

Preserve all43 cases/assertions and SQL. Intended changes: imports, seven
exec→query calls and three obsolete labels. Identify unavoidable lifecycle-only
guards separately. No skips; pure postgres-semantics/in-memory adapters unchanged.

## S10 — Remove active embedded-engine use

Delete old helper after callers move; uninstall @electric-sql/pglite with npm,
no unrelated upgrades. No active imports/installed engine. Preserve third-party
optional-peer metadata/history. Update README/rules and CI PostgreSQL18 service,
healthcheck and unit-only URL with owned anchor lifecycle.

## S11 — Preserve boundaries and pause retirement

No production/connection/schema/migration/assertion/E2E/frontend changes.
retire-global-pet-model remains validated, paused and unimplemented.

## S12 — Authorized implementation, evidence and no commits

Prompt2 replaces planning-only status: apply ODD amendments then RED/GREEN without
old-engine instantiation or a temporary harness. Run helper/five regressions,
full suite, lint/build, normal/failure cleanup and timings. review.md records
commands/results, scenario→test/RED-vs-preservation, actual16/18 coverage and
deviations. Stop/report real compatibility conflicts rather than improvise.
No commits or push.
