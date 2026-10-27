# Free pet care — verification report

## Delivery and scope

- Local-only at the owner's latest explicit instruction: no issue, PR, push or merge.
- Initial coins: 0; valid care and renames preserve existing balances; API `coins` retained.
- Legacy stored `broke` becomes neutral `idle` in responses without a read-time write.
- Migration 0005 only changes the SQL default; migrations 0000–0004 are immutable.
- Shared home header hides balance/+; rename hint is always free.
- Product scope includes the owner's exact Spanish economy/accounts decision. Stellar payments, memo deduplication, Freighter, SEP-10 and account association are future features, not implemented here.
- The owner accepts the brief mixed-version window; no drain or two-release requirement.

## Test-first evidence

| Check | Observed RED | Observed GREEN |
| --- | --- | --- |
| Backend rules: initial0, feed0, rename after first | 7 failed / 11 passed before source changes | 18 passed initially; final delegated focused contract: 59 passed |
| Frontend free-care contract | Definitive RED: 12 failed / 4 passed | Final delegated focused: 87 passed |

Backend additional pre-fix focused run had 19 failures/36 passes; missing new migration SQL was an artifact-absence failure, not behavioral RED. Existing free-action/validation controls could start green.

Two initial frontend header assertions used an ambiguous brand query; that setup failure was corrected before definitive RED and is not claimed as product RED. A new HTTP test's hunger 46 mood expectation was corrected to the unchanged `Bien`, not by changing product rules.

## Full gates

| Gate | Result |
| --- | --- |
| Backend Vitest, isolated PostgreSQL, max 2 workers | 501/501, 46 files, exit 0, no skips |
| Frontend Vitest, max 2 workers | 479/479, 57 files, exit 0, no skips |
| Backend configured lint (`oxlint --type-aware`) | exit 0 |
| Backend TypeScript (`tsc --noEmit`) | exit 0 |
| Frontend TypeScript (`tsc --noEmit`) | exit 0 |
| Backend build | exit 0 |
| Frontend build | exit 0 |
| Public HTTP baseline differential | 28 cases: 21 unchanged, 7 requested changes, 0 unexpected |

Frontend has no configured lint command; no new linter/dependency was introduced. Known non-failing warnings: existing React `scroll` attribute warning in admin-nav tests; Next edge-runtime/static-generation warning during build.

The original baseline reproduces TS2352 in the authentication route-metadata test. The test-only correction uses `Reflect.get`; authentication runtime is unchanged. Historical retirement/coat HTTP expectations were updated only for requested initial balance/free repeated actions; route/validation/auth assertions remain.

## PostgreSQL migration proof

Real PostgreSQL 16.15, isolated databases. The 0005 test upgrades through real 0004 with existing balances 0/5/37 and compares all preexisting columns, including timestamps. Every row remains identical; a raw insert omitting coins receives 0. The journal prefix remains intact; reapplying is a no-op. The historical 0004 test retains its assertions with its migration input frozen at 0004.

## Real browser acceptance

PASS (exit 0): actual NestJS API, same-origin proxy and isolated PostgreSQL; no mocked care responses. Observed UI sequence: hunger 10 → 28 → 46 → 64 at coins 0; names Luna → Nube → Mora, renameCount 3; reload same guest preserved name/count/hunger/coins. Mobile 390×844 and desktop 1440×900 screenshots, intact brand/logout/layout, nonblank WebGL, 0 JS/network errors; owned browser/servers/database/workspace cleanup PASS.

Two failed runner attempts are not product RED: ambiguous brand label, then Next's standard route-announcer `role=alert` counted as an error. Corrections touch only the runner: unique logo role and explicit exclusion of the framework announcer ID. Both failed attempts reported cleanup PASS; the final physical audit below, not those reports alone, establishes cleanup. The corrected third run passed all acceptance assertions; application source was not changed for either runner correction. Final audit found `.next` cache residue from the second failed run despite its cleanup report. The parent removed only that owned workspace and verified all six owned ports unbound, all three workspaces absent and no browser/differential test databases remaining; the successful run's workspace was already absent.

No historical A1 home screenshots or fixtures are regenerated: the header intentionally changes. Existing skeleton/geometry tests and protected-source seals remain intact. SwiftShader is not physical-phone/GPU-performance evidence.

## Independent verification and native review

Independent verification: PASS, no product blockers, against committed candidate `9f90fbd` with baseline `c81e631`. Focused backend 55 / frontend 63, backend TypeScript exit 0 and two independent boundary/normalization probes passed; HTTP differential recomputed: 28 cases / 21 unchanged / 7 requested / 0 unexpected. Protected 69-file and 26-untracked-file hashes matched; committed screenshots matched the raw successful browser run.

The verifier used copied dependencies and an isolated HOME due its own runtime instructions, contrary to the parent's requested original HOME/symlinks. The owner explicitly accepted that environment exception. This is not described as an original-HOME independent run; the parent's full suites/builds/browser used the original HOME. No installs or repository mutation were reported. Five artifacts/probes and the result summary were archived privately; the exact owner-authorized `/tmp/petsapp-verify-a4pcUg` scratch was removed and its absence confirmed. The two scratch-only probes were not added to the repository or its suite counts.

Risk: item 1 (migration/persisted data).

Both native assessment attempts (working tree, then explicit committed range) returned `nativeRisk: unassessable`: the provider requires an explicit declaration of preexisting untracked files. Escalation item 1 returned `independentVerifier: true`; that required verification is complete with the documented owner-accepted environment exception. No `reviewDue` or review continuation was supplied, so no native review was started and no approval/authority was created. A1 authority is not reused.

## Evidence

- Raw command stdout/stderr/exit metadata: Git-private `agent-evidence/free-pet-care/`.
- Shared real-browser command and cleanup: `frontend/scripts/browser-evidence/README.md`.
- Compact results: `evidence/checks.json`.
- Screenshots: `evidence/mobile-home.png` and `evidence/desktop-home.png`.
- No production or Dokploy operations. Deployment was not triggered.
