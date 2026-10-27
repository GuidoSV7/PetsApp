# A1 skeleton verification report

Status: original A1 functional/independent PASS and native APPROVED + ACKNOWLEDGED; owner-approved verification follow-ups PASS. Publication to main with a merge commit is now explicitly authorized. Native approval scope remains f6a0002, not these follow-ups.

## Scope and commits

Base/main: `867853a291b907d32c453f962c17d9db137f9f8a`.

| Unit | Commit | Evidence |
|---|---|---|
| T0 independent baseline | `7bd0814152bf4c74bb74cb3d84c7e2fbe41cd0ff` |12actual-browser scenarios, six idle samples each, ten home/canvas pairs frozen before production edits;13fixture controls; full421/421 |
| T1 static rig compiler | `6a4e7435e5b1a36af22a2f97a29725adda552b21` |15assertion RED from a loadable empty graph; focused39/39, full436/436, TypeScript0 |
| T2 renderer/frame integration | `6005882d7406229ac2c2ec6321d5b7befa7d1101` |12valid per-frame RED failures; focused66/66, full461/461, TypeScript0 |
| T3 F2 eye bounds | `f6a0002888d6db5e11bb3ce72ac7f0cd184ca2ca` |22/22before and after; no invented RED |
| T4 visual evidence | `0c39cf49bed0453e1b0dc6ec065fca8ecf463a2e` |20exact images,3,444matrices, unchanged draws; passive evidence, outside native approval |

No application-source changes occurred after the original final pixel comparison. Later owner-approved changes affect tests, docs and shared browser tooling only; their fresh gates are recorded below. The approved native range is main867853a → f6a0002: A1 only, including T0 but not the earlier coat implementation, T4 evidence or later passive closure documentation.

## Original implementation verification

- Full suite: **461/461**,55files,0failed,0skipped, `heavy`, max2workers.
- TypeScript: `tsc --noEmit`, exit0.
- Production frontend build: `next build`, exit0. Nonblocking existing edge-runtime/static-generation warning.
- Differential against the immutable main base:9public-frame cases,8exactly unchanged,1requested optional-route delegation,0unexpected. Forty legacy frame samples match exact JSON/worlds; stdout/stderr/exit codes preserved. Root/bounce behavior unchanged in the new-route case.
- Real browser:12scenarios; **3,444** original/pattern world matrices at rest and existing idle samples. Maximum coefficient error **2.220446049250313e-16**, tolerance1e-6. All patch parents remain their original meshes.
- Every actual sample has22unit-scale joints, three accessory anchors and exactly six hidden boxes. Original33visible boxes/dimensions/roles are retained.
- Default hunger0–100 contact sweep and existing finite-face tail contact checks pass. Bind invariance and zero per-frame legacy pose-resolver calls pass.

## Exact pixels and measured draws

Ten default-admin cases cover all five patterns at all100/all0 needs. Both decoded canvas and home images were compared: **20comparisons,0changed pixels, maximum channel delta0**, no resize/tolerance. No pixel-driven production correction was made.

| Pattern | Needs100 draws | Needs0 draws |
|---|---:|---:|
| solid |71|71|
| tabby |95|95|
| tuxedo |87|87|
| calico |79|79|
| pointed |95|95|

Actual browser JS/page/request errors:0. Owned servers/browsers stopped. See [compact checks](evidence/checks.json), [baseline protocol](evidence/README.md) and compressed actual-world reports. Extra admin scenarios cover tabby/pointed with existing tunables; those compare actual matrices, not additional pixel captures.

## Approved design interpretation and test migration

- D1 replaces obsolete mesh-parent/local-TRS/33-total assertions with all33 exact joint owners, complete model-space rest matrices at12digits,39total meshes, explicit hidden props and independent actual-browser worlds. Existing coat matrix checks stay at10digits; no controls or inequalities were removed/weakened.
- D2 is an **A1 compatibility device**, not an A2 limb-following decision. Rigid surface pivots move with admin/needs; static rest offsets preserve the independently placed legacy limbs.
- `Lb` is compiled only on admin/resolved-needs changes. Idle rotates ear/tail joints and separately blinks eye/pupil scales; there is no per-frame legacy-world bind solve or detached dummy animated tree.
- Existing anatomy/tree/pose helper APIs and default frame behavior remain supported. F2 derives eye extents from anatomy without moving eyes/recipes. F1/F3 remain deferred.

## Honest failure history and limitations

- T1's15 loadable RED assertions stopped at22-joint/39-bind counts or missing bindings; downstream matrices/contact/idle were not each independently RED-proven.
- T1's initial post-implementation harness used Float32 buffer bounds against exact decimal geometry at1e-12. Switching the test to declared box corners fixed two harness failures without reducing precision or changing production.
- T2's first run did not load because Vite/jsdom rewrote a fixture URL; it is not RED. The subsequent loadable run had12preservation passes and13failures:12real unwanted legacy-per-frame solver calls, plus an invalid React.createElement visibility observer. The observer now checks actual public renderBox element props and retains all hidden assertions. The test's orbiting input was corrected to match the frozen home; no production changes were made for these harness issues.
- Chromium SwiftShader is controlled rendering proof, **not physical-phone or real-GPU performance**. No such performance result is claimed.
- Native ASSESS initially could not assess undeclared untracked scope; it created no approval. Its named item3 plan required the separate verifier below. No previous coat approval or HOME exception was inherited.

## Independent and native verification

Risk: item3 — new optional motion route in shared `applyCatIdleFrame`; existing consumers must remain compatible.

One `gentle-ai-verify` task checked source commit `f6a0002888d6db5e11bb3ce72ac7f0cd184ca2ca`: **121/121** focused tests in8files, TypeScript exit0, plus one independently written route probe passed. The probe covered eight need/reduced-motion/orbit combinations and null-root handling. Its own raw comparison confirmed3,444matrices/maxerror2.22e-16 and the frozen fixture SHA.

The verifier's higher-priority isolation rules forced copied dependencies, system-temp state and isolated `HOME`, contrary to the requested current-HOME/in-project setup. No package manager/install/network was used; Node24.22.1/Vitest3.2.7 matched. The owner FRESHLY selected **"Aceptar la prueba y limpiar su scratch"** for this A1; this is not the earlier coat exception. The apparent concurrent documentation mutation was the parent's T4commit0c39cf4, not verifier writes. Report/probe were preserved locally; only the explicitly authorized `/tmp/petsapp-skeleton-verify.utSYjo` was deleted. The parent spot-check passed6/6 under original HOME. The extra probe is preserved locally, not part of the committed461-test suite.

Native consent was requested separately and explicitly answered **granted** through binding `ba3fa113-2653-4925-93c7-4bdac3929244`. An initial reduced-base preflight was refused without authority/mutation; after fresh INSPECT, the provider-offered main867853a → f6a0002 range was used and disclosed before consent. It contains40files/1,241lines and three lenses: risk, readability, reliability.

- Lineage: `review-56e5a887a0ca4831`.
- Reviewed implementation commit: `f6a0002888d6db5e11bb3ce72ac7f0cd184ca2ca`.
- Outcome: **APPROVED**, then exact acknowledgement completed: `native-approved-acknowledgement-completed`.
- Consumed revision: `sha256:bcb02e6ac94c2276ad051a422a21a40cf237f5e740d8f2c03bcfa57bba1ae182`.
- Authority: **burned**, `gentle-ai.review-acknowledged/v1`; no STATUS after the burn.
- Three reviewers prepared/admitted; no correction or second review.
- `refs/rdd/last-approved/feat/pet-voxel-skeleton` points to f6a0002, not later passive evidence/closure commits.

### Native nonblocking follow-ups

All three are informational `WARNING`s; none opened a correction or reopens approval. Locations below belong to the frozen f6a0002 candidate. They were left as follow-ups at original closure. The owner later authorized the test/docs/browser-tooling resolutions below; no second native review was run.

| ID | Lens | Frozen location |
|---|---|---|
| `R2-reproducible-browser-protocol` | readability | `frontend/openspec/changes/pet-voxel-skeleton/evidence/README.md:7-11` |
| `R3-browser-parity` | reliability | `frontend/openspec/changes/pet-voxel-skeleton/tasks.md:20` |
| `R3-live-reconciliation` | reliability | `frontend/test/features/pet-home/cat-3d-model-skeleton.test.tsx:86-96` |

The facade returned IDs/severity/locations but not detailed explanations/recommendations. They are not invented, and approval does not mean zero findings.

## Owner-approved verification follow-ups

- **R2 reproducibility:** the harness is now versioned at `frontend/scripts/browser-evidence/pet-voxel-skeleton.cjs`, with shared host/browser requirements and the explicit after command. Only after is supported. The public baseline rejection has exact exit2/empty stdout/documented stderr, and a test proves every historical evidence file and the fixture stay unchanged.
- **R3 browser parity:** the versioned command actually ran again:12cases,20decoded image comparisons,0changed pixels/maxdelta0;3,444complete matrices/max coefficient error2.220446049250313e-16; draws71/95/87/79/95 unchanged at both need endpoints; JS/page/request errors0. Fresh screenshots/raw results stay in unique Git-private run output, not over the historical captures. Owned browser/server and copied scratch were stopped/removed.
- **R3 live reconciliation:** existing pattern rerenders now assert0extra compiler calls and that all six idle registry values are the original meshes. The new single-mounted non-StrictMode test exercises tabby100→0→100, then0again to isolate the existing tuned-admin0 oracle, and finally returns to original100/default admin. It preserves mesh/ref-map identity, six hidden props and static binds; each configuration update compiles once, frames compile0times, and all full worlds match independent frozen idle states at the existing10-digit precision.

### Fresh checks and honest failure provenance

- Focused **56/56**; full **463/463**,56files,0failed/0skipped, maximum2workers under `heavy`.
- `tsc --noEmit` exit0; `next build` exit0 under `heavy`. Only the existing edge-runtime/static-generation warning remains.
- `node --check` on the CJS runner passed. Shellcheck is inapplicable to JavaScript; no shell script or skill changed.
- The first focused run was55/56, not a valid product RED: the new test compared idle time0 with reduced-motion rest. Actual tailTip[0]0.7669033772632601 exactly matched the frozen idle0; wrong rest expected0.78. Selecting the correct frozen idle sample fixed only the test. The new architectural controls pass without an application change; no artificial defect was inserted.
- An internal metadata collector initially assumed T0's117source files. Current A1 has119(compiler+renderer added); the collector now derives its count from the pre-edit seal. This was not a functional test failure or a source change.
- All119application files, package manifests/lockfile, historical PNG/JSON/gzip and frozen fixture retain their bytes. Only the evidence README was intentionally updated among pre-sealed paths. Fixture SHA remains `e63f0eeb1fd77754159c9267b6a4ed17f5268addf1b58c4eb987516c6000b6cc`.
- Compact new evidence: [followup-checks.json](followup-checks.json). No historical measurement, screenshot or original native receipt was rewritten.

## Publication and final boundary

The owner explicitly authorized the A1 feature branch push, one PR into main, and `gh pr merge --merge` (no squash/rebase). GitHub checks are intentionally absent: external project CI/CD was not claimed as observed, and fresh local full-suite/TypeScript/build evidence is the owner's explicit merge exception. Empty checks are not green CI. An approved A1 issue and exactly one `type:feature` PR label are separately authorized; the owner selected a closing issue reference.

Original native approval remains867853a→f6a0002, excluding T4 evidence, original closure docs and these follow-ups. That authority is burned and was not queried/reused. Test/doc/tooling-only follow-ups did not trigger another native review under repository policy. Original shared-frame item3 verification remains recorded above; follow-up Risk: none (no application contract changes).

No application fixes, poses/coins/dependencies/precision changes, production/Dokploy operation, force push or local coat-backup publication. All21unrelated untracked files remain protected. Exact follow-up and merge commit IDs are recorded by Git/PR delivery and the local delivery receipt, not invented as self-referential commit content.
