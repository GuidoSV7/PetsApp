# Review: retire the backend global pet-model API

## Status and scope

Implementation and self-verification complete. Independent verification remains
unexecuted, not approved, by explicit Prompt 5 disposition. Full-scope native RDD
approved all four lenses; its exact acknowledgement completed and burned authority.
Native RDD did not require another independent verifier. No replacement was run.
Baseline: ae77894d39a019a45857477f473be93465aecdc6. Prompt 5 authorizes exactly
one commit after this native approval; no push. Precommit verification passed;
the actual delivery outcome is recorded by Git history and the external ODD tracker.
The PostgreSQL prerequisite is committed; retirement is resumed, not paused.

Removed only the six inventoried model source/spec files and model registrations
from PetModule. PetController, PetService, PET_REPOSITORY→DrizzlePetRepository and
PetService export remain. Direct multer/@types/multer declarations were removed
using npm; the Nest adapter's transitive multer remains intentionally.

The new normal-suite HTTP spec imports real AppModule, retains actual global
auth/throttle guards, and overrides PG_POOL/DRIZZLE before compilation. Fixture
Drizzle uses a private PostgreSQL clone; application pool shutdown is a no-op facade
so the fixture closes its real pool exactly once. ConfigModule.forRoot is forced
to ignoreEnvFile before AppModule import; no real environment file is loaded.
Explicit test config directs any legacy directory setting to an owned temporary
folder during RED, avoiding reads/writes of existing uploads. App, fixture and
owned scratch resources are closed in nested finally blocks.

## Authorization and bounded template edit

Initial direct template read was denied; implementation stopped and requested a
safer plan. The human then explicitly authorized bash read/edit of only the tracked
backend/.env.example, never backend/.env or another real environment file.

The authorized edit removed exactly two obsolete login-coupling comment lines and
the final commented model-directory block (including its separator). Seed values,
real-values warning and every other byte match baseline. The template contains
example values only; no real credentials are reproduced here.

This passive comment edit preceded runtime RED because the human explicitly
requested applying it before continuation. It did not change handler behavior;
all runtime deletion/module/dependency changes occurred after observed RED.
An initial EOF-newline precondition failed before writing; the compound shell's
final git diff returned0, not evidence of successful edit. The corrected precise
EOF check and subsequent bounded diff passed. No denial was bypassed before the
explicit target-scoped human authorization.

## Commands and observed results

Database test commands run from backend/ with a fresh pgtest-db create anchor,
heavy and maxWorkers2. An EXIT trap saves the command status, drops the anchor,
and exits with the saved status. No production database/container/volume used.

| Check | Result |
| --- | --- |
| HTTP spec before runtime removal: normal Vitest, --maxWorkers=2 --reporter=verbose | RED: exit1,5failed/6passed of11;5.86s. All five former-route assertions failed, all unknown404/protected401/pet controls passed. |
| HTTP spec + retained pet controller/service/rules/repository specs | GREEN: exit0,5files33tests, no skips;5.06s. Includes11HTTP and22retained pet cases. |
| npm uninstall multer @types/multer | exit0. Root declarations removed; retained lock package entries/versions identical, adapter/transitive multer retained. |
| Structural/source/package/template/protected-surface/uploads checks | PASS; exact checks described below. |
| npm run lint | exit0, no diagnostics. |
| Baseline-copy differential at ae77894 | exit0;6controls passed/5model cases excluded by filter;3.98s.18 public status/body records exactly match original pre-edit baseline and candidate; only5requested model responses changed. |
| npm run build | exit0; nest build;9s outer job. |
| Full normal suite: TEST_DATABASE_URL="$RUN_URL" heavy -- npm test -- --maxWorkers=2 | exit0;42files459tests, no skips;19.44s Vitest/20s outer job. Global teardown and anchor drop executed. |
| Independent verification | UNEXECUTED, not approved: incompatible HOME-isolation profile; no tests started; cancelled without retry/replacement. Explicitly accepted as a limitation in Prompt 5. |
| Native RDD | Full24paths/14new declared; tier medium; four lenses approved without correction; exact acknowledgement completed, authority burned. No additional verifier required. |
| Precommit full suite | Process-principal check, not independent: exit0;42files459tests/no skips;23.98s Vitest/25s outer job. Global teardown and anchor drop executed. |

Focused command:

```bash
TEST_DATABASE_URL="$RUN_URL" heavy -- node_modules/.bin/vitest run \
  src/pet/model-retirement.http.spec.ts \
  src/pet/pet.controller.spec.ts \
  src/pet/pet.service.spec.ts \
  src/pet/pet-rules.spec.ts \
  src/pet/infrastructure/drizzle-pet.repository.spec.ts \
  --maxWorkers=2 --reporter=verbose
```

Test-only RETIREMENT_HTTP_TRACE writes synthetic public-response JSON to an
explicit evidence path. Tests do not read Git history or contain scanner literals.
Baseline/candidate traces are stored under evidence/; they record status/body,
not secrets or production data.

### Actual RED versus GREEN

| Request without credentials | Before retirement | Required/candidate |
| --- | --- | --- |
| GET /pet/model |200 procedural metadata |404 exact Cannot GET /pet/model |
| GET /pet/model/file |404 domain message No hay modelo 3D global |404 exact Cannot GET /pet/model/file |
| POST /admin/pet-model |401 authentication required |404 exact Cannot POST /admin/pet-model |
| PUT /admin/pet-model |401 authentication required |404 exact Cannot PUT /admin/pet-model |
| DELETE /admin/pet-model |401 authentication required |404 exact Cannot DELETE /admin/pet-model |

Every candidate model response equals the full JSON body:
statusCode404, errorNot Found, messageCannot METHOD /path.
No uploaded asset was needed. The former domain404 did fail the exact-body test.

## Baseline-copy differential

A fresh mktemp directory received git archive of backend at ae77894 plus the new
HTTP spec. An inventory check confirmed only the example environment template
was tracked; no real environment file was copied/read. node_modules was symlinked,
HOME/cache settings were not changed, no package-manager operation ran there, and
the direct runner passed its version sanity check. Its own PostgreSQL anchor and
scratch directory were removed by the status-preserving EXIT trap.

The baseline-copy command used -t 'keeps|creates|preserves':6preservation controls
ran,5retired-route cases were deliberately excluded by this filter (not disabled
in source). Full RED/GREEN runs cover those five separately without skips.
18 public status/body responses equal both the original pre-edit baseline and
candidate exactly. No timestamp normalization was needed; pet DTOs have no dates.
The baseline/candidate command outcomes and stdout/stderr are retained in the
session job logs; the deterministic HTTP comparison is in evidence/http-differential.json.
No baseline Git dependency is embedded in a committed test.

## S1–S10 scenario → test classification

| Spec | Evidence | Baseline behavior / purpose |
| --- | --- | --- |
| S1 | Five parameterized normal-suite HTTP cases, full routing body and status | All5 observed failing before runtime removal; all5 GREEN afterward. |
| S2 | Unknown-route404 and existing /users/me401 on same real AppModule | Preservation controls passed during RED and GREEN; real guards were not overridden. |
| S3 | HTTP state create/reload; paid/broke care; coat; free/paid/broke rename; rejected inputs followed by full state equality; retained22 pet cases | Preservation controls passed before/after; coins/needs/name/renameCount and persisted state checked.18 public responses equal in copied baseline, pre-edit baseline and candidate. |
| S4 | Six paths absent; case-aware symbol/module-path scan outside src/test | Structural retirement check; not an HTTP RED case. No forbidden scanner literals in committed src/test. |
| S5 | Real AppModule compiles; PG_POOL and DRIZZLE fixture identity asserted; pet controls remain live | Existing functionality preserved while removing only model registrations. |
| S6 | Exact root package removal, lock comparison, retained adapter/transitive multer | Structural/dependency proof; build exit0. No unrelated upgrades. |
| S7 | Explicit target-only authorization, exact baseline-to-template transformation | Passive documentation/configuration check; no meaningful runtime RED. Seed/warnings preserved. |
| S8 | Protected-path git diff, unchanged uploads metadata digest/count | Preservation; no stored-file deletion or schema/migration/ignore/auth/guard changes. |
| S9 | src/pet/model-retirement.http.spec.ts normal discovery, shared PostgreSQL helper and precompile overrides | Actual normal-suite execution; no separate E2E rewrite, real .env read or app pool creation. |
| S10 | ODD/RED/GREEN records, command/results/limits, full-scope native approval | Functional/structural checks observed; native approval acknowledged; independent verification explicitly unexecuted/not approved. Prompt 5 conditionally authorizes one commit, no push. |

## Structural proof

- All six inventoried paths are absent.
- No retired service/controller/DTO/import paths, directory variable or upload
  package/type reference remains in backend/src or backend/test.
- package.json equals baseline after exactly removing dependencies.multer and
  devDependencies.@types/multer; scripts/unrelated declarations unchanged.
- Every retained non-root lock entry equals baseline; root declarations agree
  with package.json. Transitive multer version unchanged.
- Exact template transformation matches the human-approved comments/block only.
- Protected auth/guards/roles/users/database/helpers/schema/migrations/E2E/frontend,
  app module/main/configs, pet handlers/rules/repository and retained tests unchanged.
- Root backend/uploads/ ignore retained. Existing upload metadata (names hashed,
  contents unread), count/existence unchanged in evidence/uploads-before.json and
  uploads-after.json. No filesystem/volume cleanup operation was performed.

## Accepted limitation — independent verification unexecuted

Verifier mvo01vln-a-o3uh reported no runtime test had started: its harness requires
scratch copies and HOME/TMPDIR/cache isolation, conflicting with the explicitly
assigned VPS-safe execution constraints (never isolate HOME). Parent did not
attempt to override higher-priority instructions. The one query reply failed as
unavailable, so the task was cancelled; no alternate verifier, rerun or extra
verification was launched. No independent runtime verdict exists.

Prompt 5 explicitly chooses option 2: leave independent verification unexecuted,
without representing it as approved. The reason is the verifier profile's HOME
isolation requirement conflicts with VPS rules. Fixing that profile is separate
follow-up work, not part of this change. The parent33focused/459full tests,
lint/build, structural checks and18unchanged HTTP responses against baseline
remain the review evidence; none is relabeled as independent execution.

The human authorizes native RDD for this candidate and one conditional commit.
All authorized new files must be declared up front, including the HTTP spec and
entire OpenSpec change folder. If the current review plan still requires an
independent verifier, stop and report; do not start a verifier or substitute.
The native full-scope review subsequently approved without requiring another
independent verifier. This approval is not an independent runtime-test verdict.

## Native RDD evidence

- Consent explicitly granted for this exact candidate via the provider binding.
- Scope:24paths,2521changedlines, including all14new paths (entire13file
  OpenSpec change folder, evidence/review/tasks included, plus the HTTP spec).
  Local odd/ tracking is excluded from review/delivery.
- Native tier:medium; configuration_change in backend/.env.example.
- Base tree:a445c9467e1dcce7af9ccd2f5060bb26f845a018.
- Reviewed tree:54b1a21db1bda1d09c6ff7cc4165177c99bcfa03.
- Target:sha256:56331df6c143ca246089c981ec763e3e008e854d2a6632dfef001821c4025b5c.
- Lineage:review-ea4ca0d55990ec37.
- Four provider-bound model runs: risk, resilience, readability, reliability;
  all four artifacts admitted, final event approved, no correction required.
- Exact acknowledgement completed: authority burned;
  consumed_revision:sha256:2b9f7f9a7c5307f31659b1bb975ebe77f81a2b0eaf39bd0cacc88f7fe5a7f429;
  burn_evidence:gentle-ai.review-acknowledged/v1.
- Full findings text was not exposed by the grouped capture envelope; approval
  is reported, not an unsupported claim that no informational findings exist.
  No review worktree was manually removed.
- One attempted STATUS call through codemode was refused before execution;
  all successful authority/capture calls were direct native facade calls.
- This final closure record and task-status updates were written after the
  acknowledgement. Only review.md/tasks.md may differ from the reviewed tree;
  all other22candidate paths must be byte-identical, including source, HTTP
  test, template, package/lock, static plans and synthetic evidence. The native
  approval binds the frozen tree, not these later reporting bytes or a future
  commit identifier.

## Deviations and follow-ups

- Follow-up (separate change): correct the independent-verifier profile to obey
  VPS rules, specifically never isolate HOME. No profile change attempted here.
- .cursor/skills directory unavailable; matched existing Nest/test patterns instead.
- Initial read-only inventory used a nonexistent users controller path, then found
  the actual controllers; no modifications resulted from that failed read.
- Explicit scoped bash authorization resolved the example-template tool block.
- No production bootstrap/main changes; test explicitly applies HTTP cookie/proxy
  setup and ValidationPipe while keeping actual guards.
- npm reports15vulnerabilities (2low/6moderate/7high), as before this retirement,
  and four install-script allowlist warnings. No audit fix or unrelated upgrade.
- Existing E2E localhost5432 fallback remains unchanged; E2E not executed here.
- All actual DB tests target existing VPS PostgreSQL16.15, not production.
  PostgreSQL18 first-CI validation remains the prerequisite change's follow-up.
- No existing stored data/files/directories/volumes removed. No push/deploy.
  One commit is authorized only following native approval, which has completed.

Risk: item2 (authenticated upload-surface removal), item5 (dependencies).
