# Review evidence: retire-glb-pet-model

## Implementation status

Frontend retirement implemented. Prompt 4 validates implementation/review/Chromium
and authorizes exactly one commit after coverage checks, with no push. Eight obsolete
source files and five obsolete-only test files removed. Hardcoded login/session remains;
only its bearer validator and misleading token comment were removed.

Scale evidence was not supplied: `kind = ____`, `modelScale = ____`, date
`____`. Per amended S8 this is nonblocking; `CAT_MODEL_SCALE = 0.78` is unchanged.
No production request or stored-data cleanup was performed.

## TDD evidence

Worker observed an empty production diff before RED. From `frontend/`:

```sh
node_modules/.bin/vitest run test/features/admin/admin-design-3d-page.test.tsx test/features/pet-home/pet-home.test.tsx test/features/pet-home/cat-3d-viewer.test.tsx --maxWorkers=2 --reporter=dot
```

- RED: exit 1; 5 failed, 14 passed, all three acceptance files failed.
- Failures: file input remained; slider change did not persist (0.78 instead of
  0.95); reset made three model calls; viewer chose the legacy GLB branch; home
  adopted metadata scale 2.1 rather than default 0.78.
- GREEN: same command exit 0, 19 passed. Final worker rerun after test cleanup:
  exit 0, 19 passed.

## Regression and final checks

From `frontend/`:

```sh
node_modules/.bin/vitest run test/features/admin/cat-design-settings.test.ts test/features/auth/hardcoded-admin.test.ts test/features/auth/login-page.test.tsx test/features/admin/admin-nav-sections.test.tsx test/features/pet-home/pet-layout.test.ts --maxWorkers=2 --reporter=dot
```

Exit 0: 5 files, 11 tests passed. Existing navigation mock emits the React
`scroll=true` non-boolean DOM attribute warning.

Parent reran all eight acceptance/regression files together after deletions:
exit 0, 30 tests passed. `git diff --check` and protected-path diff checks pass.
No source references to retired modules, `modelUrl`, `useGLTF`,
`isHardcodedAdminBearer` or `PET_MODEL_DIR` remain. Home/admin contain no model
endpoint/event references.

```sh
heavy -- node_modules/.bin/vitest run --maxWorkers=2 --reporter=dot
```

Exit 0: 38 files, 112 tests passed. Same navigation mock warning.

```sh
PETSAPP_API_INTERNAL_URL=http://127.0.0.1:9 NEXT_PUBLIC_PETSAPP_API_URL=http://127.0.0.1:3109/petsapp-api NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3109 heavy -- node_modules/.bin/next build
```

Exit 0: production build passed with controlled local API origins. Route output
contains only `/petsapp-api/[...path]`, not the three deleted static handlers.
Next reports its edge-runtime/static-generation notice.

```sh
node_modules/.bin/tsc --noEmit --incremental false
```

Exit 2: four errors in untouched tests: `robots.test.ts:12` (TS2339, TS7006),
`share-metadata.test.ts:18,22` (TS2339). Isolated baseline typecheck also exited 2
with those same four diagnostics plus a fifth pre-existing TS2345 in the now-deleted
`test/lib/global-pet-model-store.test.ts:17` (`ProcessEnv` missing `NODE_ENV`).
The current four errors are proven pre-existing; do not report the standalone
typecheck as passed. Baseline retained regressions passed 11/11; candidate combined
acceptance/regression passed 30/30, with the same navigation mock warning.

## Independent verification

Final verdict: no change-caused blocker. Candidate acceptance/regressions: 30/30;
baseline retained regressions: 11/11. Independent candidate edge/proxy probes:
2/2; same proxy probe on baseline: 1/1. Every command exited 0 except the documented
baseline/candidate standalone typechecks.

Edge probes exercised each of the four slider minima/maxima, immediate stored JSON
and remount after each edit, malformed-setting recovery, reset/remount and an
unrelated localStorage sentinel preserved byte-for-byte. The mocked public
catch-all exports preserved GET/POST/PUT/DELETE, bearer/payload/query forwarding
and upstream 403/body on both baseline and candidate.

Byte comparisons confirm protected backend, catch-all, helpers, cat anatomy and
scale, session and retained auth behavior are unchanged. Only the approved bearer
function/comment was removed from the login helper. No empty TS/TSX test files
remain; existing `.gitkeep` placeholders are not emptied test modules. A structural
scanner initially failed decoding a binary file; corrected byte scanning passed.

Probe commands in isolated scratch copies:

```sh
node_modules/.bin/vitest run test/retirement-boundaries.test.tsx test/retirement-proxy.test.ts --maxWorkers=2 --reporter=dot --bail=1
# Baseline, proxy only:
node_modules/.bin/vitest run test/retirement-proxy.test.ts --maxWorkers=2 --reporter=dot --bail=1
```

These were scratch verification probes, not extra repository test files. Baseline
was archived from `47e08e413c926a178067d400876b806fd1678cb6`. The verifier reported
isolating HOME contrary to the instructed environment policy; no package manager,
network or dependency installation ran. Deterministic binary checks completed;
this process deviation is recorded, not hidden or treated as an application defect.

## Native RDD

Human granted candidate-specific consent. Lineage `review-6f82a8e18444d02e` reviewed
22 source/test/deploy paths and 1664 changed lines with risk, readability and
reliability lenses. Only the new viewer test was selected from untracked files;
OpenSpec/ODD tracking artifacts are outside that native source candidate.

All three reviewer outputs were admitted and the native result was approved.
Exact acknowledgement returned `native-approved-acknowledgement-completed`,
`authority: burned`, target
`sha256:e31b24539a5b9001b00f251cfb21b63ad9fc08aee83f1d7653c732db819f7eed`, consumed
revision `sha256:f64cea719c8fbb0ce13ad7b4c1582584244b14dc29fe93d33fb2a9c841a4581c`.
No post-burn STATUS or delivery command was run. This approval is not a commit.

Native ASSESS could not classify undeclared untracked scope, so security item 2
explicitly required the independent verifier. INSPECT's exact scope selection
permitted START. One grouped capture rejected outer wrapper objects without any
mutation; the current exact serialized bindings then forecast and ran correctly.

## Real Chromium / WebGL smoke — passed

The earlier unavailable-browser conclusion was too broad: lack of a repo runner
or PATH CLI did not rule out the VPS browser cache. The user supplied the npx
method; the requested real-rendering smoke has now passed.

A temporary script outside the repository started the existing production frontend
on free port 3002, injected a synthetic local session and fulfilled `/pet/state`
with an isolated fixture. No backend or production API was contacted. Real Next,
React, Three and WebGL rendered normally; no scene or renderer was mocked.

```sh
exclusive e2e-petsapp -- heavy -- env PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 SMOKE_SCRIPT=/tmp/petsapp-webgl-smoke.CDagwc/smoke.cjs npx -y --package=playwright@1.63.0 -c 'NODE_PATH="$(dirname "$(dirname "$(command -v playwright)")")" node "$SMOKE_SCRIPT"'
```

Exit 0, approximately 24 seconds. No repo dependencies were added and no browsers
were installed. Chromium launched headless with exactly these extra arguments:

```json
["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
```

| Check | Observed result |
| --- | --- |
| Playwright / Chromium | 1.63.0 / 153.0.8010.12 |
| Page | `http://127.0.0.1:3002/`, HTTP 200 |
| Console errors / uncaught page errors | 0 / 0 |
| Failed / external requests | 0 / 0 |
| API traffic | One mocked GET `/petsapp-api/pet/state`; no model requests |
| Canvas | One connected canvas, 280 × 280 (78,400 pixels) |
| Actual graphics context | WebGL2, not lost |
| Pixels different from the first RGBA pixel | 12,242 |
| Nonzero-alpha pixels | 12,242 |
| Distinct RGBA colors | At least 256 |
| `readPixels` errors | None |
| Renderer | ANGLE / Vulkan / SwiftShader |
| Cleanup | Browser closed; own frontend stopped with SIGTERM; port 3002 closed |

The script observed the application's real `getContext` and read pixels
synchronously after a real default-framebuffer draw, before presentation could
clear the buffer. Context options were not changed: `preserveDrawingBuffer` stayed
false. The screenshot visibly shows the procedural cat.

Durable evidence:

- [Full home screenshot](evidence/home-chromium.png)
- [Canvas screenshot](evidence/cat-canvas-chromium.png)
- [Raw smoke report](evidence/webgl-smoke.json)

Screenshot SHA-256: `31f511671c78301d72759f684b58d9aa886ccb1690bec6e87942e8335c255d91`.
The Next server log warned about using `next start` with standalone output; the
server nevertheless became ready, served HTTP 200 and passed all browser checks.
This is a rendering smoke, not a backend integration or full camera/action E2E.
Production source/dependencies were not changed after native review. Prompt 4
adds test/documentation coverage only; that follow-up is described below.

## Accepted standalone TypeScript limitation

**Accepted by the human in Prompt 4**, verbatim:

> **Decisión humana:** acepto los 4 errores de `tsc --noEmit` en `robots.test.ts` y `share-metadata.test.ts`. Ya existían antes de este cambio y se arreglan en un cambio aparte; no los toques acá. Anotalo en `review.md` como aceptado.

The standalone command remains exit 2, not a pass. The same four diagnostics were
confirmed again after the coverage-only additions, with no errors in the added
tests. Both SEO test files remain untouched. Their repair is a separate change.
No pending human decision remains for this known baseline limitation.


## Scenario-to-test coverage (Prompt 4)

Paths in this table are relative to `frontend/`. “Fails without change” refers to
the pre-retirement implementation at baseline
`47e08e413c926a178067d400876b806fd1678cb6`, with the candidate tests copied into
an isolated archive. Committed tests never read Git history or a fixed commit.
Preservation tests must pass on both versions; they are not falsely labeled RED.
S8's production-evidence selection is a human procedure, not a runtime branch.

| Spec / scenario | Test file | Exact test name / check | Fails without change? |
| --- | --- | --- | --- |
| S1 — remove eight modules and server bearer export | `test/lib/retired-pet-model-contracts.test.ts` | `removes all eight frontend model modules and the local bearer validator export` | Yes; baseline still has the admin static route and other modules. |
| S1 — no retired imports/symbols or URL contract in source | `test/lib/retired-pet-model-contracts.test.ts` | `leaves no retired module references or modelUrl contract in production source` | Yes; baseline admin imports the retired service/helper. TypeScript's four accepted unrelated errors remain separately reported. |
| S2 — legacy model URLs use unchanged proxy behavior | `test/lib/pet-model-proxy-retirement.test.ts` | `forwards legacy model requests and preserves upstream rejection without bootstrap authorization` | No; preservation. Both versions forward GET/POST/PUT/DELETE, authorization, body/query and preserve upstream 403/body/content type. S1 separately pins removal of the shadowing routes. |
| S2 — do not erase unrelated stored browser data | `test/features/admin/admin-design-3d-page.test.tsx` | `resets preview, sliders and local saved values without publishing or deleting a model` | The full test fails on baseline model calls; the unrelated-storage sentinel assertion is a preservation check. No disk/volume cleanup operation was performed; protected backend/catch-all diffs are empty. |
| S3 — retire only frontend model-directory configuration | `test/lib/retired-pet-model-contracts.test.ts` | `removes the frontend model directory setting from deployment documentation` | Yes; baseline frontend environment table contains `PET_MODEL_DIR`. Remaining deployment rows checked by diff. |
| S4 — preserve login matcher and local session | `test/features/auth/hardcoded-admin.test.ts` | `accepts the bootstrap credentials (case-insensitive email)`; `builds a super_admin session for the panel gate` | No; preservation, observed on baseline and candidate. S1 pins removal of the bearer export. |
| S4 — preserve rejected login / Nest success / local fallback | `test/features/auth/login-page.test.tsx` | `rejects bad credentials`; `prefers Nest JWT session when login succeeds`; `falls back to local admin session when Nest login fails` | No; preservation, observed on baseline and candidate. |
| S5 — procedural-only viewer, including adversarial legacy URL | `test/features/pet-home/cat-3d-viewer.test.tsx` | `always selects procedural rendering even with an adversarial legacy asset input` | Yes; original pre-implementation RED selected the legacy renderer. Its temporary legacy-renderer mock was removed for the final candidate. |
| S5 — retain inputs, interaction, orbit and camera | `test/features/pet-home/cat-3d-viewer.test.tsx` | `preserves procedural inputs, interaction, orbit controls and camera` | No; preservation. Real rendering is additionally proved by the Chromium evidence above. |
| S6 — observe no request to any global model endpoint | `test/features/pet-home/pet-home.test.tsx` | `never requests global model metadata, files or admin mutations` | Yes; baseline network spy records `/pet/model`. The test checks all three forbidden paths: `/pet/model`, `/pet/model/file`, `/admin/pet-model`, covers Axios GET/POST/PUT/DELETE and fetch, and exercises mount plus feeding. |
| S6 — retain pet hydrate/care/coat/rename/purr | `test/features/pet-home/pet-home.test.tsx` | `hydrates chrome from the pet API before enabling care`; `spends coins and raises hunger when feeding via API`; `blocks feeding when broke and keeps balance`; `clears the broke speech after a few seconds`; `raises fun without minting coins when playing`; `raises energy when sleeping`; `raises hygiene when bathing`; `flags low needs on the stage for cat visuals`; `purrs and raises fun when the cat is tapped`; `opens camera from Personalizar, applies coat via API`; `applies a coat preset via API`; `keeps personalize presets collapsed under the top toggle`; `renames for free once, then charges five coins` | No; all 13 are preservation cases and pass against the baseline. |
| S7 — defaults before and after stored settings change post-mount | `test/features/pet-home/pet-home.test.tsx` | `keeps explicit defaults despite local tuning and differing global metadata without model requests` | Yes. Prompt 4 fixture matches defaults on initial mount; baseline now fails at the assertion **after** saving new tunables, dispatching a keyed `StorageEvent` with old/new values, and the legacy model-change event. Baseline adopts refreshed scale 2.1; candidate stays at defaults and subscribes to no legacy model event. |
| S8 — no valid production evidence: preserve canonical scale | `test/lib/retired-pet-model-contracts.test.ts` | `keeps the canonical procedural scale when no valid production override is supplied` | No; preservation. Asserts exact constant 0.78 and `defaultCatDesign().modelScale === CAT_MODEL_SCALE`. |
| S8 — differing valid procedural evidence; matching procedural evidence; GLB evidence | `openspec/changes/retire-glb-pet-model/tasks.md` G1/G2, this review's scale decision, plus the canonical-scale test above | Human-only pre-implementation decision: adjust only for valid differing procedural evidence, otherwise keep constant; never use GLB scale | Not applicable as a runtime RED: no such evidence was supplied and there is no runtime evidence-selection branch to execute. No production observation or conditional constant edit is invented. |
| S9 — local preview, four controls, no upload/global confirm/API | `test/features/admin/admin-design-3d-page.test.tsx` | `shows a browser-only procedural preview without global controls or requests`; `persists each slider immediately, updates preview and retains values across remount`; `resets preview, sliders and local saved values without publishing or deleting a model` | Yes; baseline renders the file input, defers persistence and performs model calls. |
| S10 — immediate save on each slider edit and remount | `test/features/admin/admin-design-3d-page.test.tsx` | `persists each slider immediately, updates preview and retains values across remount` | Yes; baseline stores 0.78 instead of changed 0.95. Tests every slider, existing ranges/step, preview, stored helper result and remount after each edit. |
| S10 — reset local sliders/preview/storage and remount | `test/features/admin/admin-design-3d-page.test.tsx` | `resets preview, sliders and local saved values without publishing or deleting a model` | Yes; baseline reset makes model API calls. Candidate asserts stored defaults/remount, no request/event, and unrelated data unchanged. |
| S11 — truthful browser-only/no-home-publication wording | `test/features/admin/admin-design-3d-page.test.tsx` | `shows a browser-only procedural preview without global controls or requests` | Yes; baseline exposes obsolete global UI/copy. Exact local-only sentence is asserted in candidate; the baseline test stops first at the file-input assertion. |
| S12 — delete obsolete tests, leave no empty test modules | `test/lib/retired-pet-model-contracts.test.ts` | `deletes obsolete-only tests without leaving empty test modules` | Yes; baseline retains obsolete store/bearer/model tests. Full Vitest discovery additionally proves retained files contain runnable tests; `passWithNoTests:false` is unchanged. |

### Additional baseline RED and candidate GREEN

Four updated/new test files were copied into a clean baseline archive with linked
existing dependencies, preserving HOME and without invoking a package manager.
The command below exited **1: 9 failed, 15 passed** on baseline; the proxy
preservation and exact-scale cases passed, as expected.

```sh
node_modules/.bin/vitest run test/features/pet-home/pet-home.test.tsx test/features/admin/admin-design-3d-page.test.tsx test/lib/retired-pet-model-contracts.test.ts test/lib/pet-model-proxy-retirement.test.ts --maxWorkers=2 --reporter=dot
```

After tightening S7 to reach the post-mount assertion before failing, these two
targeted home cases were run against baseline and candidate:

```sh
node_modules/.bin/vitest run test/features/pet-home/pet-home.test.tsx -t 'never requests global model|keeps explicit defaults' --maxWorkers=2 --reporter=dot
```

- Baseline: exit **1**, **2 failed**, 13 intentionally filtered out. S6 fails on
  the observed forbidden request. S7's initial default assertion passes, then
  the post-storage/update assertion fails (2.1 rather than 0.78).
- Candidate: exit **0**, **2 passed**, same 13 filtered out.
- Candidate combined acceptance, structural/proxy and retained auth/navigation/
  layout/helper checks: exit **0**, **10 files / 37 tests passed** before the
  final fixture-only S7 refinement.
- Final pre-commit full suite: `heavy -- node_modules/.bin/vitest run --maxWorkers=2 --reporter=dot`, exit **0**, **40 files / 119 tests passed**. This run includes the final post-mount S7 fixture. The only stderr notice is the known React navigation mock `scroll=true` warning.
- Standalone typecheck recheck: exit **2**, exactly the same four accepted SEO
  diagnostics and no additional diagnostics in new tests.
- No production code was touched during this coverage follow-up; no new bug was
  demonstrated. The unrelated SEO tests are unchanged.

## Differences from the plan

- Internal ownership only: worker tools disallow file deletion, so the parent
  performed the approved 13 deletions and final bearer cleanup after observing
  worker RED evidence. No source-scope expansion.
- Standalone typecheck retains the baseline errors recorded above. The initially
  deferred browser smoke was completed through the user-authorized npx method.
- Independent verifier isolated HOME against instruction, without package-manager
  use; recorded as a process deviation. No change in product scope.

Risk: item 2 (security bearer bypass retirement); item 3 (viewer and static-route
resolution contracts). Backend, catch-all, anatomy/needs/coat/camera/actions,
design storage helpers and scale constant are unchanged.
