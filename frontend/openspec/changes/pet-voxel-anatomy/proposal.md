# Plan: voxel cat anatomy with inherited transforms

Planning only, based on HEAD `20ce4c4bf157862d7b79b40108e3ba512ec07614`.
No implementation, tests changed, dependency changes or commits are authorized by this step.

## Outcome

Replace the soft procedural cat with a recognizable, box-only sitting cat while
preserving all 33 part IDs, their material roles and existing runtime behavior.
A base-relative parent/child hierarchy keeps neighboring boxes attached when
needs or admin tuning translate, scale or rotate a parent.

The Crossy Road / Vaquita cow reference establishes the visual direction:
boxes and solid coat colors, not a GLB asset. The Vaquita source and the user's
geometry-verification script were not supplied or inspected. The supplied table
is the initial design, not a geometry result independently verified in this step.

## Current source versus request

| Evidence | Consequence |
| --- | --- |
| `src/features/pet-home/components/Cat3DModel.tsx:68–87,105–125,179–233` owns PartGeometry and the flat mesh list | Change Model, not Viewer. Preserve the root group and its handlers/animation. |
| Model resolves admin anatomy first, then need visuals | Preserve this order; convert to local coordinates using the immutable base table. |
| `src/features/admin/resolve-cat-design.ts:9–38` targets body, head and outer ears only | Preserve resolver targeting/formulas; descendants inherit once. |
| `src/features/pet-home/need-visuals.ts:66–108` currently targets body/chest and outer/inner ears | Remove the redundant child transforms only. |
| `test/features/pet-home/need-visuals.test.ts:57` reads a non-null base scale | Use `baseBody.scale ?? [1, 1, 1]`. |
| `test/features/pet-home/cat-anatomy.test.ts:50–74` assumes rounded geometry and scale-based pupils | Replace with semantic voxel and box-dimension rules. |
| Observed Model useFrame changes root yaw, bob, bounce and squash; no blink or ear-twitch animation exists there | Blink and the extra0.25rad ear tic are synthetic test inputs, not new runtime features. |
| Home explicitly supplies default design; admin tuning is browser-local | Preserve that isolation and existing design persistence. |

Historical source locations in the GLB-retirement design are not current runtime
evidence. The older realistic-cat spec's sphere/capsule requirement is explicitly
superseded by S1 below; its IDs/roles, sitting intent and renderer inputs remain.

## Deliverables and acceptance

- [Voxel anatomy](specs/voxel-anatomy.md): S1–S3 — boxes, compatibility, mirrors/frame.
- [Hierarchy and runtime composition](specs/part-hierarchy.md): S4–S6 — base offsets,
  inherited transforms, needs ownership.
- [Contact and preservation](specs/contact-and-preservation.md): S7–S10 — contact,
  admin controls, preserved experience and evidence/authorization boundaries.
- [Design](design.md): proposed algorithm, seed table, exact edit/test inventory.
- [Tasks](tasks.md): planning completion separated from future RED/GREEN/proof.

## Proposed implementation surfaces — not changed now

| Surface | Intended change |
| --- | --- |
| `src/features/pet-home/cat-anatomy.ts` | Box-only kind/three dimensions, optional parent, 33-part rest table. |
| `src/features/pet-home/cat-part-tree.ts` (new) | Pure topology/base-local-offset helper consumed by rendering. |
| `src/features/pet-home/components/Cat3DModel.tsx` | Box-only PartGeometry and recursive mesh subtree. |
| `src/features/pet-home/need-visuals.ts` | Remove chest-specific slimming and inner-ear-specific rotation, no formula changes. |
| Three existing test files and three proposed new files | Listed individually in design.md; no tests edited now. |

Keep `resolve-cat-design.ts`, design settings/storage, Viewer, home/stage,
interactions, purring, palette, lighting/camera/controls/shadows, backend and
package/lock files unchanged. A proven need to expand those edit surfaces must
be explained before implementation, not hidden in a geometry refactor.

## Risks and explicit follow-ups

- Runtime-parent subtraction cancels inherited movement; duplicate child factors
  produce double slimming/droop. Test local ownership and composed world results.
- A disconnected helper can pass pure tests while Model still renders flat.
  Add a Model recursion regression and later browser verification.
- World AABB intersection alone is not proof of rotated-ear contact. Test the
  transformed base face against the head, not just the ear's enclosing bounds.
- Nonuniform scale plus rotation requires matrix composition, not componentwise
  addition of world positions/Euler angles.
- Recognizability needs a later actual browser check; numeric invariants alone
  cannot establish visual quality. No browser or runtime proof is claimed now.
- Separate follow-up: admin `headHeight` +0.25 and `bodyDepth`0.7 may open preview
  gaps. Their extreme-contact behavior is intentionally not acceptance here.
- Idle movement, coat patterns, accessories themselves and adaptive resolution
  remain separate work. This establishes a usable anatomy, not those features.

## Next authorization boundary

Review these six Markdown files first. Only a later implementation instruction
starts TDD RED → GREEN and applicable RDD. No commits now; future commits must
use Conventional Commits, without `Co-authored-by` or `Generated with…`.
