# Review: pet-voxel-idle-motion

Candidate baseline:6bde6001f94bb891c2156b0bae5574b3223c0901.
Prompt2 authorized implementation/verification without commits; Prompt3 validates
this review and authorizes exactly ONE commit with all26candidate paths, no push.
All26intended paths were declared in design§9 before runtime writes. Local odd/ and owned temporary
runner scripts are excluded. No production, HOME isolation or dependency changes.

## Summary

Pure seeded timing; lower-face hinges using complete scaled XYZ transforms;
a standalone frame function samples/composes/writes all six actual carrier
meshes and root from current bases. Model only connects current data/refs/time.
Live reduced motion keeps blink and intentional hop/squash/purr, disables tail/
tic/root yaw/bob. Old base helper API/table/need formulas/hierarchy remain intact.

Independent verifier: **UNEXECUTED / NOT APPROVED**, explicitly accepted by the
human for THIS candidate because its profile still isolates HOME contrary to VPS
rules. This is distinct from functional tests and native review lenses.

## TDD evidence and limitations

Before feature implementation, new APIs needed importable TDD seams: sampler
returned{}, preference hook returnedfalse, pose wrapper delegated unchanged old
base math; standalone frame initially copied old root-only math. These neutral
exports are disclosed scaffolding, NOT a missing-module collection failure and
NOT a claim that an absent API ran on untouched HEAD.

- First six-file RED: exit1,18assertion failures/29passes,47tests,3.40s.
  Twenty-four legacy contact cases, three old tree fixtures, root math control
  and missing-API/SSR fallback passed.
- Isolated reduced-root RED: exit1,1failed/5filtered,.580s; yaw was
  .3723319201180464 instead of static .2.
- Representative REDs: eyes retained[4,5,6] vs[1,.1,1]; no wired frame call;
  missing seeded blink/tic/tail output; ear hinge anchor error .06717251543912311;
  tail joint separation .023840319695407355; both ear base vertices had
  head-local Y .2542526999469784 > .250001. Neutral wrapper ignored idle delta
  in that initial geometric run; complete max-droop+tic assertions pass GREEN.
- Zero collection failures counted as functional RED.
- GREEN six files:48passed,3.98s,exit0.
- Focused new/modified plus preservation controls:17files108passed,9.84s,exit0.

Tests use real Three Group/Mesh/Vector3/world matrices for frame writes and
geometry, WITHOUT Canvas. Connection-only RTL test mounts the REAL Model with
DOM host refs and mocked frame function/useFrame; it proves wiring/current
payload/returned bounce/seed persistence/no frame-induced commits, not GPU math.
SSR controls remain structural. No optional mounted Canvas harness was required.

## Commands and observed results

Commands ran from repository root unless prefixed cd frontend.

| Command/check | Result |
| --- | --- |
| cd frontend && node_modules/.bin/vitest run test/features/pet-home/{cat-idle-motion.test.ts,cat-3d-model-frame.test.ts,use-reduced-motion.test.tsx,cat-3d-model-connection.test.tsx,cat-part-tree.test.ts,cat-anatomy-contact.test.ts} --maxWorkers=2 --reporter=dot | RED18failed29passed; after implementation GREEN48passed. Explicit file arguments used. |
| cd frontend && node_modules/.bin/vitest run test/features/pet-home/cat-3d-model-frame.test.ts -t 'suppresses root idle' --maxWorkers=2 --reporter=dot | RED1failed5filtered. |
| Same six paths plus cat-anatomy,need-visuals,cat-3d-model,cat-3d-viewer,pet-home,pet-interaction,pet-purr,pet-layout,admin/cat-design-settings,admin/admin-design-3d-page,lib/retired-pet-model-contracts tests |17files108passed/9.84s. |
| node odd/evidence/pet-voxel-idle-benchmark.mjs |0/.9s, actual sampler imported directly; raw evidence below. Node emitted MODULE_TYPELESS_PACKAGE_JSON warning; package not modified merely to suppress it. |
| cd frontend && node_modules/.bin/tsc --noEmit --incremental false |2/10.7s, exactly4accepted preexisting SEO errors, no new diagnostic. NOT a passing typecheck. |
| cd frontend && heavy -- node_modules/.bin/vitest run --maxWorkers=2 --reporter=dot |0,47files185passed,24.66s test duration/26s outer; job30. Prompt3 precommit run:0,47files185passed,18.04s test duration/19s outer; job33. |
| cd frontend && heavy -- npm run build |0/75s, Next production routes generated; job31. |
| bash odd/evidence/pet-voxel-idle-differential.sh |0/4s; baseline1pass1.14s,candidate1pass1.12s; private baseline archive/symlinked dependencies/direct runner, original HOME. |
| git diff --check |0 before final metadata closure. |
| Lint |No frontend lint script configured; not run/invented. |
| Real browser |job32 exit0/28s: pixel/render/console assertions PASS. Script sequence establishes a minimum1s between frames; maximum/exact separation is not established. Normal23,711changed pixels versus reduced0; accepted as sufficient by Prompt3. See below. |
| Independent verifier |UNEXECUTED / NOT APPROVED, candidate-specific human disposition. |
| Native RDD |26paths/22new frozen;4reviewers submitted; approved without correction; exact acknowledgement completed and authority burned. See native provenance below. |
| Git commit/push |Prompt3 authorizes exactly ONE commit of all26candidate files. No push authorized or run. |

Accepted TypeScript diagnostics:
- robots.test.ts:12 — TS2339 string|string[] .some, TS7006 path.
- share-metadata.test.ts:18,22 — TS2339 OpenGraph.type/Twitter.card.

Known full-suite stderr: navigation test's preexisting non-boolean scroll=true
warning from a Next Link DOM mock. This is not a browser console error.

## Scenario → test and RED versus preservation

| Spec | Test/scenario | Classification / observed result |
| --- | --- | --- |
| S1 | cat-idle-motion: seed-specific/order-independent/immutable/clock-random-free; connection: stable seed/current payload/new mount origin | New behavior RED at missing required eye output and absent frame connection. Pure immutability/no-clock properties and seed rerender assertions also checked GREEN; not separately claimed old-code failures. |
| S2 | cat-idle-motion: normal/tired first3exact blink windows and boundaries; frame writes/reset and unchanged pupil-own transform/inherited scale | Both timing cases RED; frame eyes RED. End/reset/pupil composition checked GREEN. |
| S3 | cat-idle-motion: absolute equations/phase/current cues/caps; actual frame reconstructed mid+tip orientation | RED missing tail output and actual absolute tip0 vs-.1835088038533865. Cap-stress assertions verified GREEN, not a separately observed original cap bug. |
| S4 | cat-idle-motion: normal/bored3onsets/sides/endpoints/raw-time duration; frame tic/reset | Both seeded cases RED, frame active ear0 vs.25 RED; end/reset and no simultaneous ear checked GREEN. |
| S5 | cat-part-tree identity+complete XYZ/nonuniform-scale hinge; frame dirty-pose overwrite/repeat/current base; connection no frame rerenders | Hinge/frame/current base/wiring RED. Original tree3fixtures and identity controls preserve existing contracts; repeat/no accumulation/new origin checked GREEN. |
| S6 | cat-anatomy-contact all4base vertices earL/earR max droop+tic/default size; existing24stress cases now through production composer | Stronger containment RED on BOTH sides; existing24cases are preservation (passed RED and GREEN), no assertion/tolerance removed. |
| S7 | cat-part-tree different absolute angles/joint; frame sampled healthy/tired tail centers plus shared point on both finite face polygons | Joint separation RED .023840319695407355. Actual sampled composed contact/orientations GREEN, not AABB-only/coplanarity claims. |
| S8 | hook initial/live changes/same-listener cleanup; isolated reduced-root frame; frame reduction/reset and preserved intentional bounce | Hook2cases and isolated root gating RED. Existing bounce/orbit math control passed before/after; toggle/reset/blink+bounce verified GREEN. |
| S9 | existing Model SSR33meshes/parents/materials, anatomy/needs/admin/home/viewer/actions/purr/layout/GLB controls; baseline differential | Preservation, not new-feature RED. Full185pass;330old-helper poses identical, only requested ear hinge SSR positions differ. No new human-audited audio claim. |
| S10 | doc/scope/task/command/measurement/browser/native provenance and no-delivery audit | Process evidence, no artificial functional RED. Fresh native approved/acknowledged; browser pixel/console proof observed, minimum1s established by script sequence, maximum unknown. Prompt3 authorizes one commit, no push. |

## Eight-hour sampler cost

[evidence/idle-sampler-8h.json](evidence/idle-sampler-8h.json)

Actual sampler on VPS, Node24.22.1, AMD EPYC9354P. Seed123, elapsed28800+n/60s,
four energyLow/funLow profiles with normal motion.100warmups then7batches of200
samples per profile; all raw batch means retained. Criterion: worst-profile
median batch mean per call; maximum batch also reported, no fastest-only selection.

- Worst median: **0.156965010ms/frame**.
- Maximum of ANY batch mean: **0.196781555ms/frame**.
- Both below~0.5ms. **No event memory/cache added**, exactly as requested.
- Conditional cache-equivalence test: not applicable because cache condition did
  not fire. No repeating timeline/truncation/global cursor added.

### Follow-up: low-end mobile devices

The eight-hour measurement used a server CPU, not a low-end phone. It is not a
mobile performance guarantee. If low-end phones show frame drops in long sessions,
consider deterministic per-mount event memory. No cache is added in this change.

## Differential preservation

[evidence/differential-summary.json](evidence/differential-summary.json)

Private copy of exact baseline, original symlinks/HOME, direct Vitest binary.
Ten fixtures: need0,44,45,80,100 × default/custom admin. All330old-helper poses,
cues/descriptions/modelScale, names/parents/geometry/materials/own rotation/scale
identical. Only8outer-ear local positions differ at needs0/44, default/custom:
the explicitly requested base-hinge application to existing need droop. Their
before/after values and full-raw-output hashes are retained in the summary.
No unrelated change found; owned temporary probe/baseline copy removed.

## Browser evidence

[Raw browser output](evidence/webgl-smoke.json). Job32 exit0/28s. Temporary
Playwright1.63.0/Chromium153.0.8010.12, actual SwiftShader WebGL2/Next production
scene; owned127.0.0.1:43639, synthetic session+GETstate fixtures only. No scene/GL
mock, no production/external request, no old camera observer or matrix probe.

| Scenario | Captures | Observed pixels/console |
| --- | --- | --- |
| Normal needs80 | [A](evidence/home-normal-a-chromium.png), [B](evidence/home-normal-b-chromium.png) |23,711changed pixels;22,623outside tight rendered-eye masks. Real visible cat motion, not merely blink. |
| All needs0 | [Image](evidence/home-needs-zero-chromium.png) |All low flags true, drooped dark ears. Image visually inspected: bases attached with no gross visible gap. Numerical all-four-vertex proof is separate. |
| Reduced media | [A](evidence/home-reduced-a-chromium.png), [B](evidence/home-reduced-b-chromium.png) |0different pixels in the ENTIRE image, not only outside eye masks. Root/tail/cat stationary in this pair. |

All five280×281PNG images were viewed; actualGLdrawingbuffer280×280.
All three cases HTTP200, nonblank many-color cat, GLerror0/no context loss;
consoleErrors/pageErrors/failedRequests/externalRequests all empty. Server emits
the preexisting standalone-next-start warning, not a browser console error.
Browser/context/owned server process group closed; temporary resources removed.

**Temporal bounds, clarified by Prompt3:** the script awaits completion of the
first `canvas.screenshot`, then awaits a1000ms timer, and only then requests the
second screenshot. This sequence establishes a **minimum of1s between frames**.
The **maximum separation remains unestablished**; do not describe the captures
as exactly1s apart or claim a bounded maximum.

Recorded pre-request timestamps differ by4.8495s(normal) and2.6752s(reduced).
They are request-start timestamps, not exact PNG acquisition timestamps. They do
not negate the lower bound supplied by the sequential screenshot/timer awaits.
The same procedure produced23,711changed pixels in normal mode and0in reduced
mode; Prompt3 explicitly accepts this as sufficient reduced-motion evidence.
The runner's pixel/console assertions passed; the minimum follows from inspection
of its sequence, not from an added timestamp assertion or a new browser run.

Earlier human disposition, verbatim: “Limitación para seguir con RDD”, allowed
review to proceed. Prompt3 now clarifies that the minimum1s is established while
the maximum is not. Existing five images/raw metrics remain unchanged. No browser
rerun or independent verifier launch.

## Changes from the initial plan

1. Human Prompt2 replaces the mandatory mounted host/ref adapter with standalone
   cat-idle-frame.ts and actual Three object tests; Model connection-only test.
2.8h benchmark is an explicit gate for event memory, measured below threshold;
   no cache and no unnecessary cache API/equivalence tests.
3. Model retains a mount-relative raw clock origin so remounts do not sample a
   previous Canvas lifetime. Existing root formulas remain unchanged.
4. Independent verifier explicitly unexecuted/not approved for THIS candidate,
   rather than inferring a prior candidate's exemption.
5. Prompt2 superseded planning-only S10 authorization. Prompt3 now authorizes
   one commit of the26candidate paths, with its exact subject and a three-line
   body; no push or additional implementation.

## Native RDD

Human accepted the unproven~1s temporal cadence limitation before freeze. All26
paths, including22new/untracked, were explicitly selected; odd/ excluded. Mode
remained on(decided by default). Native classified medium/1743authored changed
lines, correction budget200. Candidate-specific consent was explicitly granted
through binding `6301ec82-9522-4f10-80b8-ff639f5376a6`; answer-consent ran once.

- Lineage: `review-b87561272eac9020`.
- Target: `sha256:66cc7916eed9de048a07bca7e92334f1ef312c931a81324ce86d3e13cfc7000a`.
- Reviewed tree: `5bf4d59c0d78d5e25c9b282718e4e6814fb7e845`.
- Base tree: `0e2c2138729e34bee55a1c19f879ce79ff6fc7ef`.
- Paths digest: `sha256:76b4ad932741b58ce58e5e3f44adaaaf964df625cb5788a16cc707663a502f8f`.
- Four lenses, provider order: risk, resilience, readability, reliability.
- Transport: `pi_host_relay`; prepared4/submitted4. Group forecast disclosed four
  model runs; same exact current inner bindings acknowledged before execution.
- Closure: `native-last-event-closure`, state `approved`; no correction route.
- Bound STATUS offered the exact acknowledgement, executed once with outcome
  `native-approved-acknowledgement-completed`, authority `burned`, evidence
  `gentle-ai.review-acknowledged/v1`.
- Consumed revision:
  `sha256:dcf1cb39647a2aa3853870f5527c037081b10fad3bf1b4fdb4bd031c784a0712`.
- No post-burn STATUS or receipt reuse. The acknowledgement's native transaction
  outcome `committed` is NOT a Git commit or delivery authorization.

Invocation incident: the first group call used outer `collectBinding` wrappers
and returned `capture-group-rejected` before forecast/model runs, mutation none.
One bound STATUS confirmed unchanged slots; work stopped under Prompt2. Human
reply “Sip” explicitly authorized correcting only the invocation format and
continuing this same lineage/candidate. Fresh STATUS and exact inner values
resolved the rejection; no new START/reset/recover or candidate edits.

The native group response exposes approval and submission counts, not full
reviewer finding text. Do not infer zero informational/advisory findings.
Four review lenses do not execute or approve the separate independent verifier:
that verifier remains UNEXECUTED/NOT APPROVED. At native freeze the browser cadence
was recorded as unproven/accepted. Prompt3 later corrects that interpretation:
minimum1s is established by script sequence, maximum unknown. This clarification
and the mobile follow-up are post-review metadata, not a new browser run, native
review or timestamp assertion.

Before closure metadata edits, all26selected paths were byte-identical to the
reviewed tree. Only this review and tasks.md receive outcome/closure metadata
after the burn; remaining24paths must stay byte-identical. Those two final
metadata versions are not falsely claimed to be the exact reviewed bytes.
At the native-acknowledgement checkpoint, HEAD was
6bde6001f94bb891c2156b0bae5574b3223c0901, index empty, no commits/push. Prompt3
subsequently authorizes exactly one26-file commit, with no push. This review
records authorization and provenance; the resulting commit ID is recorded in
local ODD tracking after delivery rather than inventing a self-referential ID.

Risk: item3 (shared Model/pose composition serves home and admin preview;
preservation controls and330-pose differential passed; separate independent
verification remains explicitly unexecuted/not approved).
