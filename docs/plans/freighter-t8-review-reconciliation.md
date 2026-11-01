# T8 — Read-only historical frozen-scope reconciliation

## Result: reconciliation performed; full union UNPROVEN

Historical accumulated range: `70906fdb87e2279268901ee791afeb1371051dd2..31615747ea866438eb4a3887a9ff785901059e0b`. Ordinary Git diff:137paths,7661insertions,393deletions. These are source-range statistics, **not reviewer-coverage proof**. New HOST preparation commits are outside this historical range and receive no inherited approval.

Read-only investigation `mvy59bs8-z-0wml` inspected archived receipts, terminal-consumption records, retained native transaction state and candidate-view ownership metadata. Parent spot-checked T1 receipt/R2 state and compared existing R2 frozen trees/paths with Git. No review creation, status transition, acknowledgement, recovery/reset, ref update or native-state mutation. No missing scope was reconstructed.

Path abbreviations refer to the **canonical main Git directory**, not a linked worktree's .git file:
- E=`agent-evidence/freighter-user-pet/`.
- G=`gentle-ai/`.

## Each recorded review: base, candidate, target and frozen scope

Commit associations below are historical documentary associations unless the evidence explicitly binds them; they are not manufactured native bindings. Target is the native SHA-256 identity, distinct from candidate commit SHA.

| Review / documented base→candidate | Native target | Exact frozen-scope evidence or missing datum |
| --- | --- | --- |
| T1 `review-55d03a440884f102`;70906fdb87e2279268901ee791afeb1371051dd2→bb515756fd5e2b0f937a264a80e1dfbd73d06e22 | sha256:91fe4bcf26ef31e992cd5d75d96790f52f6b86126166b6da4d794932816b79d8 | E/t1-native-review-acknowledged.json explicitly binds base/reviewed commit and trees. Missing exact target-bound frozen path/change scope;22files/1231lines and exclusion prose do not supply it. |
| T3 `review-c8bf1a7863ad6289`;bb515756fd5e2b0f937a264a80e1dfbd73d06e22→4d04f938ac004549d5b8c4602053de4d79bd58e5 | sha256:6af9592bc3f3e3dc934f5a39e1396e7e27fb568a2575e53b708c2fcffc9d4202 | E/t3-native-review-acknowledged.json binds lineage/target/burn only. Missing archived frozen base/candidate trees, scope and binding to the documented commits. |
| T2 `review-9a23ca16e7859025`;4d04f938ac004549d5b8c4602053de4d79bd58e5→3dceabaa86b82dc57182bacfeba95c0ca3292d0e | sha256:3ebcf8607327b8d509f88f939013fef272c1ae3e167c1a721cfa7022ecb5d263 | E/t2-native-review-acknowledged.json binds lineage/target/burn. Historical task records explicit base selection; missing archived frozen base/candidate trees and exact scope binding. Commit ledger is not reviewer scope. |
| T4 `review-efa37feddd229667`;3dceabaa86b82dc57182bacfeba95c0ca3292d0e→30fe40f70024f9796c943905aeb338816113f84c | sha256:c9a7d9027ef8ff4f817a1f7f72283eb6b626ef1f72fca00735b6a059ec73bfa7 | E/t4-native-review-acknowledged.json binds lineage/target/burn; missing frozen base/candidate trees and exact scope binding. |
| T5 R1 `review-3e2a1a81f864d970`;30fe40f70024f9796c943905aeb338816113f84c→6af0f0cbc1f5b9815aa8fb43a6a7b8b5900ae35b | sha256:602956fbf8c83035a098b3dcd99bb02b51e86ac4b5d19db74d186d9515559d31 | E/t5-review-coverage.json records interval; E/t5-range1-native-acknowledged.json records target/burn. Missing archived frozen base/candidate trees and exact scope binding. |
| T5 R2 `review-fdf646439a2cedd9`;6af0f0cbc1f5b9815aa8fb43a6a7b8b5900ae35b→97675617512dbab21ce30ed6858bbac91fc0d016 | sha256:f737c8866c3a0e31039462b860d41709235f3d9b6ae24992093cbcaaa33136db | **Located:** G/review-transactions/v2/review-fdf646439a2cedd9/review-state.json:9–53; exact frozen trees/paths/target. Parent Git comparisons match existing frozen scope; disposition is maintainer-only, not native approval. |
| T5 R3 `review-239b158eb267bb32`;97675617512dbab21ce30ed6858bbac91fc0d016→31615747ea866438eb4a3887a9ff785901059e0b | sha256:e0f4b6356a91544714dd079fe64008dd55f2ad6544220b8a9b581cb55492b0c8 | E/t5-review-coverage.json records interval; E/t5-range3-native-acknowledged.json records target/burn. Missing archived frozen base/candidate trees and exact scope binding. |

## R2: actual retained frozen scope, not inferred from ancestry

- Snapshot kind `base-diff`, interpretation `generated-summary/v1`, intended-untracked list empty.
- Base tree `3f16904719e2e8dfa14cc2a17e6dfa5eaf1c1c14` matches6af0f0cb's tree.
- Candidate tree `3d50fc0f6015a0087dcdfb398aac65b001a42f08` matches97675617's tree.
- Existing paths digest `sha256:f770dbc9cf79fa9b45d7a380f851638bf0ca2d9c15a7f12bb2da434a7a6e0545` is reported as stored, not regenerated authority.
- Exact ten paths recorded by that snapshot:
  - `frontend/README.md`
  - `frontend/package-lock.json`
  - `frontend/package.json`
  - `frontend/src/features/stellar-auth/config.ts`
  - `frontend/src/features/stellar-auth/freighter.ts`
  - `frontend/src/features/stellar-auth/stellar-auth.ts`
  - `frontend/src/features/stellar-auth/validate.ts`
  - `frontend/test/features/stellar-auth/freighter.test.ts`
  - `frontend/test/features/stellar-auth/stellar-auth.test.ts`
  - `frontend/test/t5-independent-auth.test.ts`

Parent's ordinary diff between these **already recorded** trees has the same path set. This validates that located binding only; it does not create any missing frozen scope or prove cumulative union. R2 native-state file hash remained unchanged across comparison. Retained state remains `correction_required`.

## Separate dispositions — never collapse them

1. **Native approved and acknowledgement burned:** T1,T3,T2,T4,T5R1,T5R3, as their archived acknowledgements record. Missing frozen scope evidence does not rewrite those historical outcomes.
2. **Reviewed, maintainer-accepted R2:** E/t5-range2-discriminant-diagnosis/{MAINTAINER-DECISION.md,REPORT.md,native-correction-request.json}. SDK-discriminant finding accepted as false positive by maintainer; no native approval/burn. R3 approval/last-approved ref is not transitive approval of R2.
3. **Exact owner-omitted cumulative target:** `sha256:54ddafef768072b83a7ba691dbbc8c10270140aeefaa96db872333bf4eb77c1c`, per E/t5-review-coverage.json. No native review creation, decline or RDD disable recorded for that target. Omission does not extend to HOST or any new target.

## Why union cannot be proved from available artifacts

The observed native inventory retains R2 v2 state. Matching terminal-consumption/v1 records for the six approved lineages contain repository/target/lineage only, not base/candidate trees or frozen changes. The six candidate-view owner metadata files contain ownership/location, not authoritative lineage/target/base/scope bindings. Assigning a source view to a review by matching a commit would be reconstruction, not evidence.

Needed data is specifically the **six approved lineages' target-bound frozen scope snapshots**, plus base/candidate bindings where absent above. Without them, no honest change-identity union comparison against70906fd..3161574 can be completed. Counts, contiguous intervals, source hashes and candidate-view contents cannot replace them. This is a proof gap, not identification of a particular unreviewed source hunk. No new review or authority repair was attempted as a workaround.

Parent metadata evidence resolves from the Freighter worktree via `git rev-parse --git-path agent-evidence/freighter-t8-reconciliation`, file `metadata-checks.json`: historical diff statistics, R2 existing-scope/tree match and unchanged native-state hash. Read-only reconciliation/report is complete; **T8 union acceptance remains UNPROVEN**. T7 remains owner-scheduled; no push/merge or production/mainnet action.
