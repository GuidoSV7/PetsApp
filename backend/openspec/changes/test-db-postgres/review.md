# Review: per-run PostgreSQL test fixtures

## Status and scope

Implementation, functional checks, bounded independent verification and native RDD
complete. Native approval was exactly acknowledged. Prompt 3 validates this report
and authorizes exactly one Git commit with the specified message; no push.
`retire-global-pet-model` remains paused.
Baseline: `d7a936dbe64aef8d4d032d5d1e355ee8d9c48c23`.

One fresh template is migrated in normal Vitest globalSetup, before workers.
Only serializable namespace/name metadata travels through project.provide/inject.
Each allocation gets a private clone; fixture close and global teardown dispose
only generated names belonging to that run. No cache/hash/advisory lock/barrier.
The lifecycle contract test creates an additional simulated independent run to
exercise teardown; normal globalSetup still creates exactly one template/run.

## Commands and observed results

Commands below ran from `backend/` unless stated otherwise. Database checks used
an empty anchor from `pgtest-db create`, always disposed by an EXIT trap. The trap
saved `$?`, called `pgtest-db drop "$RUN_URL"`, then exited with the saved status.
No old-engine execution or timing baseline was performed.

| Command/check | Observed result |
| --- | --- |
| `node_modules/.bin/vitest run src/testing/postgres.spec.ts --maxWorkers=2` before implementation | RED: exit1; one failed suite, zero collected tests, missing `./postgres.js`; 431ms. This is collection failure, not eleven individually executed failures. |
| Same helper command with isolated TEST_DATABASE_URL, after implementation | GREEN: exit0; 11/11 tests; 5.31s. Actual globalSetup/provide/inject works on Vitest4.1.12. |
| Helper + five existing specs, `--maxWorkers=2 --reporter=verbose` | exit0; six files, 54/54 tests: 11 helper + 43 retained; no skips; 9.49s. |
| `TEST_DATABASE_URL="$RUN_URL" heavy -- npm test -- --maxWorkers=2` | exit0; 43 files, 456/456 tests, no skips; 25.07s Vitest time (28s outer job including provision/audit/drop). |
| Full-run database catalog audit after Vitest exited | exit0; zero names remaining for `petsapp_test_83917e09ffb141fdb8e941752f352e7c`. |
| Intentional failing assertion after allocating a fixture and ending its pool without dropping its clone | Expected exit1; one failed test; 2.33s. Normal global teardown ran despite failure. Separate catalog audit exit0, zero names remaining for `petsapp_test_99eb2fd3a25f4028ae3a250af3097219`; outer wrapper preserved exit1. |
| `env -u TEST_DATABASE_URL DATABASE_URL=postgresql://must-not-be-used.invalid/production node_modules/.bin/vitest run src/testing/postgres-semantics.spec.ts --maxWorkers=1` | exit0; 13/13 pure tests, 1.18s; no template/connection setup. |
| `npm run lint` | exit0; three existing unbound-method warnings in unchanged `admin-pet-model.controller.spec.ts` lines15/21/27. No new-file diagnostics. |
| `npm run build` | exit0, `nest build`; outer job9s. |
| `npm uninstall --save-dev @electric-sql/pglite` | exit0, exactly one removed package; only direct declaration/installed entry removed from lock. No unrelated package upgrades. |
| Installed graph `npm ls @electric-sql/pglite --all` | Empty graph; no installed engine. Do not interpret an empty npm graph's exit convention as a functional test failure. |
| Exact five-spec permitted-edit comparison against `git show HEAD:<path>` | PASS: each file equals baseline after only import replacement, seven `client.exec`→`client.query` calls, three engine-label changes. All business assertions/SQL untouched. |
| Lock JSON comparison | PASS: every retained non-root package entry byte-equivalent after JSON serialization; no unrelated version changes. |
| Active src/test scan and protected-path `git diff --exit-code` | PASS: no old-engine references; production/schema/migrations/auth/database/E2E/frontend/root ignore unchanged. |
| CI inline JS `node --check --input-type=module`; exact frontend/E2E text comparison | PASS; PostgreSQL18 image, unit-only TEST_DATABASE_URL, dedicated55432 port, healthcheck and unique anchor lifecycle verified structurally. |
| Optional combined YAML-parser check | UNAVAILABLE: `require('./backend/node_modules/yaml')` raised MODULE_NOT_FOUND before its JS checks. Compound shell ended0 only because later independent checks passed; not YAML validation. No parser installed/retried. The separate exact-edit/lock and CI-inline-JS checks above did execute/pass. |
| `git diff --check` | PASS. |
| `gentle-ai review mode status` | RDD on, decided by default; global/clone-local unset. |

The six-file command selected:

```text
src/testing/postgres.spec.ts
src/users/infrastructure/drizzle-user.repository.spec.ts
src/roles/infrastructure/drizzle-role.repository.spec.ts
src/pet/infrastructure/drizzle-pet.repository.spec.ts
src/pet/pet.service.spec.ts
src/pet/pet.controller.spec.ts
```

Full-suite wrapper/audit shape (the actual command also retained a temporary log):

```bash
RUN_URL=$(pgtest-db create petsapp_tests) || exit
cleanup() {
  status=$?
  trap - EXIT
  pgtest-db drop "$RUN_URL"
  exit "$status"
}
trap cleanup EXIT
TEST_DATABASE_URL="$RUN_URL" heavy -- npm test -- --maxWorkers=2
# Audit generated run namespace(s) after Vitest exits; preserve the test status.
```

The failing-run proof used a `mktemp -d` scratch project, the same normal Vitest
config, symlinks to this backend's source/node_modules, and a temporary single
spec. It invoked the binary directly (no package-manager operation in the copy),
first checked Vitest's version, left one owned clone deliberately, then failed an
assertion. The clone's pool was ended to make the deliberate database leak
explicit without keeping a worker connection alive. Temporary files and the
anchor were removed by the outer trap. No permanent failure spec/barrier remains.

Post-run audits used a new test maintenance connection and parameterized SELECT:

```sql
SELECT datname FROM pg_database
WHERE EXISTS (
  SELECT 1 FROM unnest($1::text[]) AS p(prefix)
  WHERE left(datname,length(prefix))=prefix
);
```

The parameter was the exact namespace(s) parsed from that invocation's logs,
not a broad cleanup pattern. Audit SQL was read-only. Cleanup itself validates
exact generated template/clone shapes before quoted ALTER/DROP statements.

## Scenario → test / baseline classification

The observed RED was the missing-helper collection failure. No baseline old-engine
run was permitted/performed. “New contract” below means the new fixture/API is
absent on baseline; it does not claim independently observed baseline outcomes.

| Spec/scenario | Test/evidence | Classification |
| --- | --- | --- |
| S1 missing/blank test URL despite production URL | `requires the test URL...`; parameterized blank case | New helper contract; missing-helper RED observed; source checks config before inject/pool. |
| S1 malformed/non-PostgreSQL URL without SQL/secrets | Two invalid-URL cases, fixed error; pool-connect spy | New helper contract, not a baseline engine run. |
| S1 no URL, pure tests still run | `does not connect or provide...`; separate 13-test no-URL command | New setup contract + retained pure-test preservation. |
| S2/S3 migration and connection-free template | `receives the migrated connection-free run template...` checks built-in roles, migration ledger, template flags and zero sessions | New contract, real PostgreSQL. |
| S2 failed migration cleanup | `cleans partial template creation...` with unique empty temporary migration folder | New contract; zero owned databases after rejection. |
| S3/S8 publication before workers | Actual globalSetup with project.provide and worker inject, no shared Pool metadata | New API/runtime compatibility proof. |
| S5 concurrent same-template cloning | `clones concurrently...` uses Promise.all, distinct current_database, same key/distinct values, independent TRUNCATE | New single-file isolation contract; no barrier. |
| S5 each allocation unique | `assigns a fresh database name...`, three allocate/close cycles | New contract. |
| S6 idempotent close | `disposes the owned clone idempotently...`, simultaneous/repeated close and catalog checks | New contract; template survives. |
| S6/S8 run teardown and isolation | `global teardown removes leftover clones...`, repeat teardown, other active run's template survives | New lifecycle/ownership contract. |
| S6 normal + failing invocation cleanup | Two external post-exit catalog audits above | New runtime proof; expected failure exit preserved. |
| S7 wrapper/no CREATEDB/SIGKILL | Real pgtest-db wrapper; README explicit serial alternative and exact-name orphan procedure | Normal wrapper exercised; alternative/SIGKILL documented, not simulated or implemented as fallback. |
| S4/S10 versions/CI | Actual VPS16.15 checks; configured PostgreSQL18 service, healthcheck and unit-only URL |16 execution verified;18 execution pending CI, no false coverage claim. |
| S9 five existing specs | Users25, roles5, pet repository3, pet service6, pet controller4; exact source comparison |43 retained preservation tests, not newly failing baseline tests. |
| S10 engine removal | npm uninstall, empty installed graph, lock/source checks | Operational/structural contract; genuine Drizzle optional-peer metadata retained. |
| S11 excluded surfaces | Protected path diff and CI frontend/E2E comparison | Preservation; no old application behavior modified. |
| S12 full suite/lint/build/evidence/no commits | Commands above; HEAD unchanged; ODD/OpenSpec records | Verification/procedure evidence, no fabricated receipt. |

## Timings

Observed six-file run: template184.5ms (full suite276.0ms; first cold helper944.7ms).
Per existing spec clone: users140.2ms, roles205.1ms, pet repository114.2ms,
pet service129.3ms, pet controller116.5ms. Helper clones101.4–166.9ms in the
six-file run. Full suite25.07s. Shared-host load is not controlled; these are
observations, not a performance guarantee or old-engine speed comparison.

## Coverage boundaries / deviations

- All real execution used the VPS PostgreSQL16.15 endpoint127.0.0.1:55432.
  Production18 is human-reported. CI now configures18 but was not executed here;
  no publication/shared-cluster upgrade authorized. Do not call this18 runtime proof.
- No existing lifecycle guards/assertions needed changes; the five consumers have
  only the explicitly permitted transformations. Pure semantic fakes/contracts stay.
- The optional YAML parser was unavailable; CI was read structurally and its Node
  payload syntax checked. Hosted CI itself remains unexecuted.
- npm reported15 vulnerabilities (2low/6moderate/7high) and four install-script
  allowlist warnings. No audit fix/unrelated upgrade performed; no causal claim.
- E2E was not executed or changed. Its preexisting localhost:5432 fallback remains
  a separate follow-up, not activated by unit TEST_DATABASE_URL.
- No SIGKILL injection; normal assertion-failure teardown was verified. Abrupt host
  termination can leave exact-owned-name orphans, as README explains.

## Independent verification and native RDD

Independent verifier mvnwhz75-9-jsq4 completed: no implementation blockers;
S1–S12 met with explicitly bounded version/CI coverage. Its sole six-file run
passed54tests in10.71s, exit0, no skips; PostgreSQL16.15 independently observed.
Post-exit catalog audit found zero databases across its three exact namespaces.
Exact permitted spec transforms/lock/scope checks passed and HEAD was unchanged.
Parent RED/full-suite/lint/build/failing-run evidence was reused, not independently
reproduced. Optional exact-message assertion strengthening was suggested but is
not a reproduced defect and was not added.

Verification procedure deviation: the child isolated HOME (contrary to host
instructions) and retried an initial30s workspace-copy timeout before any runner
or anchor creation. The successful run used direct binaries, not package-manager
operations, and runner sanity reported4.1.12. These deviations are recorded rather
than endorsed; no repeat verification is being launched.
Native ASSESS returned nativeRisk=unassessable because untracked files required
an explicit declaration; escalation item4 yielded risk=high and independentVerifier=true.
INSPECT then selected the four new helper/setup/test modules and five static
OpenSpec plan/spec files, alongside tracked infrastructure edits (21 paths).
Mutable review/tasks/ODD evidence and paused-retirement documents are excluded
from that native candidate. START initially stopped for candidate consent (risk high,21paths/1078lines),
without mutation/lineage. Human selected granted; answer-consent created native
lineage review-f23bb7fe473960f1 with four lenses and logical correction budget200.
Initial group call passed STATUS wrapper objects and was rejected without mutation;
fresh bound STATUS reoffered the same slots. Exact serialized collectBinding
values were then accepted and forecast4 pi_host_relay model runs, in provider order:
risk,resilience,readability,reliability.

All four reviewers were prepared/submitted. The last admitted event closed the
review as approved without correction. A fresh bound STATUS offered the exact
acknowledge-approved continuation; executing it returned:

- outcome: native-approved-acknowledgement-completed
- authority: burned
- burn_evidence: gentle-ai.review-acknowledged/v1
- lineage: review-f23bb7fe473960f1
- target: sha256:91f5dfce143fbe761243251f571b12f019475553b89dd615e7d6d478f81018f0
- consumed_revision: sha256:ac16b471324d08d4ee8b65de788e7b6cdb78c4ed0ecf219e55e36e6381c8801d

No STATUS was issued after the burn. No Git commit/push was created: native
mutation_outcome=committed refers to the native acknowledgement record only.

Non-blocking advisory preserved exactly as returned: R3-failure-teardown-proof,
lens reliability, backend/src/testing/postgres.spec.ts:182, severity WARNING,
disposition informational. The closure says the receipt stands, no correction
opened/reopens this review, and no correction transition is offered; consider it
only as separate future work, not grounds for another review of this candidate.
The closure response did not include its explanatory/recommendation prose; none
is invented here. Native review trees/artifacts are retained, not removed.

Approval covers the frozen21-path slice, not mutable report/tasks/ODD additions
or excluded paused-retirement artifacts. Delivery remains ordinary repository
policy. Prompt 3 supersedes the earlier no-commit instruction with authorization
for one scoped commit; no push or retirement implementation is authorized.

## Follow-ups accepted in Prompt 3

- **R3-failure-teardown-proof**: non-blocking informational reliability warning at
  `backend/src/testing/postgres.spec.ts:182`. Full explanatory/recommendation text
  was unavailable; do not invent it or reopen the approved review.
- **15 npm vulnerabilities**: 2 low, 6 moderate and 7 high; pre-existing and not
  introduced by this change, as accepted by the user. Retained lockfile package
  entries/versions are unchanged; no audit remediation is included in this commit.
- **E2E localhost:5432 fallback**: retain the existing fallback in
  `backend/test/app.e2e-spec.ts` as separate work; no E2E code/config/command changes.
- **PostgreSQL 18 execution**: validate it in the first CI run. Current runtime
  evidence is PostgreSQL 16.15 on the VPS; CI18 is configured, not yet executed.

## Prompt 3 delivery

Exactly one commit is authorized, subject:
`test(backend): run database specs on PostgreSQL instead of PGlite`.
Only the requested backend fixture/test/config/dependency/docs/CI surfaces and this
OpenSpec change are included. Local odd/ tracking and paused retirement plans stay
outside the commit. Pre-commit full-suite verification passed:43files/456tests,
no skips, exit0,67.19s Vitest duration (75s outer job including provisioning/drop).
It used a pgtest-db anchor, heavy, maxWorkers2 and EXIT cleanup preserving status;
global teardown reported cleanup of namespace petsapp_test_ff85446604be41f0966ca0805f41ef81.
The23-path staged scope was checked explicitly. Its21 implementation/static-plan
paths match the approved candidate tree exactly; only mutable review/tasks are
additional. Earlier functional/independent/native evidence remains historical.
Actual resulting commit hash and post-commit verification are recorded in local
ODD, outside this payload, to avoid a self-referential commit hash.

Risk: item1 (owned database DDL), item4 (concurrent cloning/teardown), item5
(dependency/CI test environment). Native assessment and independent verifier apply.
