# Tasks: pet-coat-pattern

Status: implementation and functional checks complete throughT7; this is the immutable pre-RDD checkpoint. T8 closes in the excluded ODD tracker and final response only after native evidence, so this frozen checkbox does not claim a future approval. Check tasks off only with observed evidence. Independent verifier: UNEXECUTED / NOT APPROVED by this candidate's explicit human decision. No commits.

## References

[Proposal](proposal.md) / [Design and edit surfaces](design.md)
- [S1–S3: domain](specs/coat-contract.md)
- [S4–S6: HTTP/compatibility](specs/http-compatibility.md)
- [S7–S10: persistence/rollout](specs/persistence-and-rollout.md)

## Prompt2-authorized implementation sequence

- [x] T1 — S1–S3: extend existing public rule assertions and observe meaningful RED for the new field/default and omission preservation before production edits. Use existing modules; missing imports/exports or database setup errors are not RED. Pin the exact ordered list and unknown read normalization.
- [x] T2 — S1–S3/S8: add tuple/type/read normalizer/default and separate optional write input; implement omission-aware applyCoat. Run focused GREEN and preserve current colors/coated-status behavior.
- [x] T3 — S7/S9: first assert the absent journal entry/column metadata after successfully running the existing real migrator/lifecycle; a query against a missing column is not assertion RED; then handwrite0004 with SET LOCAL lock_timeout='5s', a statement breakpoint and ALTER TABLE; assert the exact timeout line; append the strictly later journal entry and update schema. Prove legacy0000–0003 rows gain solid unchanged otherwise. Never run generate or change old SQL/snapshot.
- [x] T4 — S4/S8: repository create/update/read normalization plus service pre-write validation, with assertion RED→GREEN for known persistence, omitted preservation, unknown direct-call rejection and raw SQL zebra fallback. Keep invalid requests from creating state.
- [x] T5 — S5/S6: extract createValidationPipe with the exact three existing options; use it in main and existing HTTP test, retaining existing controls. This is behavior-preserving extraction, not a fabricated RED or permission to change security.
- [x] T6 — S4–S6/S8: add the DTO's optional pattern and real HTTP acceptance tests. Observe assertion RED for calico POST/GET and colors-only retention, then GREEN. Assert striped400/error body/full nonmutation through the shared pipe. Preserve invalid colors, guest keys, other endpoints and patterns across care/rename.
- [x] T7 — S1–S10: update README; run focused tests, relevant existing controls, full backend suite, lint/build and the isolated baseline/candidate HTTP differential. Inspect cleanup after success/failure. Record exact commands, codes and results; no skipped proof presented as passed.
- [ ] T8 — S1–S10: write the implementation review with per-spec evidence, scope/old-migration checks, risks and limitations. Independent verifier remains UNEXECUTED / NOT APPROVED by Prompt2 for this candidate. Run fresh native RDD/consent on the complete declared scope; prior approvals do not transfer. Stop/report a block; no commit until separately authorized.

## Verification commands — record actual executions

From backend/, preserve HOME/Node and use the existing PostgreSQL helper/globalSetup:

```bash
set -euo pipefail
RUN_URL="$(pgtest-db create petsapp_coat)"
trap 'rc=$?; trap - EXIT; pgtest-db drop "$RUN_URL"; exit "$rc"' EXIT
export TEST_DATABASE_URL="$RUN_URL"
./node_modules/.bin/vitest run src/pet/pet-rules.spec.ts src/pet/pet.service.spec.ts src/pet/pet.controller.spec.ts src/pet/infrastructure/drizzle-pet.repository.spec.ts src/pet/model-retirement.http.spec.ts src/pet/coat-pattern.http.spec.ts src/db/coat-pattern-migration.spec.ts --maxWorkers=2
heavy -- ./node_modules/.bin/vitest run --maxWorkers=2
npm run lint
npm run build
```

During iteration, run only the relevant file/test; full-suite verification belongs at the implementation close before any later authorized commit. Every allocated run/fixture and the anchor database must be cleaned even on failure. Record the actual PostgreSQL version; do not claim production-version parity from historical evidence. No production credentials or DATABASE_URL fallback.

## Scope and risk gate

Prompt2 first confirms startup/transaction and corrects documents, then implements the complete26-path candidate declared in design before source writes. Record all functional evidence in review.md/evidence; raw logs/local runners/ODD trackers are excluded.

Risk: item1 (stored schema/migration) and item3 (shared pet persistence/response compatibility). The shared validation factory retains all three options; no auth/security policy change. Preserve the existing global pipe semantics and other endpoint contracts. Record the explicit candidate-specific independent-verifier omission, never label it approved; obtain fresh native review consent. If RDD blocks, stop/report.

When commits are later authorized: Conventional Commits only, no Co-authored-by or Generated-with attribution. No commit, push, merge or deploy now. Container startup runs migration before API in the same backend deploy; deploy this backend before the future pattern-sending frontend.
