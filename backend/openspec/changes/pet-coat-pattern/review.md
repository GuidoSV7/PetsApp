# Review: persisted pet coat pattern

Status: implementation and functional verification complete. This is the **immutable pre-native-RDD checkpoint**, not a native approval or an independent-verifier verdict. Subsequent native status/acknowledgement is recorded outside the frozen candidate in the ODD tracker, Engram and the final response; this report and its pending T8 checkbox are deliberately not rewritten after freeze.

Baseline: `d7d0fd29c06b33cbb8ccb427940d46fbcf2a602d`, branch `feat/voxel-pet-migration`. Complete scope: the 26 paths declared in [design](design.md) before tests/source writes, including this report and both evidence JSONs. No commits, push, merge, production access or deployment.

## Outcome

- Required state `coat.pattern`; ordered append-only identifiers: `solid`, `tabby`, `tuxedo`, `calico`, `pointed`.
- New/default/read-fallback pattern is `solid`. Unknown database values normalize on read without repair writes.
- Optional coat input preserves saved patterns when omitted. Known input persists; colors still lowercase and cost no pattern coins.
- DTO uses `@IsOptional()` / `@IsIn(COAT_PATTERNS)`. Service independently rejects invalid supplied values before `requireRow`/creation/update; explicit null is not omission.
- Bootstrap and both real HTTP specs use `createValidationPipe()` with exactly the previous three options. No other endpoint, auth/guard/role, frontend or test-helper behavior was changed.

## Commands and observed results

All test rows below ran from the repository root through:

```bash
node odd/evidence/pet-coat-check.cjs <label> <backend-command-and-arguments>
```

The excluded runner creates a unique `pgtest-db create petsapp_coat` anchor, validates local port55432, sets `TEST_DATABASE_URL`, deliberately makes `DATABASE_URL` unusable, executes in backend/, records stdout/stderr/report/exit code, audits owned namespaces and drops the anchor while preserving the test exit code. Failure-path cleanup was observed on all four RED runs, not merely promised by a trap.

| Label / backend command | Exit | Observed result |
|---|---:|---|
| `rules-red`: `./node_modules/.bin/vitest run src/pet/pet-rules.spec.ts --maxWorkers=2` | 1 | 4 assertion failures, 10 passes /14; production source unchanged before RED. |
| `rules-green`: same focused command after the domain change | 0 | 14/14 pass, 0 skipped; 1.920s. |
| `migration-red`: `./node_modules/.bin/vitest run src/db/coat-pattern-migration.spec.ts --maxWorkers=2` | 1 | 3 assertion failures /3; no absent-column query, SQL/import/config failure. |
| `migration-green`: same command after handwritten SQL/journal/schema | 0 | 3/3 pass; real legacy upgrade; 2.420s. |
| `persistence-red`: `./node_modules/.bin/vitest run src/pet/pet.service.spec.ts src/pet/pet.controller.spec.ts src/pet/infrastructure/drizzle-pet.repository.spec.ts --maxWorkers=2` | 1 | 9 matcher failures, 10 passes /19; 2 failures are `.rejects` incorrectly resolving, not infrastructure errors. |
| `persistence-green`: same command after repository/service change | 0 | 19/19 pass; 4.916s. |
| `http-red`: `./node_modules/.bin/vitest run src/pet/coat-pattern.http.spec.ts src/pet/model-retirement.http.spec.ts --maxWorkers=2` | 1 | 3 response-assertion failures, 13 passes /16, including all 11 existing HTTP controls passing. Factory existed before its new imports; DTO had no pattern yet. |
| `focused-green`: `./node_modules/.bin/vitest run src/pet src/db/coat-pattern-migration.spec.ts --maxWorkers=2` | 0 | 52/52 pass, 7 files, 0 skipped; 6.559s. |
| `controls`: `./node_modules/.bin/vitest run src/db/migrate-config.spec.ts src/testing/postgres.spec.ts --maxWorkers=2` | 0 | 16/16 pass; 3.302s. |
| `full`: `heavy -- ./node_modules/.bin/vitest run --maxWorkers=2` | 0 | 478/478 pass, 44 files, 0 skipped; 25.274s. Includes the final formatted tests and real HTTP/upgrade specs. |
| `npm run lint` in backend/ | 0 | Type-aware oxlint; stderr empty. |
| `heavy -- npm run build` in backend/ | 0 | Nest production build; stderr empty. |
| `node odd/evidence/pet-coat-differential.cjs` at root | 0 | 30 public HTTP observations; 26 unchanged after the explicit additive projection, 4 requested non-additive deltas, 0 unexpected. Both probe processes exit0. |
| `git diff --check` | 0 | No whitespace errors. |

Raw streams, exact process metadata and Vitest JSON reports are `.git/agent-evidence/pet-coat-<label>.*`; lint/build have their own stdout/stderr/exit-code files. Portable summaries and actual upgrade data are [tdd-results.json](evidence/tdd-results.json) and [http-differential.json](evidence/http-differential.json). Registered tests have no skips. The separate E2E runner and a UI/browser check were not invoked: no UI changed, and real AppModule HTTP acceptance is already included above.

### Actual environment and cleanup

- Node `v24.22.1`, Vitest `4.1.12`, unchanged `HOME=/home/agent`.
- PostgreSQL **16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)**, queried from each actual disposable anchor. No claim of production-version parity.
- Every observed run/upgrade namespace had zero remaining databases; every anchor cleanup returned0, including after RED exit1. The final full run audited both its global and upgrade namespaces.
- HTTP differential runs were sequential, max1 worker each, after the max2 full suite finished. No aggregate worker-cap violation, fixed production port, production URL, seed or production DDL.
- Baseline/candidate scratch copies and migration temporary folders were removed; no servers remain. Direct binary sanity checks passed after linking node_modules without dereferencing symlinks. HOME was never isolated.

## S1–S10: scenario → test → kind of evidence

Test names below are in the listed candidate spec files. “RED” means an observed failing assertion before its relevant implementation, not a hypothetical test or a missing import. “Preservation/integration” means it already passed at that stage and is not counted as RED.

| Spec | Scenario and actual test | Evidence classification |
|---|---|---|
| S1 | `pet-rules.spec.ts`: exact ordered `COAT_PATTERNS` list and membership/normalizer test | Domain RED: absent tuple / normalizer-function assertion; then GREEN. All five known identifiers are checked. |
| S2 | `pet-rules.spec.ts`: initial/default coat and unknown normalization; service/controller new-pet assertions; `coat-pattern.http.spec.ts`: returns solid on a new persisted pet | Domain/default and persistence assertions were RED. New HTTP default case was already GREEN after mapping: integration confirmation, not a separate RED. Existing colors/initial values are preservation assertions. |
| S3 | `pet-rules.spec.ts`: omission keeps the old tabby, explicit calico, unrelated fields/coated status; service `persists calico and preserves it on a later colors-only save` | Omission was domain RED. The pure explicit-pattern helper case already passed because spreading input retained the field: preservation-only, never claimed as RED. Persisted acceptance was separately RED in service/HTTP before their changes. |
| S4 | `pet.service.spec.ts`: rejects direct invalid striped/null without mutating or creating rows; `coat-pattern.http.spec.ts`: calico/GET/colors-only, striped/null400/error body/full row and public-state nonmutation/noncreation | Service rejection matcher RED; HTTP201 vs400 and validation-body RED. Error bodies, existing row including timestamps/counters, no new row and later GET are asserted after GREEN. Status400 alone for invalid input was already preservation behavior; new property recognition/body is the RED distinction. |
| S5 | `model-retirement.http.spec.ts`: existing 11 retirement/state/coat/care/name/auth/error controls; new HTTP spec and main import the same factory | Behavior-preserving extraction. All 11 existing HTTP controls passed during `http-red`, retaining whitelist/forbidNonWhitelisted/transform. No fabricated RED for moving configuration. Historical differential derives the actual old main literal; candidate uses the factory. |
| S6 | Service saved-pointed care/name test; existing controller/service/HTTP controls; 30-observation baseline differential for state, coat, actions and name | Saved-pattern carry-forward assertion was persistence RED. Existing endpoint/status/error/color/coin/need/name/counter controls and HTTP differential are preservation-only. Extra pattern in care body stays ignored, rename DTO still rejects it, state query still ignores it. No frontend edit or pattern charge. |
| S7 | `coat-pattern-migration.spec.ts`: journal strictly-later entry and unchanged legacy prefix; exact migration preamble | Both structural assertions RED, then GREEN. Exact SET LOCAL/breakpoint/ALTER and metadata assertions prove the requested storage shape; protected-file hash guard covers old SQL/snapshot. |
| S8 | Repository explicit create/update round-trip and raw zebra read-without-repair; real HTTP raw zebra fallback | Repository assertions were RED. HTTP raw-zebra case was already GREEN after mapping and is integration confirmation. SQL fixture still contains zebra after both reads; API/direct invalid writes do not normalize into success. |
| S9 | `coat-pattern-migration.spec.ts`: real0000–0003→full migrator upgrade, complete old row/defaults/journal/timeout assertions | Metadata assertion RED occurred before querying a nonexistent column. GREEN ran the real installed migrator on a separately built legacy template, not merely a latest-schema createTestDb fixture. |
| S10 | Dockerfile startup command; installed migration transaction code; migration exact preamble and post-commit SHOW lock_timeout; README/review deployment order | Structural/code-inspection and upgrade confirmation, not a fabricated behavioral RED or an executed production rollout. Lock-contention timing and a physical table-rewrite benchmark were not run. |

## Real0000–0003 →0004 upgrade evidence

The test copies unchanged legacy SQL and only the first four journal entries into an owned temporary folder; `startTestRun(url, context, folder)` builds the legacy template, and `allocateFixture` clones it. Before migration, information_schema proves there is no coat_pattern and the latest applied timestamp is1792291000000. This avoids using nonexistent createTestDb options or mistaking a fresh latest-schema fixture for an upgrade.

A synthetic legacy row uses coins37, nameLegacy, rename_count2, colors112233/445566/778899 and statuscoated. The test captures **every existing column**, runs the real migrator against all migrations, and asserts exact before/after equality with only coat_pattern=solid added. IDs, guest key, coins, all four needs, colors, status, name, rename counter and both timestamps remain equal.

Observed metadata: character varying length16, NOT NULL, default `'solid'::character varying`; latest applied timestamp1792291000001. A fresh raw insert receives patternsolid and coins5. SHOW lock_timeout returns0 after the migration transaction. Actual complete rows and namespace are in the full-run upgradeProof in tdd-results.json. Fixture/run/temp-folder cleanup is in nested finally blocks; owned databases were then independently checked by the runner.

Exact new SQL:

```sql
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "pet_states" ADD COLUMN "coat_pattern" varchar(16) NOT NULL DEFAULT 'solid';
```

Journal append: idx4, version7, tag0004_coat_pattern, breakpoints:true, when1792291000001 >1792291000000. No CHECK, UPDATE backfill, generation, legacy migration/snapshot edit or data-destructive rollback.

## HTTP differential and permitted deltas

The identical temporary harness SHA-256 is recorded in http-differential.json. It ran against an immutable archive of baseline d7d0fd2 and a source/schema/config copy of the candidate, with separate anchors/templates/clones and the same Node/HOME. The old pipe options are parsed from the historical main.ts literal, not manually re-declared; the candidate calls the actual shared factory. Both direct Vitest sanity checks and probe processes passed. Scratch copies were removed before writing PASS evidence.

All returned coats must have exactly the expected new pattern (solid, or saved calico in its scenario). Removing only that requested output field gives26 unchanged observations. Four explicit additional differences are asserted narrowly:

1. Valid calico POST: old unknown-property400 → new201, with other initial fields unchanged and statuscoated.
2. Immediate GET: new saved calico/coated state instead of the old rejected-write/idle state.
3. Invalid striped POST: remains400; old unknown-property message → the requested enum-validation message.
4. Explicit null POST: remains400; old unknown-property message → independent service rejection `Unknown coat pattern`.

Colors-only saves/reloads, care effects, free/paid rename rules and insufficient funds, invalid colors/actions/names and rejection nonmutation otherwise match. This is HTTP contract/persistence evidence, not a browser, throughput or production performance claim.

## Deployment order — documented, not executed

Confirmed `backend/Dockerfile:39`: `node dist/db/migrate.js && exec node dist/main.js`. The migration runner exits1 on failure, preventing API startup. Installed Drizzle `pg-core/dialect.js:55–69` executes migrations through session.transaction; node-postgres/session.js issues BEGIN/COMMIT/ROLLBACK on that client. SET LOCAL therefore affects the following ALTER inside the same transaction.

**0004 and the new backend are one deploy: migration first, then API startup, without a separate operator step.** Old backend inserts during rollout omit the new column and receive its solid database default. Existing old updates do not mention that column.

**Only after this backend is in production may the pattern-sending frontend `pet-voxel-coat-patterns` deploy.** The old DTO rejects pattern with forbidNonWhitelisted. No deployment or production request was performed here.

A constant default avoids a PostgreSQL11+ table rewrite, but ALTER still acquires a table lock. The transaction-local5s lock acquisition timeout bounds waiting and fails startup on contention; this is not lock-free DDL or a measured5s contention benchmark. No automatic DROP rollback is authorized.

## Differences, limitations and native-review boundary

- Prompt2 corrected the original operator-step rollout assumption before tests/source. Docker/startup and installed transaction semantics matched; no startup modification was needed.
- Separate PetCoatInput was necessary because stored/output PetCoat.pattern is required while old write callers remain valid. No repository-port/controller signature redesign was needed.
- Explicit null rejection covers IsOptional's known skip behavior; no new global pipe policy or unrelated error-message redesign.
- Only owned test files were formatted after focused GREEN; the final full suite ran afterward. No dependencies, configs/helpers, old SQL/snapshot, frontend, auth/guards/roles or Dockerfile changes.
- Optional raw upgrade tracing was added after migration RED because the JSON reporter hides nested test logs. It exposes the nested namespace and exact proof, without changing assertions or product behavior.
- One auxiliary metadata parse hit the read tool's truncation marker; a structured local JSON projection corrected extraction without rerunning tests. One exact-text tracker edit was rejected before writes; the file was reread and the correct task line updated. Neither is a product/test failure; original RED streams remain intact.
- **Independent verifier: UNEXECUTED / NOT APPROVED**, explicitly accepted for THIS candidate in Prompt2 because its profile isolates HOME against VPS rules. Functional checks and native review are not relabeled as independent verification.
- Native RDD switch was read as ON. This pre-review report contains no native verdict or inherited frontend authority. Fresh candidate authority/consent must include all26 paths, including untracked evidence. If native RDD blocks, stop and report exactly that block; no retry/reset/recovery or claim of approval.
- User explicitly forbids commits, so the native candidate is the frozen current-change scope rather than a committed range; no commit-first delivery action is implied. Review does not authorize delivery.

Risk: item1 (additive persisted-schema migration/startup lock) and item3 (shared pet persistence/output compatibility). Shared validation options are unchanged and preservation-tested; no auth/security policy change. No commit, push, merge or deploy is authorized.
