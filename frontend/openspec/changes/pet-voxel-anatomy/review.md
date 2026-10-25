# Review evidence: pet-voxel-anatomy

## Status — limitations accepted; native review approved

Prompt 3 explicitly accepts the missing browser orbit/care proof, authorizes fresh
native RDD for all 23 files, and authorizes **one commit only if RDD approves**.
Runtime implementation, CPU geometry proof, regression suite/build, and the three
requested real-browser screenshots are complete. The additional S9 orbit/care
probe failed before gestures; those two browser scenarios remain **unexecuted,
not approved**. T6 closes by explicit human disposition, not by a fabricated pass.
T7 native review is approved and its exact acknowledgement burned authority.
The final pre-commit suite passed:43files/164tests, exit0,19.82s. This report is
finalized immediately before the one authorized commit; its actual commit hash
is recorded in the local ODD log and delivery message, not self-referentially in
its own bytes. No probe repair/retry, push, deploy or production operation.

### Accepted browser limitation — Prompt 3

Human decision, verbatim:

> Acepto que la prueba de órbita y cuidado en el navegador quede **sin ejecutar**. Registralo en `review.md` como limitación aceptada, sin presentarlo como aprobado. Motivo:
> - la sonda falló antes de cualquier gesto, al observar la matriz de cámara de WebGL;
> - `Cat3DViewer` (órbita) y `PetHomeStage` (acciones) no cambiaron, según el diff de rutas protegidas;
> - sus tests pasan, y el toque real con su `POST` y el ronroneo pasaron en Chromium.
>
> No arregles la sonda en este cambio. Anotalo como seguimiento: corregir el observador de cámara de la prueba en navegador.

The timeout remains a failed probe, not an application-camera defect or approved
browser gesture proof. Correcting its camera observer is a separate follow-up.
The independent verifier also remains **unexecuted / not approved**, per the
human's reiterated decision; no incompatible verifier is launched.

Baseline: `20ce4c4bf157862d7b79b40108e3ba512ec07614`.
The six validated proposal/design/spec/task documents remain the requirements;
planning-only S10 restrictions are historical and Prompt 2 supplies implementation
authorization. The user's geometry script/Vaquita source was not supplied or run.

## Implementation and refinements

- All 33 stable IDs/material roles retained. Every base part is a box with three
  positive dimensions; no base scale/rotation. The approved seed table was used
  **without any numerical refinement**.
- `CatPart.parent` and the pure two-pass tree preserve model-world rest coordinates.
  Child offsets come from immutable base child minus base parent. Runtime local
  position adds only the child's own resolved-minus-base delta. Local rotation and
  scale are complete values, applied once through recursive meshes.
- The Model still resolves admin settings before needs. Only redundant chest
  slimming and inner-ear droop were removed. Root motion, palette, camera, viewer,
  OrbitControls, ContactShadows, scale, home, admin resolver/storage and interaction
  handlers were not redesigned.
- Synthetic eye-Y blink 0.1 and extra pitch tic +0.25 exist only in tests. Existing
  maximum ear droop is X +0.55 and mirrored Z ±0.1375; those formulas are unchanged.
- Admin `headHeight +0.25` / `bodyDepth 0.7` root-contact gaps remain explicitly
  excluded follow-ups. Controls/ranges/formulas were not restricted to conceal them.

## Meaningful RED before runtime changes

Commands below run from `frontend/` with `node_modules/.bin/vitest run`,
`--maxWorkers=2 --reporter=dot`:

| Input files / filter | Observed result |
| --- | --- |
| `test/features/pet-home/{cat-anatomy,need-visuals}.test.ts` and `test/features/pet-home/cat-3d-model.test.tsx` | Exit 1, **11 failed / 10 passed**, 21 tests, 1.14 s. Assertion failures covered boxes/proportions/pupils, child-owned need transforms and the actual Model's geometry, nesting, offsets, head translation and ear-size inheritance. |
| `test/features/pet-home/cat-anatomy.test.ts -t 'declares every required parent'` | Exit 1, **1 failed / 10 intentionally filtered**, 0.345 s; exact required parent map missing. |
| `test/features/pet-home/cat-part-tree.test.ts` before helper creation | Exit 1, **0 tests**, collection failure, 0.380 s. Reported separately: **not functional RED**. |

The initial frame assertion incorrectly treated old rounded-geometry arguments as
box dimensions. It was corrected before the final RED run to check only existing
boxes. No old non-box frame claim is made. In the final implementation every part
is a box, so the same predicate covers the complete table.

Actual Model tests SSR-render the real component; only `useFrame` is stubbed.
They reconstruct mesh matrices from real nested output. They do not replace the
Model with a mock. SSR filters only expected Three intrinsic casing/attribute
warnings; that filter is not browser-console evidence.

## GREEN, contacts and controls

### Focused implementation

- Four files (`cat-anatomy`, `need-visuals`, `cat-part-tree`, `cat-3d-model`):
  exit 0, **25 passed**, 1.60 s, after runtime implementation.
- Contact file alone: exit 0, **24 passed**, 1.25 s.
- Six geometry/Model/admin files: exit 0, **54 passed**, 2.78 s, before adding the
  final material-palette preservation control.
- Final focused plus retained controls: exit 0, **15 files / 90 passed**, 6.11 s.

Exact final focused command:

```sh
node_modules/.bin/vitest run \
  test/features/pet-home/cat-anatomy.test.ts \
  test/features/pet-home/need-visuals.test.ts \
  test/features/pet-home/cat-part-tree.test.ts \
  test/features/pet-home/cat-anatomy-contact.test.ts \
  test/features/pet-home/cat-3d-model.test.tsx \
  test/features/admin/cat-design-settings.test.ts \
  test/features/pet-home/pet-home.test.tsx \
  test/features/pet-home/cat-3d-viewer.test.tsx \
  test/features/pet-home/pet-interaction.test.ts \
  test/features/pet-home/pet-purr.test.ts \
  test/features/admin/admin-design-3d-page.test.tsx \
  test/features/auth/home-gate.test.tsx \
  test/lib/retired-pet-model-contracts.test.ts \
  test/lib/pet-model-proxy-retirement.test.ts \
  test/features/pet-home/pet-layout.test.ts \
  --maxWorkers=2 --reporter=dot
```

### Numerical contact proof

`cat-anatomy-contact.test.ts` uses the actual admin → needs pipeline and actual
pure tree/transform helper. The 24 cases are the Cartesian product of needs
100/0, earSize 1/0.6/1.6, eye-Y blink 1/0.1 and extra pitch tic 0/0.25. Both sides
are checked independently. Each case evaluates all 32 intended physical edges,
every transformed corner within x[-0.5,0.5], y[-0.32,1.25], z[-0.72,0.6], and
absence of child-owned chest/inner-ear cue transforms.

Convex box SAT uses transformed edge/face axes, not inflated world AABBs. The actual
ear **base quadrilateral** is transformed into head-local space and clipped
against the head's six planes. Numerical tolerance is 1e-6, not a visual gap
allowance. Parent links alone are not counted as contact. Root scale/yaw/bob are
excluded as specified. Synthetic blink/tic are not claimed as runtime animations.

### Suite, build, typecheck and structural controls

| Command / check | Result |
| --- | --- |
| `heavy -- node_modules/.bin/vitest run --maxWorkers=2 --reporter=dot` | Exit 0, **43 files / 164 tests**, 29.74 s (31 s wrapper). Only known admin navigation mock warning: `scroll=true` non-boolean attribute. No filtered tests. |
| `heavy -- npm run build` | Exit 0, **Next.js 16.2.0 production build**, 79 s wrapper; expected home/admin/API routes generated. |
| `node_modules/.bin/tsc --noEmit --incremental false` | Exit **2**, 6 s. Exactly the **four accepted baseline SEO diagnostics**, no additional diagnostics. Not a pass. |
| `git diff --check` and protected-path diff | Exit 0 before browser checks. Backend, admin runtime, viewer, home stage, pet layout/scale, session, package/lock and existing scale-retirement test unchanged. |
| Frontend lint | Not applicable: no frontend lint script; no invented lint pass or new dependency. |

Final pre-commit repeat of the full-suite command: exit0, **43files/164tests**,
19.82s (21s wrapper); only the same known `scroll=true` navigation-mock warning.
No runtime/test/evidence bytes changed after native approval. Byte/mode comparison
against the approved tree passed for all21non-report files; only this report and
`tasks.md` contain post-review closure metadata. The commit includes those final
reporting updates; they are not misrepresented as previously reviewed text.

Accepted TypeScript diagnostics: `robots.test.ts:12` TS2339 and TS7006;
`share-metadata.test.ts:18,22` TS2339. Those files were not edited.

### Differential preservation check

A clean baseline archive and candidate runtime replacement used the same linked
existing dependencies, unchanged HOME, direct runner binary and identical probes.
Both runs exited 0: **2 passed / 5 intentionally filtered**, 1.15 s / 0.992 s.
The actual Model's `preserves the existing per-role palette on each mesh` control
passed on both versions. No committed test reads Git history.

Public pure-function outputs were fully compared for need inputs 0,44,45,80,100:
cue formulas, descriptions, coat dirt, all other part-owned transforms, admin
resolver, model scale and input immutability matched. Below 45, only the three
requested child-owned outputs differed: chest scale and two inner-ear rotations.
At/above 45 even those outputs matched. Complete semantic comparison occurred
before compacting redundant raw captures into the exact fixture, preserved-output
hashes and actual before/after changes in
[differential-summary.json](evidence/differential-summary.json). Owned scratch was
removed with status-preserving cleanup. No unrelated behavior difference was found.

## Scenario → test classification, S1–S10

Paths are relative to `frontend/`. “RED” means an observed assertion-level failure
before runtime edits, not merely a test expected to fail. Preservation controls
must not be relabeled RED. Post-GREEN numerical proof is explicitly identified.

| Spec / scenario | Test or evidence | Classification / fails without the change? |
| --- | --- | --- |
| S1 — 33 boxes, positive dimensions, no base transforms | `cat-anatomy.test.ts`: `uses only three positive box dimensions and no base transforms`; real Model: `renders each base part once with box geometry` | **Observed functional RED → GREEN.** |
| S2 — exact IDs and roles | `cat-anatomy.test.ts`: `preserves the complete unique ID/material manifest`, existing part/role assertions | **Preservation**, not RED; independent literal 33-ID/role manifest. |
| S3 — sitting pose, body depth, thin pupils, mirrors/frame | `cat-anatomy.test.ts`: sitting-pose, voxel-body, thin-pupil, mirror and corner cases; contact matrix below | Body/pupil rules **observed RED → GREEN**. Existing pose/whiskers and mirrored invariants are preservation. Old frame RED-stage check covered only existing boxes; complete-box frame proof is final-state numerical evidence, not a claim about old non-boxes. |
| S4 — exact 21 parents and immutable base offsets | `cat-anatomy.test.ts`: `declares every required parent without inventing new roots`; real Model: `uses base-table child-minus-parent offsets rather than world positions`; helper acyclic/reconstruction/child-first/input-immutability cases | Parent map and real-render offsets **observed functional RED → GREEN**. Pure new helper tests are GREEN structural/mathematical proof; their pre-helper collection failure is **not RED**. |
| S5 — recursive rendering, complete local transform once | Real Model: `nests head children, eye pupils and inner ears inside their carriers`, `composes parent translation once instead of cancelling it in children`, `composes outer-ear scale once in the inner ear`; helper: nested translation/rotation/nonuniform scale/own-delta case | Real Model cases **observed functional RED → GREEN**. General synthetic matrix fixture added to the new helper is post-implementation mathematical proof, not an old-runtime baseline claim. |
| S6 — parent-owned needs, unchanged numeric cues | `need-visuals.test.ts`: `does not transform child %s independently` ×3; `preserves the existing worst-needs cue formulas and parent effects`; differential hashes/changes | Three ownership cases **observed functional RED → GREEN**. Threshold/parent numeric formulas and dirt are **preservation**, with baseline/candidate differential confirmation. |
| S7 — rest/worst needs, ear extremes, actual rotated base, positive blink/tic and frame | `cat-anatomy-contact.test.ts`: 24 named parameter cases / 32 edges / both ear base faces / all box corners; three real screenshots | **Post-GREEN numerical/visual regression proof**, not a functional baseline RED claim. No snapshots of the seed table substituted for contact. No user-supplied script was run. |
| S8 — admin schema/formulas/child ownership/home defaults | Original `cat-design-settings.test.ts` assertions retained; added `inherits headHeight and earSize=%s once without changing child-own values` ×3; existing admin page/home defaults tests; browser defaults screenshot | Existing tests/runtime-byte protection are **preservation**. New composed inheritance cases are post-GREEN proof. Home/admin wrapper tests mock Viewer and are **not geometry proof**. Excluded headHeight/bodyDepth extremes remain follow-ups. |
| S9 — palette, root/scale/viewer, home/actions/purr, GLB retirement | Real Model palette control passed baseline/candidate; existing viewer/home/interaction/purr/layout/retirement tests passed; protected runtime unchanged; Chromium real tap and running AudioContexts | **Preservation**, not RED. Viewer/home tests use their existing mocks. Actual GPU screenshots/tap are separate real-render proof. Additional browser orbit/care probe timed out **before gestures**; those two browser scenarios are **unexecuted/not approved**, despite passing unit controls. |
| S10 — authorization, evidence, fresh RDD/no delivery | Six historical planning documents; Prompt 2 log; this report; explicit current status | Historical planning structural check passed; implementation now authorized, commits not. **Fresh RDD approved and acknowledged**, with browser and independent-verifier omissions still explicitly unexecuted/not approved. One commit separately authorized by Prompt 3; no push or borrowed receipt. |

## Real Chromium / WebGL screenshots — passed

Same temporary npx Playwright method as frontend GLB retirement; no repo dependency
or browser installation. Existing Chromium cache, headless SwiftShader arguments
`--use-angle=swiftshader --enable-unsafe-swiftshader`. Real production Next/React/
Three and GPU context; no scene/renderer mock. Actual default-framebuffer pixels
observed after native draws, without changing `preserveDrawingBuffer=false`.

From repository root, the executed command shape was:

```sh
exclusive e2e-petsapp -- heavy -- env PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  SMOKE_SCRIPT="$PWD/.voxel-browser.FsSye1/smoke.cjs" \
  npx -y --package=playwright@1.63.0 -c \
  'NODE_PATH="$(dirname "$(dirname "$(command -v playwright)")")" node "$SMOKE_SCRIPT"'
```

Exit 0, 34 s. Own server: `127.0.0.1:45275`; Playwright 1.63.0 / Chromium
153.0.8010.12. Each fresh browser context used a synthetic local session and
intercepted pet-state fixture. Unexpected external/API traffic was blocked; none
occurred. No backend or production API was contacted.

| Scenario | Observed result / screenshot |
| --- | --- |
| Home normal (all needs 80) | HTTP 200, four low flags false; WebGL2 280×280, 23,116 differing/nonzero-alpha pixels, ≥312 colors. [Screenshot](evidence/home-normal-chromium.png). |
| Home all needs 0 | HTTP 200, four low flags true; thinner/dirty body, lower head and drooped ears visible; WebGL2 280×280, 20,361 differing/nonzero-alpha pixels, ≥260 colors. [Screenshot](evidence/home-needs-zero-chromium.png). |
| Diseño 3D defaults | HTTP 200, scale 0.78 / bodyDepth 1 / headHeight 0 / earSize 1, original ranges/steps, no stored design; WebGL2 492×150, 6,674 differing/nonzero-alpha pixels, ≥266 colors. [Screenshot](evidence/admin-defaults-chromium.png). |

Viewed all three screenshots: cat is complete in the existing frame; ears, face
layers, limbs and tail are attached, with no gross unrelated cross-throughs or
floating individual pieces apparent. Intended overlap/contact is not a defect;
this is not a claim of zero mesh intersections or a redesign of home ground
placement. No seed tuning was needed.

All contexts: SwiftShader, no context loss, GL error 0, console/page errors 0,
failed/external requests 0. Normal home received one actual tap: exactly one
mocked POST `/pet/actions/pet`; real AudioContexts included running instances.
This is not a claim of human-audited sound quality or one AudioContext per tap.
Browser closed, own server stopped, port closed; temporary screenshot script/log
removed. Next start emitted its known standalone-output warning while serving
successful responses; it is not a new Model error.

Raw report: [webgl-smoke.json](evidence/webgl-smoke.json).
SHA-256:

```text
414f13dd52229da6a6ccfe0c65d6be5f38922f585aa9b146ae0a018f52490f57  home-normal-chromium.png
04425114f0467cb3fbde19adffd61c3ef9083536ce1f20c935d4b23d2f4f0181  home-needs-zero-chromium.png
4287d0bcddafad3f2fc5e83256a3cd24782ee8d3e1d2e83f399044cae6d2449b  admin-defaults-chromium.png
```

### Additional browser orbit/care probe — failed, no retry

A distinct additional S9 scenario probe used the same npx/SwiftShader/own-port
method, not a rerun of the screenshot checks. Exit **1**, 33 s, own port 42977.
It attempted to observe native GPU `viewMatrix` uploads without modifying GL
behavior. `page.waitForFunction` timed out after **15,000 ms** at line 62 waiting
for a 16-float observation, **before pointer drag or care execution**.

Only mocked GET `/pet/state` occurred. No console/page/request failure or unexpected
traffic was reported. The observer's missing value is not proof of an application
camera defect; its cause is not established. Browser orbit/care results are
**unexecuted**, not passes. No automatic retry, observer fix or further verification
was attempted. Browser/server stopped and own port closed. Raw failure and stack:
[browser-gestures.json](evidence/browser-gestures.json). Failed probe source is
retained only in local ODD bookkeeping for diagnosis, outside product scope.

## Complete native-review scope — 23 files, 17 new

Prompt 3 requires declaring all 23 intended files from the first review scope
selection, including **all 17 new untracked product/spec/report/evidence/test
files**, not merely tracked source. Inventory was checked before native entry:

- Runtime (4): `src/features/pet-home/cat-anatomy.ts`, `cat-part-tree.ts`,
  `need-visuals.ts`, `components/Cat3DModel.tsx`.
- Tests (6): `test/features/pet-home/{cat-anatomy,need-visuals,cat-part-tree,cat-anatomy-contact}.test.ts`,
  `test/features/pet-home/cat-3d-model.test.tsx`,
  `test/features/admin/cat-design-settings.test.ts`.
- Change Markdown (7): `proposal.md`, `design.md`, `tasks.md`, `review.md`,
  `specs/{voxel-anatomy,part-hierarchy,contact-and-preservation}.md`.
- Evidence (6): the three PNGs above, `differential-summary.json`,
  `webgl-smoke.json`, `browser-gestures.json`.

Paths in the last two bullets are under `openspec/changes/pet-voxel-anatomy/`.
Local `odd/` tracking/diagnostic artifacts and generated `.next` are not product
files. Scratch copies/scripts were removed. The user-owned review switch reads
on (default); it was not changed. At report normalization, no new ASSESS/INSPECT/
START/consent/lineage/receipt had been created. Previous GLB/database/backend
receipts are burned and not reusable.

The incompatible independent verifier remains **unexecuted / not approved**, per
Prompt 2's explicit disposition. It was not relaunched or replaced. That accepted
profile limitation is separate from the browser-observer limitation, now also
accepted by Prompt 3. Native review must still obey fresh scope, user-owned
mode/provider-bound consent and any returned stop. The human requires stopping
and reporting if native review blocks; no bypass is authorized.

## Native RDD result — approved and acknowledged

The first native INSPECT selected all 17 new files and projected all 23 intended
paths. Human selected `granted` for the exact pending provider consent binding;
no mode change or inherited receipt supplied consent. Native risk was medium,
2,213 changed lines. The native group materialized and submitted both selected
lenses, readability and reliability; the last event approved without correction.
No incompatible independent verifier or browser probe was launched.

- Lineage: `review-16f1848f088fbfbb`.
- Reviewed tree: `2234d0f4c097c5e4c27b888d9fa60868792269e1`.
- Base tree: `efa3b1258d2717664ff5bae761fc1f9e0181738a`.
- Target: `sha256:cc1f243e985503c1cb542dacce46851a74d6dd4d5f46ecafa5e9265d876ed2f6`.
- Consumed revision: `sha256:b312703036f06e99fcd124d6942f5f1e99fdf8a1c8b1fb62303b3ba7ad1e1054`.
- Exact acknowledgement: `native-approved-acknowledgement-completed`,
  `authority: burned`, `gentle-ai.review-acknowledged/v1`.

Bound STATUS supplied the exact acknowledgement; its successful response is the
burn evidence. No post-burn STATUS, second lineage, correction or recovery ran.
The facade did not expose complete informational finding text; no claim of zero
informational findings is made. The native review does not convert accepted
unexecuted checks into approved checks, or replace functional verification.

After acknowledgement, only `review.md` and `tasks.md` receive closure-reporting
updates. Production, tests, other specs and evidence stay at their reviewed bytes;
this report does not claim its own post-review closure text was already reviewed.
The commit is separately authorized by Prompt 3, not by the native receipt.

## Differences from plan and open status

- No seed-value, palette, scale, admin-formula or runtime-scope deviations.
- Additional palette preservation control and differential evidence strengthen
  verification of the changed renderer/shared cue function.
- Browser orbit/care proof remains unexecuted due the observer timeout, explicitly
  accepted by the human in Prompt 3, not approved. Do not repair the probe here;
  correcting its browser camera observer is a separate follow-up.
- Independent verification remains unexecuted/not approved by explicit disposition.
- Four SEO type errors remain accepted; no frontend lint script exists.
- Native review is approved/acknowledged; final pre-commit suite and exact-scope
  check passed. Prompt3 authorizes exactly one23path commit including code/tests/
  all change documents/evidence. This report is its pre-commit checkpoint; actual
  identity is recorded in local ODD/delivery evidence. No push, deployment or
  production operations. All owned servers/browsers are stopped.

Risk: none — requested geometry/ownership changes are covered by assertions,
composed geometry tests and real GPU screenshots; shared cue/admin results were
compared across baseline/candidate. No unrequested contract, data, auth, concurrency
or delivery mutation. This risk classification does **not** approve missing proof.
