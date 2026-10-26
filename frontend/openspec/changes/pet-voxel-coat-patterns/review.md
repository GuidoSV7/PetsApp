# Voxel coat patterns — approved candidate and closure review

Prompt7 supersedes the original single-commit delivery: reconstruct exactly two local commits over `13253e9`, rerun the full suite at the final HEAD, and run fresh-consent native RDD on commit1 only. Prompt5's visual approval remains valid. Geometry, colors and all182 sealed source/test files remain byte-identical to `cc9b2b2`. No push, merge or production operations.

## Human decision (verbatim)

> Apruebo el atigrado revisado (M, bandas de cara y patas, tinta al 50 %) y el calicó
> de tres manchas grandes, en estado normal y sucio. Esmoquin y siamés siguen aprobados.

The visual stop is satisfied independently of quantitative floors. The [design](design.md) and all three [specifications](specs/pattern-geometry.md) describe the implemented table: solid0/tabby12/tuxedo8/calico4/pointed12, hard ceiling12. Calico's four boxes form three larger asymmetric logical spots; no thin tabby/calico body bars or vertical face-side bar remain. S6 now requires `round(channel * 0.50)` after existing dirt exactly once, not the initial0.65. Clean/dirty Atigrado stripes are#363940/#292727. Accent and existing dirt formulas are unchanged.

## Final approved images and pixel measurements

These are the original, unretouched Prompt4 images, not regenerated for closure. Each pattern is compared with its own same-palette solid reference. Normal means all needs100; dirty/worst means all four needs0.

| Pattern | Normal original | Changed cat pixels | All-zero original | Changed cat pixels |
|---|---|---:|---|---:|
| Tabby | [Normal](evidence/prompt4-final50/tabby-normal.png) | 1299/18866 = **6.89%** | [Zero](evidence/prompt4-final50/tabby-zero.png) | 1074/17266 = **6.22%** |
| Calico | [Normal](evidence/prompt4-final50/calico-normal.png) | 2258/18866 = **11.97%** | [Zero](evidence/prompt4-final50/calico-zero.png) | 2248/17266 = **13.02%** |

Historical approved [tuxedo normal](evidence/tuxedo-normal.png)/[zero](evidence/tuxedo-zero.png) and [pointed normal](evidence/pointed-normal.png)/[zero](evidence/pointed-zero.png) remain unchanged. Their historical normal/zero measurements are12.6842/10.9869% and16.5059/17.8675%; they were not rerun as part of Prompt4/5.

Protocol: fixed clock0/yaw0, actual camera/default scale, viewport390×844, DPR1, shadow256, identical palette/needs/light within each pair. Changed means max8-bit RGB delta≥8 within the union of cat-only masks, excluding background/floor/contact shadow. Exact280×280 main-frame buffers and masks are aligned1:1; visible CSS captures can be280×281. No resize/shift/retouch. The3% floor is not human approval. All32 final tabby/calico patch/pose S3b observations are81/81, required≥41/81; all72 observations across patterns pass. Whole-face S3 is checked separately against all33 parts, including isolated-zero and actual idle extrema.

## Retained and archived capture provenance

The evidence-only second commit retains all seven JSON files, 48 current PNGs and the existing visual-decision note. Current PNGs are root tuxedo/pointed and `prompt4-final50/` tabby/calico, each with normal/zero pattern captures, same-palette solid references, main-frame buffers and masks. Those inputs remain reproducible without resizing or replacing images.

The24 PNGs in `prompt4-geometry35/` and24 root tabby/calico PNGs are superseded and absent from the rebuilt repository. Their originals remain in the unpublished local backup branch `backup/pet-voxel-coat-patterns-cc9b2b2`, pointing to `cc9b2b28e405e0f514342a8a290d0251026ac6eb`. Historical JSON files intentionally retain their original capture paths, hashes, values and statuses; some named images therefore refer to this local archive, NOT files present in a fresh clone. No historical measurement is rewritten as a fresh result.

Commit1 intentionally contains no `evidence/` files: the following evidence-only commit supplies the live image/JSON links in this document. Native review is scoped to commit1's immutable source/tests/docs tree, not the later evidence commit or the archived original candidate. Operational `odd/` scripts/tasks remain local and untracked, as in preceding features.

## Measured render cost

Calls/triangles across six real passes; separate matte instrumentation excluded. Both needs poses agree.

| Pattern | Extra boxes | Contact depth | Four blur passes | Main | Total calls/triangles | Provenance |
|---|---:|---:|---:|---:|---:|---|
| Solid | 0 | 33/396 | 4/8 | 34/398 | **71/802** | Final paired reference |
| Tabby | 12 | 45/540 | 4/8 | 46/542 | **95/1090** | Prompt4-final50 |
| Calico | 4 | 37/444 | 4/8 | 38/446 | **79/898** | Prompt4-final50 |
| Tuxedo | 8 | 41/492 | 4/8 | 42/494 | **87/994** | Historical approved run |
| Pointed | 12 | 45/540 | 4/8 | 46/542 | **95/1090** | Historical approved run |

## Scenario → repository test and evidence

Paths below are under `frontend/test/features/pet-home/`. NEW RED means observed assertion failure in a loadable scaffold or the previous recipe, not an import/type/config failure. Preservation means an already-green control, not invented RED. Mixed rows distinguish both. Prompt6 audited the saved reports: initial S2/S3/S3b failures were mostly nonempty-descriptor guards, not observed footprint/burial/visibility defects; initial model failures likewise showed missing patches. Known-pattern forwarding and camera omission were already green. Those REDs establish absent functionality, not an independent failing example for every later assertion.

| Spec | Scenario / test | RED or preservation evidence |
|---|---|---|
| S1 | `coat-patterns.test.ts`: ordered backend parity, known/unknown reads, exact counts/IDs/immutable anatomy | NEW RED for registry/known nonsolid/table; solid and missing/null/unknown fallback controls already green |
| S2 | `coat-pattern-geometry.test.ts`: embeds every box, strict rotated footprints, exact bib edges/classified contacts | NEW assertion RED; exactly two internal opposing bib contacts, no new exception |
| S3 | Same file: whole outward polygons against all33 volumes in normal/isolated-zero/all-zero/idle fixtures | NEW RED for actual recipe; between-samples oracle counterexample was an already-green control |
| S3b | Same file, `S3b actual home-camera visibility`: every essential patch and independent marking groups at yaw0 | NEW RED; actual source camera/root/default scale, ≥41/81 separately per pose |
| S4 | `coat-patterns.test.ts`: exact expanded design table, thick M/face/foreleg bands, four chunky calico boxes | NEW RED; Prompt4 specifically7 failed assertions before revised recipes |
| S5 | `cat-3d-model-coat-patterns.test.tsx`: direct parent/local geometry/composed matrices, live pattern-switch reconciliation | NEW RED for patches; existing `cat-3d-model.test.tsx` hierarchy and anchor/idle continuity controls preserved |
| S6 | Pure stripe tests plus actual-model material tests, clean/dirty, unchanged accent/nose, dirt once | NEW RED; conditional0.65→0.50 had4 separate assertion failures before change; nonstripe colors preserved |
| S7 | Existing tree/needs/idle/quality/admin tests, `cat-3d-viewer.test.tsx`, actual-model reconciliation | Preservation controls; no new RED claimed for unchanged formulas/layout/camera/shadow |
| S8 | Real-browser harness `odd/evidence/pet-voxel-coat-browser.cjs`, JSON/masks/images/per-pass counters | Functional WebGL measurement and explicit human approval, not a fabricated unit-test RED; floors alone insufficient |
| S9 | `pet-customize.test.ts`: seven presets/exact colors/patterns | NEW RED for pattern/new presets; five original IDs/colors retained |
| S10 | `personalize-strip.test.tsx`: primary AND normalized pattern, explicit preset payload | NEW RED; case-insensitive primary and secondary/accent-ignore controls preserved |
| S11 | `pet.service.test.ts`, `pet-home.test.tsx`, viewer tests: complete normalized state for GET/save/care/rename | NEW RED for pattern read/prop flow; endpoints, headers, other fields and invalid-write behavior preserved |
| S12 | `camera-coat-capture.test.tsx`, service/home tests: exactly3 color keys, omission preserves calico through save/reload | Camera omission was already-green4/4; new stub/state persistence failures observed separately, not claimed as camera RED |
| S13 | Backend-first production deployment prerequisite | **NOT VERIFIED**; source merge/frontend fallback/local stubs are not deployment evidence; no production requests |

## Commands and observed results

Earlier implementation evidence is retained, not relabeled as a fresh run:

- T1 assertion RED30/6→GREEN36; T2 clean RED21/14→GREEN35; T3 assertion RED20/35 plus Home1/47→GREEN113. Preliminary fixture issues are separate from clean RED.
- Prompt4 geometry RED7/34; first candidate75/1 exposed a real forbidden cream side contact, fixed with0.003 tangent separation without weakening S2; GREEN76. Geometry-only dirty image inspected before the authorized contrast refinement. Contrast RED4/47→GREEN76.
- `heavy -- node .git/agent-evidence/coat-prompt4-checks.cjs`: focused189, preservation65, full408/52files/0skips; `tsc --noEmit` and `next build` exit0.
- `node .git/agent-evidence/coat-prompt4-observations.cjs`: exit0;72 visibility checks, new32 all81/81; previous-candidate public frontend service/actual-model SSR differential28 observations:24 unchanged/4 requested/0 unexpected. Not real backend HTTP proof.
- `PET_COAT_PATTERNS=tabby,calico PET_COAT_EVIDENCE_LABEL=prompt4-final50 NODE_PATH=/home/agent/.npm/_npx/6bcb61ec6d5aea22/node_modules heavy -- node odd/evidence/pet-voxel-coat-browser.cjs`: exit0, four pairs, preserved33 instances/matrices, orbit/raycast tap/camera omission/calico reload, zero page/console/request errors. Owned resources cleaned.

Historical Prompt5 closure command:

```bash
heavy -- node .git/agent-evidence/coat-prompt5-suite.cjs
```

It wraps `frontend/node_modules/.bin/vitest run --maxWorkers=2 --minWorkers=1 --reporter=dot --reporter=json --outputFile.json=../.git/agent-evidence/coat-prompt5-full.vitest.json` from `frontend/`, with unchanged HOME and local-only API guards. Raw stdout/stderr/exit-code remain under `.git/agent-evidence/coat-prompt5-full.*`; the portable result is `evidence/closure-checks.json`.

**Historical Prompt5 closure full suite: PASS —408/408 tests,52 files,0 failures,0 skips; exit0.** Background job52 completed. This is not a fresh execution on the rebuilt Prompt7 HEAD. The before/after SHA seal confirmed all182 approved frontend source/test files byte-identical. Existing React scroll-mock warning is non-failing.

No new behavior RED is appropriate for this documentation-only closure. SHA-256 sealing protects all182 approved frontend source/test files from accidental edits.

## Delivery history and two-commit native boundary

Prompt5 approved the visuals above and originally requested one local commit. That original candidate `cc9b2b2` contained133 files/6805 authored diff lines. Its consented native START stopped in preflight with `lens_context_budget_exceeded`, mutation `not_started`: no authority, findings, verdict or acknowledgement was created. START's medium candidate risk was not a finding severity. The local receipt `.git/agent-evidence/coat-prompt5-rdd-closure.json` records a blocked attempt, not approval.

Prompt7 explicitly authorizes replacing that unpublished delivery with exactly two commits on `13253e9312237966ef35e9d74a585586da745f59`:

1. `feat(pet-home): draw tabby, tuxedo, calico and pointed coat patterns as voxel boxes` — source, tests, proposal/design/specs/tasks/review and functional README; no evidence or root ODD paths.
2. `docs(openspec): add coat pattern visual evidence` — only retained files under `evidence/`; no source/test changes.

README process metadata belongs here: human approval is separate from the pixel floor; browser counts do not prove phone/GPU performance; production backend support must be verified before a future merge. No prohibited attribution, publishing or production work is authorized.

At this document's commit freeze, the Prompt7 final-HEAD suite and new native verdict are **pending**, not claimed as passed. The full suite runs once on the final two-commit HEAD with unchanged HOME and at most two workers. Its unmodified runner/result/streams are saved under `.git/agent-evidence/coat-prompt7-full.*`; source seals and both manifests are recorded outside the committed tree.

Repository policy requires **commit first, then immutable committed-only review from the main checkout**. After the final-HEAD suite, temporarily detach that checkout at commit1, inspect authority and follow the offered native route with explicit base13253e9 and fresh consent. Commit2 is NOT part of that review. Restore the final branch afterward. If context still exceeds the budget, stop and report added/deleted lines per file; do not split again, truncate evidence, retry the identical candidate or disable RDD.

Actual hashes, final-HEAD suite status, full native findings/closure or blocker go into `.git/agent-evidence/coat-prompt7-delivery.json`, Engram and the final response. No third commit or amendment is authorized merely to insert post-freeze results. Deferred AST/eye-bound/precision work is listed in [tasks](tasks.md), not implemented here.

## Limitations and deviations

- **Independent verifier NOT EXECUTED**: explicit HOME-isolation exception, not approval. Native review does not replace it.
- **Production backend `coat.pattern` NOT VERIFIED**: hard prerequisite before future merge. No push, merge or production access is authorized now.
- Chromium/SwiftShader is not phone, real-GPU timing or production-readiness proof; admin inheritance does not promise exposure under every independent tuning/view angle.
- Historical planning had8 tabby/5 calico boxes and35% darkening. Prompt4/5 intentionally supersede those with12/4 and50%; historical receipts retain their original capture-time values/status.
- Preliminary failures remain recorded: CSS screenshot/buffer mismatch, corrected with exact buffer/mask alignment; fixture issues; advisory cross-run CSS hash assumption (five calico CSS pixels at delta≤1, identical actual GPU buffers); audit typo `view.yaw` corrected to actual `view.rootYaw`. No image retouching or fake assertion RED.
- Existing non-failing warnings: React scroll mock, Next Edge static-generation limitation, THREE.Clock deprecation.

Evidence: [final browser](evidence/prompt4-final50/browser.json), [checks](evidence/prompt4-final50/checks.json), [visibility/differential](evidence/prompt4-final50/visibility-and-differential.json), [visual decision](evidence/visual-decision.md), [tasks](tasks.md).
