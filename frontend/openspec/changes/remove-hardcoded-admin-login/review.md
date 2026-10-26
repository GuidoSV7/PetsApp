# Review: remove-hardcoded-admin-login

Status: functional verification complete under the criterion explicitly corrected by the human in Prompt3; native RDD approved and acknowledged, authority burned. Four browser cases have 0 JavaScript page errors; console contains only the expected 401 diagnostic in the rejected case. This is not literal compliance with the original zero-console-error wording. The single commit is authorized by Prompt3; its execution identity is recorded after creation in local ODD tracking and the PR description. No push.
Baseline: `9ffa2e1d58b5efe46e0f6346b59cb34d1086e617`; branch `feat/voxel-pet-migration`.
Scope: the exact 26 paths declared before source writes in [design §8](design.md). Local odd/ runners and archived raw logs are excluded.

## Outcome and boundaries

LoginPage now sends credentials to the unchanged Nest service without the old pre-filter. Only a successful allowed-role response saves a session. API/network failures show a safe error, restore submission and create no local session or navigation. The hardcoded module and its obsolete helper test are deleted.

The shared getter returns null for the retired constructor's user ID under either existing storage key, without changing stored bytes, key precedence or valid real-session behavior. The legacy email/password/token values exist only in the designated test fixture; source retirement is tested recursively across every regular src file.

No auth service, proxy, cookie policy, role definitions, backend, AdminLayout/server wrapper or unrelated admin page changed. The layout remains a forgeable client-side UI gate; Nest guards remain the data-security boundary. No production seed, credential rotation or deployment was performed.

## Commands and observed results

Commands below run from the repository root unless prefixed with `cd frontend`.

| Check | Command / evidence | Result |
|---|---|---|
| Assertion RED, before all production edits | `cd frontend && ./node_modules/.bin/vitest run test/features/auth/login-page.test.tsx test/features/auth/stores/auth-session.test.ts test/features/admin/admin-access.test.tsx test/lib/retired-hardcoded-admin-contracts.test.ts test/lib/pet-model-proxy-retirement.test.ts test/lib/retired-pet-model-contracts.test.ts --maxWorkers=2 --reporter=dot` | Exit 1; 6 files, 42 tests: 18 failed / 24 passed, 0 skipped, 0 collection/import failures; 2.60s |
| RED source guard | `git diff --exit-code 9ffa2e1 -- frontend/src backend` | Exit 0 before any source change; no untracked runtime/backend files |
| Focused GREEN + auth-service control | `cd frontend && ./node_modules/.bin/vitest run test/features/auth/login-page.test.tsx test/features/auth/stores/auth-session.test.ts test/features/admin/admin-access.test.tsx test/lib/retired-hardcoded-admin-contracts.test.ts test/lib/pet-model-proxy-retirement.test.ts test/lib/retired-pet-model-contracts.test.ts test/features/auth/api/auth.service.test.ts --maxWorkers=2 --reporter=dot` | Exit 0; 7 files, 47 passed, no skips; 2.53s; empty stderr |
| Typecheck | `cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false` | Exit 0; stdout/stderr empty; 6,460ms; no SEO waiver |
| Public-store differential | Temporary runner against baseline and candidate; [structured evidence](evidence/store-differential.json) | Exit 0; 30 cases / all 9 public exports; 25 identical, 5 expected legacy deltas, 0 unexpected; 463.22ms |
| Protected paths | `git diff --exit-code 9ffa2e1 -- frontend/src/features/auth/api frontend/src/app/petsapp-api frontend/src/lib/axios.ts frontend/src/lib/api-auth-policy.ts frontend/src/lib/petsapp-api-origin.ts frontend/src/features/auth/types frontend/src/app/admin/AdminLayout.tsx frontend/src/app/admin/layout.tsx backend` | Exit 0; no output |
| Full frontend suite | `cd frontend && heavy -- ./node_modules/.bin/vitest run --maxWorkers=2 --reporter=dot` | Exit 0; 48 files, 212 passed; 21.34s (22s outer). Existing admin navigation scroll-mock warning only; no skipped tests |
| Production build | `cd frontend && NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_PETSAPP_API_URL=/petsapp-api PETSAPP_API_INTERNAL_URL=http://127.0.0.1:9 heavy -- ./node_modules/.bin/next build` | Exit 0; parent job 9 completed in 25s; production routes built successfully; non-fatal edge-runtime/static-generation warning |
| Real Chromium | Owned production server, disposable contexts, simulated Nest, temporary Playwright 1.63.0; exact commands below | Job 10 exit 1 / 8s: three functional cases pass; rejected case hit an ambiguous alert selector. One selector-only targeted correction, job 11 exit 1 / 4s: rejected case functional PASS; one HTTP 401 console diagnostic remains. No errors suppressed |
| Native RDD | `gentle_review` ordinary review, exact 26-path candidate / 17 new files, four provider-bound captures and exact acknowledgement | Approved without correction; 4 prepared / 4 submitted; authority burned for review-a4c94afd94f3e983 |
| Whitespace | `git diff --check` | Initial README CRLF insertion: exit 2; one LF normalization correction; final exit 0 |
| Final declared scope and documentation | Parent structural readback | Exit 0: exact 26 paths (9 tracked changes, 17 new); 20 resolving local links; JSON valid; deleted paths absent; HEAD unchanged and index empty |

Exact RED/GREEN/typecheck stream paths, hashes and archive locations are recorded in [TDD evidence](evidence/tdd-results.json). Parent archived exact streams and the differential runner under `.git/agent-evidence/` and removed their owned temporary directories. Raw logs are not part of the candidate.

## Scenario → test / S1–S10

| Spec | Scenario and test location | Evidence class |
|---|---|---|
| S1 | Old pair plus rejected Nest; no session/error/nav effects in `test/features/auth/login-page.test.tsx`; module absence in `test/lib/retired-hardcoded-admin-contracts.test.ts` | Assertion RED before source edits → GREEN |
| S2 | Arbitrary real admin and super_admin; exact response persistence and navigation in login-page tests; member denial and legitimate Nest acceptance of former pair | Both arbitrary-role cases RED → GREEN; member/former-pair success are preservation controls |
| S3 | API and network failures with empty storage and each old key: visible error, pending reset, request, null session/bearer, zero writes/removals, no navigation | Six cases assertion RED → GREEN; added non-Error fallback test observed GREEN only |
| S4 | Both keys through public session/token/normalized readers, unchanged stored bytes in `test/features/auth/stores/auth-session.test.ts` | Both cases assertion RED → GREEN |
| S5 | Actual LoginPage mount and actual AdminLayout children/redirect tests in `test/features/admin/admin-access.test.tsx` | Each old key RED → GREEN; real/absent/member gates are preservation controls; browser functional cases pass |
| S6 | Existing role/key/storage-error/helper cases, unchanged auth-service and GLB proxy tests; temporary differential of all store exports | Preservation: 25 identical cases, 5 strictly requested legacy deltas; protected paths unchanged |
| S7 | Recursive byte scan of every regular src file, deleted module and imports; GLB retirement contracts decoupled from retired helper | Assertion RED → GREEN; GLB forwarding/upstream rejection remains a preservation control |
| S8 | Frontend README links existing backend seed procedure and names real environment inputs; seed skip/no-rotation behavior | Documentation readback; no seed execution or runtime RED claimed |
| S9 | README states human-only production review/rotation; protected backend and no production operations | Scope/documentation check, not a production test |
| S10 | Initial full inventory, observed sequencing, exact evidence, no commits, candidate-specific missing-verifier decision | Bookkeeping/proof boundary; automated checks pass; Prompt3 explicitly corrects browser-console criterion; native RDD approved/acknowledged separately from the unexecuted independent verifier |

## Differential interpretation

The comparison exercises public exports, not internal storage implementations. It compares return values, resulting storage bytes, calls/counters, stdout/stderr and exit outcomes on identical inputs.

Only five legacy deltas are permitted: reader rejection for each old key and old-primary precedence, plus two updateUserInSession cases becoming no-ops instead of saving/migrating the invalid legacy session. No real-session behavior changed. The runner is an excluded temporary baseline comparison; committed tests do not read Git history.

## Browser evidence

Executed real Chromium 153.0.8010.12 against the production build, with fresh contexts and simulated Nest responses. No external or production requests were made; every owned browser/server was stopped.

```bash
heavy -- npx -y --package=playwright@1.63.0 -c 'NODE_PATH="$(dirname "$(dirname "$(command -v playwright)")")" node odd/evidence/remove-hardcoded-admin-browser.cjs'
# One bounded harness correction; re-ran only the rejected case:
heavy -- npx -y --package=playwright@1.63.0 -c 'NODE_PATH="$(dirname "$(dirname "$(command -v playwright)")")" node odd/evidence/remove-hardcoded-admin-browser.cjs --only-rejected'
```

The runner is excluded local tooling; [auth-browser.json](evidence/auth-browser.json) is the declared sanitized candidate evidence.

| Scenario | Functional result | Console errors | JavaScript page errors | Capture |
|---|---|---|---|---|
| Real Nest admin | Exact returned session saved; /admin and its content visible | 0 | 0 | [Admin](evidence/real-admin-chromium.png) |
| Rejected login | Error visible; submit restored; both storage keys absent; no admin navigation | 1 expected HTTP 401 diagnostic | 0 | [Rejected](evidence/rejected-login-chromium.png) |
| Old primary key | Redirect to /; no admin children; original bytes unchanged; no legacy bearer sent | 0 | 0 | [Primary](evidence/legacy-primary-chromium.png) |
| Old alternate key | Same rejection and preservation | 0 | 0 | [Alternate](evidence/legacy-alternate-chromium.png) |

The rejected response deliberately used HTTP 401, producing this exact browser console message:

```text
Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

This is an expected HTTP diagnostic, not a JavaScript page error. The original literal “sin errores en la consola” was **not met**: both browser commands exited 1 and the original report remains pass=false. These execution facts are preserved, not relabeled as an exit-0 run.

Prompt3 human decision, verbatim:

> Acepto el diagnóstico de consola del caso rechazado. El criterio "sin errores en la consola" se refería a errores de JavaScript. Un 401 simulado siempre produce "Failed to load resource: … 401" en la consola, y es el comportamiento correcto de un login fallido. Registralo en `review.md` así: 0 errores de página en los 4 casos; en consola, solo el 401 esperado del caso rechazado. El criterio queda corregido por el humano, no cumplido literalmente.

Under that explicitly human-corrected criterion, T6 is complete: 0 page errors in all four cases; only the expected rejected-login 401 in console. No browser rerun, console suppression or application edit was used to reach this disposition.

First-run harness failure: getByRole('alert') matched the actual error paragraph and Next's route announcer. The one correction scoped the locator to the simulated error text and re-ran only rejected-login; no app code, server response status or console listener was changed. Initial JSON was archived under .git/agent-evidence/ with SHA-256 d70a0e5795072da7292b05c8ab85c741acdc49cd7286fb88e337d6eca0c43b34. Existing passing cases were retained, not re-run.

## Deviations and limitations

- The actual pre-Nest credential filter was removed in addition to the catch fallback, as already identified and included in the validated plan.
- RED ran twice: first 18 failed / 24 passed in 3.61s; storage write/removal counters were added to detect identical-byte overwrites, then the final 2.60s assertion RED was observed. No source/harness/import change was used to manufacture RED.
- One non-Error fallback regression was added during GREEN and is not claimed as RED evidence.
- Browser harness required one scoped alert-selector correction. All four functional cases now pass, but the simulated 401 logs one HTTP diagnostic; Prompt3 supplied the explicit human criterion correction before native RDD. No further browser verification or retry is scheduled.
- README line endings were normalized to LF after a whitespace check failure; the original README content remains alongside the requested section.
- **Independent verifier: UNEXECUTED / NOT APPROVED for this candidate**, explicitly accepted by Prompt2 because its profile isolates HOME against VPS rules. It was not launched. Native RDD, if approved, is separate evidence and does not retroactively execute this verifier.
- The old pair has no client privilege, but is not blacklisted if Nest genuinely accepts it. Human production password rotation remains necessary if applicable.

## Follow-up — not implemented

Validate the admin layout session against `/auth/profile` instead of trusting only localStorage. This would require separate decisions about loading, expiry, network failure and redirects; it is not implemented here and no server-side layout authentication is claimed.

## Native RDD

Fresh ordinary review **approved without correction**, with 4 reviewers prepared and 4 submitted. A fresh bound STATUS offered the exact acknowledgement; it completed successfully with `native-approved-acknowledgement-completed`, `authority: burned`, and `burn_evidence: gentle-ai.review-acknowledged/v1`. No STATUS or authority reuse followed the burn.

- Lineage: `review-a4c94afd94f3e983`.
- Target: `sha256:1677f5b7b51343cbf64b754451e9207f0dfda9dc1031b39dc1261ffac18c443c`.
- Reviewed tree: `dd6c435b0b1f5a63950bf6ff553131e2e872320d`.
- Base tree: `3b48233bb91ddf7818dc154ac5f0f10db99513aa`.
- Consumed revision: `sha256:d1671643cb44ee6468dbdd6ba33e1c8a1644ea993c92077eefc211354c0a1c34`.
- Risk tier: high; 26 changed paths / 17 explicitly declared new files / 2,607 authored lines; correction budget 200 was not used.
- Lenses in provider order: risk, resilience, readability, reliability. Forecast: 4 model runs over pi_host_relay, acknowledged before execution.

The provider's fresh consent UI was explicitly granted; answer-consent was submitted once. Native approval is not independent-verifier execution: that verifier remains **UNEXECUTED / NOT APPROVED** under Prompt2/Prompt3's decision.

The capture facade exposed the approval and reviewer counts, not full individual finding texts. No claim of zero advisory findings is made. No correction or second review was required.

The auxiliary risk-assessment read was unavailable because it did not adopt the intended-untracked declaration. This was not treated as a passing assessment: native inspect explicitly bound all 17 new files and offered START, whose review independently derived high risk. One STATUS dispatch through codemode was rejected before native invocation because this facade requires direct calls; the actual direct bound STATUS offered the normal collect transition. No authority mutation, restart or manual verdict was used for that dispatch correction.

Before closure metadata edits, all 26 candidate paths were byte-identical to the approved tree, including the two deletions. Only this review and tasks.md receive post-review outcome/delivery metadata; the other 24 paths remain byte-identical. Approval is attributed to the frozen tree, not falsely to later bookkeeping.

## Delivery checkpoint — Prompt3

Native approval satisfies Prompt3's review condition. The fresh pre-commit PR check (job 13, exit 0) confirmed PR #1 OPEN, mergedAt=null, autoMergeRequest=null and remote head 9ffa2e1 on feat/voxel-pet-migration. Commit creation must stop if that check reports an already-merged PR. The remote head remains baseline 9ffa2e1 until a separately authorized push.

The authorized delivery is exactly one commit containing the 26 paths, with subject `fix(auth): remove hardcoded admin login and local super_admin fallback` and these three body lines:

```text
Authenticate admin logins through Nest without a credential pre-filter or local fallback.
Reject retired browser-local sessions when reading persisted state.
Keep the former public credentials out of src/.
```

No attribution trailers, push or merge. Update the open PR description with a paragraph explicitly labeling this commit as local-only/not pushed. This report is part of that commit; its actual Git identity and post-commit audit are recorded after creation in local ODD tracking and the PR description, rather than embedding a self-referential hash.

Risk: item 2 (authentication/session access), item 3 (shared session getter). Only the single Prompt3-authorized local commit; no push, merge or production operations.
