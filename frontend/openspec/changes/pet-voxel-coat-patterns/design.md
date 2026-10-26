# Design: home-visible anchor-local face boxes

Status: final geometry/colors/tests approved by Prompt5. Tabby12, calico4 (three logical spots), tuxedo8 and pointed12; hard ceiling12. S6 is `round(channel * 0.50)` after existing dirt once. Final images and metrics are approved; see [review](review.md). This closure changes documentation only and authorizes one local commit plus native review, no push/merge/production. Independent verifier remains NOT EXECUTED; backend production support remains UNVERIFIED. Coordinates are model units.

## Pure descriptors and attachment

`coat-patterns.ts` exports the ordered identifiers, derived pattern type, `normalizeCoatPattern(unknown)`, pure `getCoatPatternBoxes(pattern)` and derived stripe-color helper. Descriptors carry `id`, `anchorId`, face, tangent center/size, in-plane rotation and ink (`stripe`, `secondary`, `accent`). This ink vocabulary does not extend `CAT_MATERIAL_ROLES`.

Use immutable anchor dimensions for local positions. Each box is a direct child of its actual anchor mesh, outside the base-part table and idle registry. Preserve root bob/yaw/bounce, pivots and animation ownership. Ordered expansion assigns zero-based per-anchor IDs `<pattern>-<anchor>-<n>`.

## Face geometry and exact bib join

Facing is +Z. Tangents `(u,v)` are `(Z,Y)` on ±X, `(X,Z)` on ±Y and `(X,Y)` on ±Z. Width/height are tangent dimensions. Rotate around the patch center, not the anchor origin: tangent point = center + rotation × local offset. Only the M has nonzero rotation.

For anchor half-extent `h`, center is `h + 0.001` along the outward normal, thickness `0.004`, inner face `h - 0.001`, outer face `h + 0.003`. Keep the whole rotated footprint strictly inside the anchor face. No gap, outward-face coplanarity, same-facing coplanar overlap or patch/patch coplanar overlap is permitted.

Tuxedo panels use centers x=±0.245 and width 0.09: their inner edges are exactly x=±0.20, the chest edges. They touch without entering the chest interior or leaving primary-colored strips. Their body-local front plane is z=0.393 (model-rest z=0.373), versus model-rest chest front z=0.41; the visible planes are not coplanar.

**Explicit clarification to the previous blanket coplanarity wording:** exact contact necessarily shares two *internal, opposing-normal* side-face regions with the chest. These specific joins are permitted, not mislabeled as zero coplanarity of every face. Per panel, shared area is 0.001005 body-local units²; world area is 0.000611442 at normal needs and 0.00047692476 at all zero. Same-facing/exposed overlaps remain forbidden. Repository tests classify and assert these exact contacts, never silently skip coplanarity checks. No geometry offset/thickness or base part changes are proposed.

## Revised frontal table

Every row expands into separate boxes; all faces are +Z. All boxes in this revision are essential home markings, not orbit-only decorations. Remove the old body-top/side marks, tail rings/tip, ear backs and hind socks rather than charging invisible boxes to the budget. Later refinements must update this table, counts and both numeric/visual evidence.

| Pattern | Anchor / face | Tangent center (u,v) | Width × height | Rotation / ink | Boxes |
|---|---|---|---|---|---:|
| solid | none | — | — | — | 0 |
| tabby | head / +Z, outer M strokes | (-0.1365,0.195), (0.1365,0.195) | 0.036 × 0.10 | 0 / stripe | 2 |
| tabby | head / +Z, inner M strokes | (-0.06,0.195), (0.06,0.195) | 0.032 × 0.12 | +0.96 / -0.96 rad; stripe | 2 |
| tabby | head / +Z, upper lateral bands | (-0.235,0.115), (0.235,0.115) | 0.07 × 0.04 | stripe | 2 |
| tabby | head / +Z, lower lateral bands | (-0.235,0.035), (0.235,0.035) | 0.07 × 0.04 | stripe | 2 |
| tabby | legFL,legFR / +Z, horizontal bands | (0,0.005), (0,-0.07) | 0.10 × 0.04 | stripe | 4 |
| tuxedo | body / +Z, bib panels | (-0.245,-0.015), (0.245,-0.015) | 0.09 × 0.34 | secondary | 2 |
| tuxedo | legFL,legFR / +Z | (0,-0.04) | 0.10 × 0.12 | secondary | 2 |
| tuxedo | pawFL / +Z, beside pad | (-0.055,0), (0.055,0) | 0.022 × 0.06 | secondary | 2 |
| tuxedo | pawFR / +Z, beside pad | (-0.055,0), (0.055,0) | 0.022 × 0.06 | secondary | 2 |
| calico | head / +Z, brown left forehead up to ear base | (-0.175,0.195) | 0.19 × 0.10 | accent | 1 |
| calico | head / +Z, cream central blaze | (0.004,0.13) | 0.128 × 0.23 | secondary | 1 |
| calico | head / +Z, cream right forehead grouped with blaze | (0.17,0.195) | 0.198 × 0.10 | secondary | 1 |
| calico | legFR / +Z, asymmetric brown patch | (0,-0.035) | 0.10 × 0.14 | accent | 1 |
| pointed | head / +Z, mask sides | (-0.205,-0.075), (0.205,-0.075) | 0.12 × 0.17 | accent | 2 |
| pointed | head / +Z, below muzzle | (0,-0.21) | 0.52 × 0.07 | accent | 1 |
| pointed | head / +Z, above muzzle | (0,-0.005) | 0.14 × 0.03 | accent | 1 |
| pointed | earL,earR / +Z, above inner ears | (0,0.078) | 0.14 × 0.018 | accent | 2 |
| pointed | legFL,legFR / +Z | (0,-0.04) | 0.10 × 0.12 | accent | 2 |
| pointed | pawFL / +Z, beside pad | (-0.055,0), (0.055,0) | 0.022 × 0.06 | accent | 2 |
| pointed | pawFR / +Z, beside pad | (-0.055,0), (0.055,0) | 0.022 × 0.06 | accent | 2 |

Totals: **solid0, tabby12, tuxedo8, calico4, pointed12**; maximum and hard ceiling12. Prompt4 replaces tabby's thin body bars with thicker M/face/foreleg bands; calico's five bars become four chunky asymmetric boxes/three logical spots. Tuxedo and pointed descriptors are byte-for-byte unchanged.

Forehead marks sit above eyes; side stripes sit outside them. No tabby/calico body bars remain. The two cream boxes are separated tangentially by0.003 to avoid forbidden opposing patch-side contact; all four calico boxes have minimum tangent dimension≥0.10 and aspect ratio≤2. Paw side bands span x=±[0.044,0.066], outside pad x=±0.04. Ear caps span local y=[0.069,0.087], above inner-ear maximum y=0.06. No eyes, inner ears, pads or muzzle are covered or changed.

## S3: whole-face burial remains independent

Reuse `buildCatPartTree` and `resolveCatPartPose`; compose parent × local Matrix4 as existing tests do. Transform the entire outward rectangle into every base box's local coordinates with its inverse composed matrix, then clip against all six planes. Reject positive-area interior intersection or outward coplanarity against **all 33**, including the anchor. Corners/center alone or world AABBs cannot establish this property. Preserve the counterexample with a small blocker between samples.

The repository S3 domain is default design, all needs 100, each isolated zero need, all zero, and deterministic ear-tic/tail-sway extrema. Use contract tolerance 1e-6. Admin inheritance is tested separately; no universal exposure under independently moved/scaled sliders or all orbit angles is promised. No runtime clipping system or exported matrix helper is needed.

The planning calculation checked the two requested rest fixtures only: 0 buried outward faces in 66 patch/state combinations, all 33 anchor footprints strictly inside their faces, and 0 same-facing or exposed coplanar pairs. It used inward margin 1e-7, arithmetic epsilon 1e-8 and positive-area threshold 1e-10 local units². The remaining S3 fixtures and actual-model regression tests are now covered by the repository tests; integrated focused/full checks passed. Browser evidence and human readability remain separate.

## S3b: actual home camera and sampled line of sight

Read inputs from source, do not maintain an independent copied camera:

- Extract current `Canvas.camera` and `OrbitControls.target` from `Cat3DViewer.tsx`, and root group position from `Cat3DModel.tsx` (the planning calculator uses the TypeScript AST).
- Evaluate existing `resolveModelScale(defaultCatDesign())`, as used by the home `catDesign` state and model, plus existing admin/needs/tree/pose helpers in memory. Do not change or copy their formulas.
- Current extracted values: camera **[0,0.42,3.05], fov 28°**, target **[0,0.18,0.05]**, root **[0,-0.22,0]**, uniform scale **0.78**. Default design is modelScale 0.78/bodyDepth 1/headHeight 0/earSize 1. Normal needs are the existing preview values, all 100; worst fixture sets all four to zero.
- Rest pose, yaw **0**, no bob/tic/sway/reaction displacement, open eyes. Use the square home-frame aspect 1 for this calculation; it is not a measurement of every responsive viewport. No idle yaw may reveal essential marks, including reduced-motion mode.

For each outward face, sample the centers of a fixed **9×9** grid: tangent offset `((i+0.5)/9-0.5)*width`, likewise height, with i,j=0…8. Rotate about its center and apply its actual composed anchor matrix. A sample passes only if its outward normal faces the camera (positive dot product), it projects inside the perspective frustum, and the finite sample-to-camera segment enters none of the 33 composed base boxes. Use inverse-box slab intersection; touching a boundary is not an interior hit. Report blockers separately from back-facing/frustum failures.

Require **at least 41/81 samples (≥50%) for each essential box in each fixture**, not a pooled average. This is a sampled visibility fraction, not proof that the entire surface/pixels are visible. Additionally require all four M strokes and at least three extra tabby stripes (eight supplied), both bib panels and both front socks, at least three distinct calico spots (three logical spots supplied with four boxes), and pointed mask plus both ears and both front paws. All current boxes are essential; future optional orbit-only boxes still cost budget and cannot satisfy these groups. S3b complements, never replaces, S3.

### Reproduced original-table failure

The original 42 boxes had no outward burial in either rest fixture, but **32 had 0/81 visible samples**. Only M, bib and mask passed. This reproduces the reported failure rather than assuming burial equals visibility.

| Original IDs | Normal /81 | All zero /81 |
|---|---:|---:|
| tabby-head-0…3, each | 81 | 81 |
| tabby-body-0…5, each | 0 | 0 |
| tabby-tailMid-0…7, each | 0 | 0 |
| tuxedo-body-0…1, each | 81 | 81 |
| tuxedo-pawFL-0, pawFR-0, pawBL-0, pawBR-0, each | 0 | 0 |
| calico-body-0…5 and calico-head-0, each | 0 | 0 |
| pointed-head-0…1, each | 63 | 63 |
| pointed-head-2 | 81 | 81 |
| pointed-head-3 | 76 | 76 |
| pointed-earL-0, earR-0, pawFL-0, pawFR-0, pawBL-0, pawBR-0, tailTip-0, each | 0 | 0 |

Top-body marks are occluded by the head; outer sides/socks and rear ears face away; head-top faces above the camera; forward tail faces are occluded. Idle/orbit is not a remedy for a required yaw-0 view.

### Current Prompt4 per-patch result — actual repository helper, not browser proof

Each row passed both the ≥41/81 visibility threshold and whole-outward-face burial check against all 33. No sample is back-facing/out of frustum in this table. 81/81=100%, 72/81=88.89%, 63/81=77.78%, 76/81=93.83%; these are sample ratios, not screenshot measurements.

| Patch ID | Normal /81 | All zero /81 | Burial |
|---|---:|---:|---|
| tabby-head-0 | 81 | 81 | none |
| tabby-head-1 | 81 | 81 | none |
| tabby-head-2 | 81 | 81 | none |
| tabby-head-3 | 81 | 81 | none |
| tabby-head-4 | 81 | 81 | none |
| tabby-head-5 | 81 | 81 | none |
| tabby-head-6 | 81 | 81 | none |
| tabby-head-7 | 81 | 81 | none |
| tabby-legFL-0 | 81 | 81 | none |
| tabby-legFL-1 | 81 | 81 | none |
| tabby-legFR-0 | 81 | 81 | none |
| tabby-legFR-1 | 81 | 81 | none |
| tuxedo-body-0 | 81 | 81 | none |
| tuxedo-body-1 | 81 | 81 | none |
| tuxedo-legFL-0 | 81 | 81 | none |
| tuxedo-pawFL-0 | 81 | 81 | none |
| tuxedo-pawFL-1 | 81 | 81 | none |
| tuxedo-legFR-0 | 81 | 81 | none |
| tuxedo-pawFR-0 | 81 | 81 | none |
| tuxedo-pawFR-1 | 81 | 81 | none |
| calico-head-0 | 81 | 81 | none |
| calico-head-1 | 81 | 81 | none |
| calico-head-2 | 81 | 81 | none |
| calico-legFR-0 | 81 | 81 | none |
| pointed-head-0 | 63 | 63 | none |
| pointed-head-1 | 63 | 63 | none |
| pointed-head-2 | 81 | 81 | none |
| pointed-head-3 | 76 | 76 | none |
| pointed-earL-0 | 81 | 81 | none |
| pointed-earR-0 | 81 | 81 | none |
| pointed-legFL-0 | 81 | 81 | none |
| pointed-pawFL-0 | 81 | 81 | none |
| pointed-pawFL-1 | 81 | 81 | none |
| pointed-legFR-0 | 81 | 81 | none |
| pointed-pawFR-0 | 81 | 81 | none |
| pointed-pawFR-1 | 81 | 81 | none |

Prompt4: actual repository helper report `.git/agent-evidence/coat-prompt4-observations.json`,72 patch/pose checks; the32 tabby/calico checks are all81/81. Approved tuxedo/pointed descriptor hashes and public actual-model SSR observations remain identical to the previous candidate. Repository tests separately cover complete polygons and all isolated-zero/idle fixtures. Historical planning calculator below is not the current recipe oracle.

### Local calculation provenance and limits

Planning-only harness: `.git/agent-evidence/coat-camera-planning-check.cjs`. It evaluates the existing pure TypeScript modules in memory and extracts viewer/root literals from source; no React app, API, database, product source or tests are changed. The original design is retained locally as `coat-camera-original-design.md`. All paths in this paragraph are local Git-excluded evidence, not files distributed by the OpenSpec.

Reproduction from the repository root, using a fresh label to avoid overwriting evidence:

```bash
node .git/agent-evidence/coat-camera-planning-check.cjs old <fresh-baseline-label>
node .git/agent-evidence/coat-camera-planning-check.cjs candidate <fresh-candidate-label>
```

Baseline `coat-camera-baseline.{json,stdout,stderr,exit-code}` records expected exit **1**, not a failed product test or TDD RED. Candidate-1 exit **0** records the visibility/burial calculation. Candidate-2 exit **0** adds coplanar-pair classification without changing any layout or visibility result; its JSON includes per-patch blockers, source SHA-256s and extracted inputs. `coat-camera-geometry-audit.json` verifies all 33 strict footprints, thickness/offsets and exact bib contacts. No browser, performance, isolated-zero/idle fixture or universal-admin visibility proof is implied.

## Color and state flow — Prompt4 contrast refinement

Dirt retains its existing primary/secondary effect and does not affect accent, like the nose. It blends RGB toward `#3e3024`: primary uses `dirtMix`, secondary `0.85*dirtMix`; dark inputs can lighten. Preserve this exactly.

Then derive tabby ink with `round(channel * 0.50)` per RGB channel: 50% toward black, never accent or a second dirt application. Clean Atigrado `#6b7280` gives `#363940`. Tuxedo uses resulting secondary; calico resulting secondary and unchanged accent; pointed unchanged accent.

Keep `PetCoatColors` colors-only. Separate complete state `PetCoatColors & {pattern: CoatPattern}` from optional-pattern write input; existing colors-only viewer/admin callers render solid. `CoatPreset` gains top-level `pattern`, retaining `coat` colors; presets submit `{...preset.coat, pattern: preset.pattern}`.

Normalize every state-returning API response. Serialize three color keys explicitly; include pattern only when supplied. Never spread complete state into camera requests or normalize invalid writes into solid. Read returned complete state so camera colors preserve the backend pattern. Presets, primary-and-pattern selection and hard backend-deployment merge gate remain unchanged.

## S8: browser metric and measured cost

Use real WebGL, fixed clock/rest yaw 0, identical viewport/DPR/quality/shadow256, pose, needs, lighting and **the same three colors** for each pattern-versus-solid pair. The reference is not always the Gris preset: changing palette must not manufacture a pass. Separately capture a test-only cat-object mask (base and patch meshes, excluding floor/contact shadow/background), restoring all instrumentation. Use the union of both cat masks as denominator.

Count masked pixels whose maximum absolute 8-bit RGB channel difference is ≥8. Require changed pixels / cat-mask pixels **≥3.0% independently for tabby, tuxedo, calico and pointed, at both normal/all-zero needs**. The3% criterion is only an acceptance floor, never a recognizability verdict. Final Prompt4 tabby/calico observations are in `evidence/prompt4-final50/browser.json`; approved tuxedo/pointed measurements remain in historical `evidence/browser.json`. Mask, clock and capture conditions must be checked; no shadow/background/animation drift counts. A fraction alone cannot prove an M, socks or ears: retain per-patch S3b and human judgment of every essential group, seams and no flicker. Also inspect orbit/tap, dirt/accent and camera omission/persistence. No new runtime debug controls are proposed.

| Pattern | N extra meshes | Total draws | Triangles | Minimum changed cat pixels |
|---|---:|---:|---:|---:|
| solid | 0 | 71 | 802 | reference |
| tabby | 12 | 95 | 1090 | 3.0% |
| tuxedo | 8 | 87 | 994 | 3.0% |
| calico | 4 | 79 | 898 | 3.0% |
| pointed | 12 | 95 | 1090 | 3.0% |

Same accounting: main cat33 + contact plane1, contact-depth33, four blur draws; six render invocations. Each box adds one main and one contact-depth draw, 24 submitted triangles combined: `71+2N`, `802+24N`. Contact depth includes meshes regardless of castShadow. Worst total remains95draws/1090triangles. Final actual six-pass counters match tabby95/1090 and calico79/898 in both poses; historical approved tuxedo87/994 and pointed95/1090 are not relabeled as new runs. Counters reset once per real frame; matte instrumentation is excluded. Desktop/SwiftShader counts are not GPU-time or low-end-phone performance proof.


## Prompt4 decision and contrast provenance

The human approved tuxedo/pointed, rejected tabby readability and calico's thin bars, and requested only those refinements, max12 boxes, four new normal/zero images versus same-palette solid, no commits and another stop before RDD. Geometry-only0.65 browser job49 passed but the actual dirty tabby screenshot still had low-contrast bands; the parent exercised the authorized conditional50% darkening, with a separate assertion RED before the helper change. Prompt5 subsequently approves both final normal/dirty images; see the verbatim decision in review.md. `evidence/prompt4-geometry35/` preserves the intermediate run. Final evidence belongs under `evidence/prompt4-final50/`; root evidence files remain historical, not silently overwritten.
