# Tasks: retire-glb-pet-model

Prompt 2 validates implementation; Prompt 4 validates review/Chromium, accepts the
four baseline SEO type errors and authorizes coverage completion plus one exact-message
commit. No push, publishing or deployment is authorized.

## Planning deliverable

- [x] P1. Read frontend conventions, existing OpenSpec records and current code evidence; inventory source/tests and the preserved proxy/backend boundary.
- [x] P2. Draft proposal, design, verifiable specs and implementation tasks.
- [x] P3. Structurally validate this change directory and confirm no runtime code or tests changed.
- [x] P4. Human validated the plan in Prompt 2 with the amendments below.

## Planning validation evidence

Read-only document verification passed: six nonempty files, four resolved relative
links, S1–S12 each defined once, and all proposed existing source/edit/test paths
confirmed. The proposed new viewer test does not exist yet, as expected.

Tracked and staged diffs were empty; Git status listed only this change directory's
six new Markdown documents. The explorer initialized an ignored `.codegraph/`
index; it is not a runtime source change or a deliverable.

The first structural-check script exited 1 because its parser mistook inline
`modelUrl` for a file path. The corrected check exited 0; this was a checker error,
not a document defect. No implementation tests, builds, production requests or
native review were run. This evidence describes the planning phase, before the Prompt 2 amendments.

## Approved amendments and scale decision

- [x] G1. Record supplied human evidence: `kind = ____`, `modelScale = ____`, date `____`; actual evidence was not supplied. This is not a gate and no production request was made by the agent.
- [x] G2. Keep `CAT_MODEL_SCALE = 0.78` unchanged because valid differing procedural evidence is absent; note missing evidence in review. Never use a GLB scale.
- [x] A1. Explicit decision: persist each slider locally as it moves, replacing confirmation-time saving; no effect on other users or the home.
- [x] A2. Use “current procedural cat” in this change's wording.

## Implementation: RED → GREEN

- [x] T1. **RED — S5–S11:** update admin/home tests and add `test/features/pet-home/cat-3d-viewer.test.tsx`; observe failures for procedural-only rendering, no model requests/UI, explicit home defaults despite stored tuning, local slider persistence/reset and truthful copy.
- [x] T2. **GREEN — S1–S4:** delete the eight source modules in design.md, remove only the bearer validator/comment from the retained auth helper, and remove the frontend `PET_MODEL_DIR` deploy row. Keep backend/catch-all/login and stored data untouched.
- [x] T3. **GREEN — S5–S8:** remove viewer GLB support and home metadata/events/global-scale flow, preserving explicit default design and current coat/needs/purr/camera/actions. Adjust the scale constant only if G1 permits it.
- [x] T4. **GREEN — S9–S11:** make Diseño 3D procedural/local-only, retain current four sliders and local reset, remove file/global controls and model requests, update explanatory copy and orphaned CSS.
- [x] T5. **S12:** delete the five obsolete-only test files in design.md, including bearer-only `test/lib/hardcoded-admin.test.ts`; keep the distinct auth/login tests. Delete any emptied test file.

## Proof and review

- [x] V1. Run the focused admin/home/viewer tests and retained helper/auth/navigation/layout regression tests; record exact commands/results.
- [x] V2. Review test assertions against S1–S12; persistence/reset must check both preview and remount, home isolation must use stored non-default values, and no-model-request assertions must observe actual calls.
- [x] V3. **Accepted in Prompt 4:** standalone TypeScript still fails with four proven baseline SEO-test errors; the human explicitly defers their repair. Other structural, suite/build and differential checks passed (see review.md). Check removed paths/imports/symbols, run TypeScript and frontend suite/build; verify diff leaves backend, catch-all and unrelated cat behavior intact. Compare shared unchanged login/actions against baseline.
- [x] V4. User-requested real Chromium rendering smoke completed through temporary npx Playwright 1.63.0: zero console/page errors, actual WebGL2 context and nonuniform pixels, screenshots saved, own server stopped. API state was a local fixture; no production requests. Slider persistence/reset and preserved actions remain covered by acceptance/independent tests, not claimed as a full browser E2E (see review.md).
- [x] V5. Independent verification for security/contract risks (items 2/3); RDD assessment and applicable native review under the user-owned switch/consent. Report missing or failed proof, never invent a verdict.
- [x] V6. Prompt 4 validates review/Chromium and explicitly authorizes the single commit described below. No push/deploy/backend retirement in this scope.

## Prompt 4 — coverage and delivery

- [x] C1. Record human acceptance of the four baseline SEO-test type errors in review.md; leave those test files untouched.
- [x] C2. Add scenario → test mapping for S1–S12 with exact file/name and honest baseline failure vs preservation status; identify human-only scale decisions as non-runtime checks.
- [x] C3. Commit-bound S6 network test checks all three model endpoints; S7 uses a keyed post-mount StorageEvent and verifies defaults after refresh. Baseline targeted run: 2 failed; candidate: 2 passed.
- [x] C4. Add repo structural/proxy coverage and unrelated-storage sentinel assertion. Baseline combined run: 9 failed/15 passed; proxy and scale preservation cases pass.
- [x] C5. Candidate focused/regression run: 37 passed. Final full suite: 119 passed/40 files. Standalone tsc still reports exactly the four accepted diagnostics; no production changes during this follow-up.

Authorized commit subject: `fix(pet-model): retire frontend GLB path and hardcoded bearer bypass`.
Body: remove global-model BFF routes and hardcoded bearer authorization; keep
Diseño 3D as a browser-local procedural preview. Use no coauthor/generated
trailers. Include source/tests, DEPLOY.md and this entire OpenSpec/evidence folder.
ODD continuity tracking stays local, outside the requested commit. No push.
