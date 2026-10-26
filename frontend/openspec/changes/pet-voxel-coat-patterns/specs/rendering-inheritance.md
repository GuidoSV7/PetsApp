# Spec: actual model, color and preservation

Status: implemented and human-approved by Prompt5; final ink50%, tabby12 boxes, calico4 boxes/three large logical spots. Closure must not change approved geometry/colors/tests. Geometry: [S1–S4/S3b](pattern-geometry.md); evidence: [review](../review.md).

## S5 — Actual anchor nesting and inherited transforms

Every patch mesh MUST be a direct child of its named anchor in the real Cat3DModel. It MUST inherit head lowering, body slimming, ear droop plus tic, tail base-pivot rotation and admin tuning that affect its anchor or ancestors, exactly once. No root-level duplicate placement, world-offset baking, new idle binding or second need multiplier is allowed. Changing pattern must not rekey/remount the 33 anchors or restart their idle sampler.

Acceptance: extend the existing real-model SSR test, not a stand-in tree. Parse its actual meshes: solid still has 33 base meshes; each pattern has 33+N, identical base IDs/roles and each patch's direct mesh parent equal to anchorId. Compose actual markup matrices and compare with existing build/pose helpers for normal/all-zero needs, combined droop/tic, tail sway and representative existing admin settings, including nonuniform body scale. Preserve bottom hinges and existing root interactions.

## S6 — Derived stripes and unchanged dirt semantics

Tabby ink MUST be derived from the already dirt-adjusted primary with 8-bit RGB `round(channel * 0.50)`, never from accent. Tuxedo MUST use dirt-adjusted secondary; calico uses that secondary and unchanged accent; pointed uses unchanged accent.

The existing dirt effect MUST continue to affect primary and secondary only, not accent (including nose). Preserve the brown-mix formula; it is not a promise of lower luminance for every possible dark input.

Acceptance: clean Atigrado primary #6b7280 produces stripe #363940, not pink accent #c9a0a8. At hygiene zero, Atigrado stripe is #292727 after the existing dirt mix once; primary/secondary keep their existing dirt behavior and accent remains byte-identical. The geometry-only0.65 capture was inspected first; remaining dirty-stripe contrast justified the human-authorized50% refinement. Cross-check materials in the actual rendered model, with stripe derivation after dirt exactly once; calico/pointed accent patches and the nose remain unaffected. Solid's existing palette assertions must still pass.

## S7 — Preservation boundaries

The 33 base IDs/roles/table/hierarchy, need formulas, root animation, idle timing/pivots/reduced-motion behavior, adaptive DPR/fallback, shadow256, camera/orbit/care interactions, home layout and Diseño 3D settings/behavior MUST remain unchanged. Viewer edits are limited to prop forwarding; no new admin controls or photo-pattern classifier.

Acceptance: retain existing anatomy/tree/needs/idle/viewer/control tests. New admin-pattern fixtures test inheritance, not a new admin UI or guaranteed exposure under every independent tuning combination. Existing focused/full suites, TypeScript, build and real-browser evidence passed; rerun the full suite for closure and record its actual result in review.md. No new source/test edits are authorized.

## S8 — Cost and real browser proof

Count every patch in main and contact-depth passes using the adaptive-resolution methodology. Prompt4 counts are 0/12/8/4/12, maximum and hard ceiling12. Estimates remain `71+2N` draws and `802+24N` triangles over six render invocations: solid 71/802, tabby 95/1090, tuxedo 87/994, calico 79/898, pointed 95/1090. Do not count one draw per material role or per cube face.

For each non-solid pattern and each normal/all-zero fixture, real-WebGL captures MUST pair that pattern with solid using **identical three colors**, needs, rest pose, fixed clock, yaw 0, lighting, viewport, DPR and shadow256. No camera/orbit or animation change may manufacture visibility. Record the actual viewport/aspect. Capture a separate test-only cat-object mask, exclude floor/contact shadows/background, and restore instrumentation. Use the union of both cat masks as the denominator.

A changed cat pixel has maximum absolute 8-bit RGB channel difference ≥8. The changed-cat-pixel fraction MUST meet each independent minimum below in **both** fixtures; never pool patterns or poses. These are acceptance floors, not the actual measured percentages. Final measurements and separate human approval are recorded in review.md.

| Pattern | Minimum changed cat pixels versus same-palette solid |
|---|---:|
| tabby | 3.0% |
| tuxedo | 3.0% |
| calico | 3.0% |
| pointed | 3.0% |

Acceptance also requires per-patch S3b and human judgment: visible M **and several stripes**, bib **and both front socks**, at least three calico spots, pointed mask **plus both ears and front paws**. An aggregate fraction cannot replace recognizable groups. Check no gap/flicker or unexpected console/page/request errors, preserved orbit/tap, dirt/accent and camera omission/persistence. Save paired images, masks, measured fractions and the judgment per fixture.

Record actual mesh/triangle/draw counters per pass against solid at identical quality settings, documenting culling and renderer-info resets and excluding mask instrumentation passes. Keep shadow/resolution algorithms untouched. Counts and desktop FPS do not establish low-end Android/iPhone or GPU-time performance; hardware checks remain distinct. Previous four-pattern measurements remain historical evidence. Prompt4 reruns only tabby/calico; do not relabel old tuxedo/pointed captures as newly run.
