# Design: retire the hardcoded admin session

Status: Prompt3 authorizes fresh native RDD and one conditional 26-file commit after approval, no push. Baseline: `9ffa2e1d58b5efe46e0f6346b59cb34d1086e617`.
All paths below are repository-relative. Old credential/token values are intentionally omitted.

## 1. Current flow and evidence

| Surface | Current behavior | Evidence |
|---|---|---|
| Public client dependency | LoginPage imports the matcher and local-session builder | frontend/src/app/login/LoginPage.tsx:1,8–11 |
| Pre-Nest filter | Rejects credentials not matching the legacy pair before making a request | LoginPage.tsx:39–43 |
| Real login | Calls Nest, checks user.role, saves token/user and navigates | LoginPage.tsx:44–60 |
| Failure fallback | Creates a local super_admin session on exceptions | LoginPage.tsx:61–64 |
| Existing-session redirect | Redirects a locally stored admin role | LoginPage.tsx:27–32 |
| Local constructor | Exports three credential/token constants and two helpers; distinctive user.id is `hardcoded-admin` | frontend/src/features/auth/hardcoded-admin.ts:4–33 |
| Persistence | Main key `petsapp_session_v1`, alternate key `petsapp_sesion_v1`; only token/email/role are checked | frontend/src/stores/auth-session.ts:26–27,56–71 |
| Admin gate | Effect reads local session; absent → /, member → /account, admin/super_admin → children | frontend/src/app/admin/AdminLayout.tsx:36–47,74–82 |
| Server wrapper | Wraps the client layout without server authentication | frontend/src/app/admin/layout.tsx:9–10 |

The parent spot-check confirmed the constructor marker and shared getter. Other locations are the bounded explorer's source map, not executed security proofs.

## 2. Preserve the real authentication boundary

Keep `frontend/src/features/auth/api/auth.service.ts` unchanged: POST /auth/login trims the email, passes the password unchanged, and returns Nest's response. Keep the catch-all proxy, Set-Cookie forwarding, axios policy, role types and backend unchanged.

Nest's login sets its cookie; rejecting a member in this admin-specific UI does not undo a cookie issued by Nest. Do not introduce client cookie writes or claim cookie behavior changed.

The current profile endpoint is /auth/profile, not /auth/me. fetchAuthProfile is not part of the current layout flow. Adding a profile request would introduce new loading, availability and expiry behavior, so it is not part of this proposal.

## 3. LoginPage changes

Remove the hardcoded imports, pre-request credential matcher and local fallback. Retain required-input handling, pending-state reset, real response handling and admin/super_admin role gate.

On a Nest rejection or transport error, expose the existing safe service error, with a generic fallback for a non-Error value; do not save any session or navigate. Do not include a password, token or raw response object in messages/logs. No new custom error wording is specified here.

Only a successful Nest result with an allowed role may create this page's stored session. A successful real login using the formerly public pair is not specially forbidden: real production password rotation belongs to a human.

## 4. Old stored sessions

In getPetsAppSession, reject the distinctive user.id `hardcoded-admin` before returning session data. This is an identifier tombstone, not one of the three forbidden credential/token literals.

Apply the rule through the current shared getter, so both storage keys, LoginPage's mount redirect, AdminLayout and getSessionToken see the same null result. Do not implement separate checks in each component.

Return null without deleting or rewriting stored data. This meets invalidation without broad logout or changing the current storage format. A later successful real save keeps its existing behavior of replacing the primary session and removing the alternate key.

Preserve valid real admin, super_admin and member sessions; malformed/absent data, unavailable storage and existing key precedence retain their current outcomes. The rule targets sessions produced by the retired constructor, not arbitrary attacker-modified copies. localStorage is still forgeable; the layout remains only a client UI gate.

## 5. Planned edit inventory

| Path | Planned action |
|---|---|
| frontend/src/features/auth/hardcoded-admin.ts | Delete |
| frontend/src/app/login/LoginPage.tsx | Remove filter/fallback; show errors |
| frontend/src/stores/auth-session.ts | Reject retired user ID through existing getter |
| frontend/README.md | Document real bootstrap and client/server boundaries |
| frontend/test/features/auth/login-page.test.tsx | Replace legacy expectations with Nest-only scenarios |
| frontend/test/features/auth/hardcoded-admin.test.ts | Delete obsolete helper-contract tests |
| frontend/test/features/auth/stores/auth-session.test.ts | Both-key invalidation and public-helper preservation |
| frontend/test/features/admin/admin-access.test.tsx | New actual-layout access/redirect tests |
| frontend/test/fixtures/legacy-admin-session.ts | New test-only old values and session fixture |
| frontend/test/lib/retired-hardcoded-admin-contracts.test.ts | New recursive src scan and deleted-module check |
| frontend/test/lib/pet-model-proxy-retirement.test.ts | Decouple deleted import; retain proxy/auth rejection assertions |
| frontend/test/lib/retired-pet-model-contracts.test.ts | Replace retired export expectation; retain GLB checks |

No production edit is planned for AdminLayout, the server wrapper, service, proxy, axios, types or backend. The six Markdown files in this change are the current planning deliverable. Future review.md and any browser evidence must be declared in the implementation candidate inventory, including untracked files; they do not exist yet.

## 6. Tests and meaningful RED

| Scenario | Planned proof | RED against current code? |
|---|---|---|
| Old credentials + Nest rejection | Error visible, request made, no save or admin navigation | Yes: current fallback grants session |
| Arbitrary real admin credentials | Exact request, returned session saved, /admin navigation | Yes: current pre-filter blocks request |
| Real super_admin | Same real-response path, no local constructor | Yes for non-legacy credentials |
| API rejection / network rejection | Error, pending reset, no session creation/navigation | Yes: current fallback |
| Old session in either key | Getter null, token null, no admin redirect/children; stored bytes unchanged | Yes: current getter accepts it |
| No session / member / real allowed session | Existing gate outcomes and successful save semantics | Preservation |
| All files below src | No full old email/password/token literal and no deleted-module imports | Yes: module currently contains them |
| Real auth service and retained GLB proxy contracts | Existing request/forwarding/rejection behavior unchanged | Preservation |

Component tests use the actual LoginPage/AdminLayout with mocked network/navigation, not mocked session decisions. Legacy storage tests use the real getter. Keep old values solely in test fixtures; scanner walks every regular file recursively, without limiting extensions.

Public store APIs affected by the shared getter include getSessionToken, getSession and updateUserInSession. Compare their existing real-session behavior against the baseline in owned isolated state; only the requested legacy rejection may differ.

## 7. Checks and gates for a later implementation

Observe assertion RED before source changes; missing imports after deletion are not meaningful RED. Then focused auth/store/admin/contracts tests, existing auth-service and GLB controls, full frontend suite, tsc and next build. The four previous SEO type errors are now fixed: they are not an accepted baseline for this change.

Use heavy for full suite/build/browser checks, at most two test workers, existing HOME/toolchain, and disposable browser storage/network fixtures. Browser acceptance: real Nest admin fixture enters; rejected login stays with an error; either persisted old-session key cannot expose admin content. Use an owned free-port server, no production and no credential disclosure. No real seed or password rotation is part of testing.

Risk item 2 requires independent verification. The known verifier profile currently conflicts with VPS HOME rules; this is a future proof gate, not permission to run that profile or inherit a prior waiver. A compliant profile or explicit human disposition for this candidate is needed before closing implementation.

RDD remains user-owned. Run applicable assessment/review on the complete normalized implementation candidate under the switch and repository policy; preserve exact native consent/stop handling. No native review or runtime checks ran in the planning step. Prompt2 now authorizes T1–T7, still without commits; later commits must be Conventional Commits without attribution trailers.

## 8. Prompt2 initial complete candidate inventory

Declared before test/source writes: exactly 26 paths, including all current untracked plan documents and future report/evidence. Deleted paths remain part of the candidate. Local odd/ task state, owned temporary runners and raw logs are excluded. No other edit surface is authorized.

- `frontend/src/features/auth/hardcoded-admin.ts`
- `frontend/src/app/login/LoginPage.tsx`
- `frontend/src/stores/auth-session.ts`
- `frontend/README.md`
- `frontend/test/features/auth/login-page.test.tsx`
- `frontend/test/features/auth/hardcoded-admin.test.ts`
- `frontend/test/features/auth/stores/auth-session.test.ts`
- `frontend/test/features/admin/admin-access.test.tsx`
- `frontend/test/fixtures/legacy-admin-session.ts`
- `frontend/test/lib/retired-hardcoded-admin-contracts.test.ts`
- `frontend/test/lib/pet-model-proxy-retirement.test.ts`
- `frontend/test/lib/retired-pet-model-contracts.test.ts`
- `frontend/openspec/changes/remove-hardcoded-admin-login/proposal.md`
- `frontend/openspec/changes/remove-hardcoded-admin-login/design.md`
- `frontend/openspec/changes/remove-hardcoded-admin-login/tasks.md`
- `frontend/openspec/changes/remove-hardcoded-admin-login/specs/login.md`
- `frontend/openspec/changes/remove-hardcoded-admin-login/specs/session-access.md`
- `frontend/openspec/changes/remove-hardcoded-admin-login/specs/source-and-scope.md`
- `frontend/openspec/changes/remove-hardcoded-admin-login/review.md`
- `frontend/openspec/changes/remove-hardcoded-admin-login/evidence/auth-browser.json`
- `frontend/openspec/changes/remove-hardcoded-admin-login/evidence/real-admin-chromium.png`
- `frontend/openspec/changes/remove-hardcoded-admin-login/evidence/rejected-login-chromium.png`
- `frontend/openspec/changes/remove-hardcoded-admin-login/evidence/legacy-primary-chromium.png`
- `frontend/openspec/changes/remove-hardcoded-admin-login/evidence/legacy-alternate-chromium.png`
- `frontend/openspec/changes/remove-hardcoded-admin-login/evidence/store-differential.json`
- `frontend/openspec/changes/remove-hardcoded-admin-login/evidence/tdd-results.json`

Prompt2 explicitly accepts independent verification UNEXECUTED/NOT APPROVED for this candidate because of the HOME-isolating profile. No verifier launch is authorized or required under that disposition. Preserve native RDD consent and stop on any RDD block. The /auth/profile layout validation is follow-up only. Prompt3 corrects the browser criterion to 0 page errors in all four cases and only the expected rejected-login HTTP 401 in console, rather than claiming literal zero-console compliance. It authorizes exactly one commit after native approval, with no push; stop before commit if the existing PR has merged.
