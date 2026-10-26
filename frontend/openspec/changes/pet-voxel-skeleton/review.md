# A1 skeleton verification report

Status: functional PASS; independent functional PASS with freshly owner-accepted isolation deviation; native APPROVED + ACKNOWLEDGED. Local only: no push/merge or delivery approval.

## Scope and commits

Base/main: `867853a291b907d32c453f962c17d9db137f9f8a`.

| Unit | Commit | Evidence |
|---|---|---|
| T0 independent baseline | `7bd0814152bf4c74bb74cb3d84c7e2fbe41cd0ff` |12actual-browser scenarios, six idle samples each, ten home/canvas pairs frozen before production edits;13fixture controls; full421/421 |
| T1 static rig compiler | `6a4e7435e5b1a36af22a2f97a29725adda552b21` |15assertion RED from a loadable empty graph; focused39/39, full436/436, TypeScript0 |
| T2 renderer/frame integration | `6005882d7406229ac2c2ec6321d5b7befa7d1101` |12valid per-frame RED failures; focused66/66, full461/461, TypeScript0 |
| T3 F2 eye bounds | `f6a0002888d6db5e11bb3ce72ac7f0cd184ca2ca` |22/22before and after; no invented RED |
| T4 visual evidence | `0c39cf49bed0453e1b0dc6ec065fca8ecf463a2e` |20exact images,3,444matrices, unchanged draws; passive evidence, outside native approval |

No source/test changes occurred after the final pixel comparison. The approved native range is main867853a → f6a0002: A1 only, including T0 but not the earlier coat implementation, T4 evidence or later passive closure documentation.

## Functional verification

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

All three are informational `WARNING`s; none opened a correction or reopens approval. Locations below belong to the frozen f6a0002 candidate. They were not fixed or re-reviewed.

| ID | Lens | Frozen location |
|---|---|---|
| `R2-reproducible-browser-protocol` | readability | `frontend/openspec/changes/pet-voxel-skeleton/evidence/README.md:7-11` |
| `R3-browser-parity` | reliability | `frontend/openspec/changes/pet-voxel-skeleton/tasks.md:20` |
| `R3-live-reconciliation` | reliability | `frontend/test/features/pet-home/cat-3d-model-skeleton.test.tsx:86-96` |

The facade returned IDs/severity/locations but not detailed explanations/recommendations. They are not invented, and approval does not mean zero findings.

## Final boundary

A1 implementation is complete and verified. The feature branch is restored; source/tests remain identical to the reviewed and pixel-tested f6a0002. T4 evidence and this passive closing update are outside native approval. Main and the local coat backup are unchanged; all21unrelated untracked files retain their original hashes. No pending/failed/skipped functional check remains; physical-phone/GPU performance was not claimed. No A1 push, merge, backend, production or Dokploy operation occurred. Future publication and any follow-up work remain the owner's decisions.
