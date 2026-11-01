# Freighter — new blind final-state security review

## Result and evidence limitation

**The new independent verifier reported no proven-real security defect.** No doubtful findings or application corrections were returned. This is a bounded review result, not production certification, native approval, real-wallet T7 completion or delivery authorization.

**Final T8 acceptance is BLOCKED pending an owner decision.** The verifier reported retained scratch, but a subsequent evidence-only export found that directory absent. No original report file, expanded command list, raw logs or executed probe source could be exported. Cause is unproven. The exact completed harness-returned report is archived as `verifier-return.txt`; it is not presented as the missing original report/log files. Export failure is archived separately. No artifacts or hashes were reconstructed and no verification was rerun to hide the gap.

The parent asked: accept the returned report with this limitation explicitly recorded, or keep T8 blocked for missing artifacts? No answer is inferred.

## Source identity and blindness

- New verifier: `mvy8gljc-12-nj44`.
- Application source: `a2db3884356a694a245ffa798d71613dbe4e6e3c`.
- Source-only input: 423 source/config/test/migration files; no prior reports, conclusions, approvals, task history or proposals supplied. Git/history/native metadata and original worktrees were outside scope and reported not accessed.
- `SOURCE_MANIFEST.json` SHA-256: `e408cd4d1954173095c6e15906af0aa12e2e17aca3d733ba470960ec53ba5174`.
- Reviewer reported all 423 hashes matching before/after, and historical 0006–0008 fixtures matching final SQL. The source input/manifest still exist; missing execution artifacts are a separate limitation.
- Neutral `REVIEW_SCOPE.md` quoted the owner's critical-surface and listener requests, not previous review conclusions.

## Findings by severity

| Classification | Finding / file / exploit scenario |
| --- | --- |
| Proven-real security defect | None reported across the requested surfaces. No application correction made. |
| Doubtful/inferential concern | None returned. |
| Evidence limitation | Original execution artifacts unavailable after scratch loss; final acceptance awaits owner disposition. This is not classified as an application security defect. |
| Existing lint warnings | Three unchanged sort-compare warnings in auth specs; not security findings and not fixed as scope creep. |

## Critical-surface coverage reported by the verifier

Paths are repository-relative. Rows describe the returned report, not a parent's re-execution or independently inspected raw logs.

| Surface | File and concrete reported scenario |
| --- | --- |
| SEP-10 purpose/browser/five minutes | `backend/src/auth/infrastructure/stellar-webauth.adapter.ts:28`; `drizzle-stellar-auth.repository.ts:58` in the same directory. Transaction-hash, purpose/browser bindings and strict server expiry passed SDK/HTTP cases. |
| Threshold/nonexistent account/Horizon errors | `backend/src/auth/infrastructure/stellar-webauth.adapter.ts:39,60`. Weighted high-threshold checks, ineffective-signer exclusion and genuine 404 fallback. Independent Horizon 429 stub returned 503, `Stellar verification temporarily unavailable`; DB snapshot unchanged. |
| Attempts/three bad signatures | `backend/src/auth/infrastructure/drizzle-stellar-auth.repository.ts:25,67,77`. Parallel bad proofs returned [401,401,401]; subsequent valid proof returned 401, `Invalid or expired Stellar challenge`, without further mutation. Foreign browser returned 401, `Invalid Stellar flow`, snapshot unchanged. |
| Cookies/Bearer/logout/hydration | `backend/src/auth/session-cookie.ts`; `frontend/src/features/stellar-auth/stellar-auth.ts:58`; `frontend/src/features/auth/session.ts`. Production `__Host-` attributes, Bearer precedence, logout clearing, profile-confirmed hydration and both stored Bearer keys removed before profile fetch. |
| Recent linking/roles/no wallet admin | `backend/src/auth/infrastructure/drizzle-stellar-auth.repository.ts:87,103`; `backend/src/auth/stellar-session.ts`. Five-minute signed-session window, purpose/session binding, current-user/role reread and promotion-after-wallet-auth cases. |
| Claim/conflict/archive/guest revocation | `backend/src/account-pet/infrastructure/drizzle-account-pet.repository.ts:45,87`. Concurrent `keep_account` retries returned identical 200 results and balance 42 from 19+23. Current/archived guest reads returned 403, `GUEST_PET_UNAVAILABLE`. |
| Lost-response recovery/owner isolation | Same repository, line 118. Owner status GET returned exact committed result; foreign owner returned 403, `PET_OPERATION_UNAVAILABLE`. Rejected/read-only requests left snapshots unchanged. |
| Unique/concurrent legacy credit | Same repository, line 241. PostgreSQL concurrency/retry checks passed; unique credit per pet and serialized owner updates. |
| Migrations 0006–0008 | Fixtures byte-identical to final SQL. Historical-journal bootstrap/final migrator preserved user/journal hashes. Migration suites covered legacy-row preservation and lock-timeout rollback. |
| Frontend owner/epoch fences | `frontend/src/features/pet-home/api/use-pet-gameplay.ts:35,115`. Same-owner epoch replacement prevented pending mutation publication and retained callback submission. Home stages keyed by owner+epoch. |
| Default-off gates | `backend/src/config/stellar-auth.config.ts`; `backend/src/account-pet/account-pet.config.ts`; `frontend/src/features/pet-home/api/account-pet.ts`. Backend fail-closed and frontend explicit enablement. |
| Listener setting | `backend/src/main.ts:39`; `backend/src/main.spec.ts`. Only `BACKEND_LISTEN_HOST` read; ephemeral transport verified generic `HOST` ignored, absent-setting default and explicit loopback-only binding. |

## Reported executions

The verifier reported every row exiting 0; these are not substituted raw execution artifacts.

| Check | Returned result |
| --- | --- |
| Backend runner | Vitest 4.1.12, Node 24.22.1 |
| Frontend runner | Vitest 3.2.7, Node 24.22.1 |
| Backend focused suites | 125 tests / 12 files passed |
| Frontend focused suites | 144 tests / 18 files passed |
| Independent backend probes | Initial 2 passed; expanded final 3 passed |
| Independent frontend probe | 1 passed |
| Backend/frontend TypeScript | Both `tsc --noEmit` exit 0, empty stdout/stderr |

Test invocations used `exclusive petsapp-heavy-a2 -- heavy -- node_modules/.bin/vitest run --maxWorkers=1 …`. Backend fixtures used the local throwaway PostgreSQL cluster at `127.0.0.1:55432`, not production. Installed direct binaries, no package manager/install. Reviewer reported awaited listener closure and fixture/template cleanup; original cleanup logs are among the unavailable artifacts. Original tool output was combined stdout/stderr; separate channels are not fabricated.

## Separate primary listener gates — retained evidence

Parent-run listener evidence is intact: RED 1 pass / 2 failures → GREEN 3/3; full backend 671 tests / 66 files, E2E 2/2, types/lint/Nest build exit 0; three unchanged auth-spec warnings; explicit disposable DB drop exit 0. Source hashes match those gates. These retained primary logs are distinct from the unavailable blind-review logs. See [rename evidence](freighter-listen-host-rename-evidence.md).

## Dynamic and lifecycle limits

- No deployed proxy-topology proof or real-browser cookie delivery.
- No real extension/wallet integration, live Horizon or chain behavior. Horizon stubbed; frontend used jsdom.
- Reviewer did not repeat full suites or production builds. Primary backend gates are separate evidence.
- T7/DEPLOY docs omitted intentionally from blind input; parent updated/read them separately.
- Native ASSESS was unavailable due an untracked-declaration error. No native review creation, acknowledgement or approved-ref update. Security item 2 required independent verification; its returned report and evidence limitation are recorded above.

## Retained material and historical acceptance basis

Resolve `git rev-parse --git-path agent-evidence/freighter-final-security`: retained primary RED/GREEN/gate stdout/stderr, source/commit manifests, blind input, exact verifier return and export-failure return. Source snapshot/neutral scope/manifest remain in the registered proof worktree. Original blind logs, expanded command list and executed probe files are NOT retained. Export copied zero files and generated no original-artifact hash manifest. No candidate probes were promoted into Git tests.

[Reconciliation](freighter-t8-review-reconciliation.md) and [coverage](freighter-t7-review-coverage.md) retain six native approvals, maintainer-only R2 and exact 54ddaf omission. The owner's basis supersedes missing historical snapshot reconstruction, which is not pursued. The NEW review reports no defect, but acceptance of its separate missing execution artifacts is unresolved. Historical union and native approval are not fabricated. No auth/ledger/migration/frontend source changed after the listener rename.

Risk: item 2 (listener exposure); independent review returned, auditability limitation awaits owner decision. No T7, production/mainnet, push or merge.
