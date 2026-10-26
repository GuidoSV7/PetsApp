# Tasks: remove-hardcoded-admin-login

Status: implementation authorized by Prompt2; Prompt3 corrects the browser criterion and authorizes native RDD plus one conditional commit, no push.
Baseline: `9ffa2e1d58b5efe46e0f6346b59cb34d1086e617`. No commits in this step.
Read [proposal](proposal.md), [design](design.md), [login](specs/login.md), [sessions](specs/session-access.md), [scope](specs/source-and-scope.md).

## Implementation authorized by Prompt2

- [x] T1 — S1–S7: create test-only legacy fixtures; replace the obsolete hardcoded-helper tests and decouple the two GLB tests. Observe assertion RED against current production code for the pre-Nest filter, fallback, both stored-key cases and recursive source scan. Keep collection/import failures separate. Route: one bounded auth behavior, not separate writers for tests/docs.
- [x] T2 — S1–S3: delete the module; remove LoginPage's credential pre-filter and fallback. Keep real Nest success/role/cookie behavior; show safe errors, no save/navigation on rejection, and pending reset. Focused GREEN for old-pair rejection, arbitrary real admin, real super_admin, member preservation and API/network failures.
- [x] T3 — S4–S6: reject the retired user ID in the existing getter without source credential literals or storage mutation. Prove both keys through the real getter and actual LoginPage/AdminLayout. Preserve valid sessions, precedence and public helper semantics; no layout redesign/profile request.
- [x] T4 — S7–S9: finish all-src scan/deleted imports and retained GLB/proxy controls. Update frontend README with the existing real seed procedure, required environment names, client-only gate/data-guard boundary and human-only rotation. No backend, seed or production operations.
- [x] T5 — S1–S9: focused tests and existing auth-service/store/admin/proxy controls; full frontend suite, tsc and next build. Use heavy/max two workers; no HOME isolation. Differential-check existing shared store APIs against the baseline in owned isolated state, preserving symlinks and using direct binaries, not package managers.
- [x] T6 — S1–S6: real browser on an owned server/free port with disposable storage and mocked Nest responses: real admin enters, rejected login shows an error/no session, each old stored-session key cannot expose admin children. Record console errors and outcomes; stop all owned resources. No production or real credentials.
- [x] T7 — S10: complete candidate inventory including all new docs/tests/evidence; review.md scenario-to-test table, exact commands/results and deviations. Prompt2 explicitly accepts independent verification UNEXECUTED/NOT APPROVED for this candidate because its profile isolates HOME. Do not launch it or present the omission as approval. Then applicable user-owned native RDD/consent/stop handling. Do not claim approval from missing proof. Commit only under later authorization, with no attribution trailers.

## Current implementation evidence

T1–T5 complete: assertion RED before source edits; focused 47 passed; tsc clean; full suite 48 files / 212 passed; build exit 0; store comparison 30 cases, 25 identical / 5 requested legacy deltas / 0 unexpected. Protected paths unchanged.

T6 closed by Prompt3's explicit human correction, not literal compliance: 0 page errors in all four cases; console contains only the expected 401 in rejected-login. Original browser exit codes/report pass=false remain historical. One alert-selector harness correction re-ran only rejected-login; no errors were suppressed. T7 native RDD approved without correction: review-a4c94afd94f3e983, four reviewers prepared/submitted; exact acknowledgement completed and authority burned. Reviewed tree dd6c435b0b1f5a63950bf6ff553131e2e872320d; consumed revision sha256:d1671643cb44ee6468dbdd6ba33e1c8a1644ea993c92077eefc211354c0a1c34. Independent verifier UNEXECUTED / NOT APPROVED per Prompt2/Prompt3. No commit yet; no push or production operations. See [review](review.md).

Delivery authorization — Prompt3: RDD approval is now complete. Create one commit with all 26 paths and the exact requested subject/three body lines; no push. Confirm PR is not already merged before commit and update its description only while open, explicitly marking the commit as local-only. The actual commit identity and delivery completion are recorded after creation in local ODD tracking/PR description, not self-referenced in this file. Only review.md/tasks.md receive post-review closure metadata; the other 24 paths remain byte-identical to the approved tree.

## Acceptance gates and explicit non-goals

- Risk: item 2 (authentication/session access), item 3 (shared getter).
- The client layout stays client-only. Generic localStorage forgery, server-side gating and new session-expiry behavior are not added.
- The formerly public pair is not blacklisted if Nest genuinely accepts it; production rotation is human-only.
- Do not reinstate the four SEO type-error waiver: that separate fix is already in the baseline.
- GitHub Actions was removed by a separate change; no green CI claim or workflow restoration is part of this plan.
- A requested browser/independent/native proof that is unavailable is a concrete unresolved gate, not a pass or an automatic retry.

## Historical planning evidence — Prompt1 checkpoint

Parent structural readback exited 0: exactly six requested Markdown files, 11 resolving local links, S1–S10 defined exactly once, T1–T7 unchecked, current edit/control paths present and proposed new test paths absent. HEAD remains the baseline; tracked files and index are unchanged. Only these six new planning documents exist outside pre-existing local odd/. git diff --check exited 0. This paragraph records the observed check; no implementation checkbox was changed.

No runtime tests, browser checks, builds, implementation, commits, push or review authority operations have run for this planning step. Structural checks do not establish runtime correctness or authentication security.
