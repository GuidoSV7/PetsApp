# Design: base-relative voxel part tree

Status: proposed, not implemented or runtime-verified.
Read [proposal](proposal.md), then the [spec index](tasks.md#spec-index).

## 1. Keep base anatomy separate from runtime anatomy

The base table contains world-space rest positions. It contains only boxes,
positive width/height/depth and optional parent IDs; no base rotation or scale.
Build topology and local rest offsets from that immutable table, independent
of needs/admin inputs. A proposed internal helper `buildCatPartTree(baseParts)`
returns ordered root nodes with base part, local rest position and children.

For each node, preserve the original ID, role and geometry. Roots retain their
base world position. Children use `baseChild.position - baseParent.position`.
Every part appears once, regardless of whether its parent occurs earlier in the
input array. Tests establish unique IDs, existing parents and an acyclic table;
this is not a new public graph-validation API or new UI error contract.

Continue the existing runtime pipeline:

1. `resolveCatAnatomy(CAT_ANATOMY, tunables)`.
2. `applyNeedVisualsToAnatomy(resolved, cues)`.
3. Render the base tree, looking up each resolved part by its stable ID.

For a child, the rendered local translation is:

`baseLocal + (resolvedChild.position - baseChild.position)`.

For a root, this reduces to `resolvedRoot.position`. Thus only the child's own
translation delta is added; do not subtract a runtime parent position, which
would cancel the parent's motion. Runtime rotations and scales are already
complete local values: use each once, defaulting to `[0,0,0]` and `[1,1,1]`.
Do not multiply an already resolved scale by another copy of the base/runtime
scale. Base unit scale is implicit, not stored.

This preserves current ownership: admin resolver changes body/head/outer-ear
parts, not their children. No admin child delta needs stripping. Needs currently
change chest/inner ears separately; those redundant child branches are removed.

## 2. Render one recursive mesh subtree

`Cat3DModel.tsx`, not `Cat3DViewer.tsx`, owns PartGeometry and the current flat map.
PartGeometry becomes unconditionally `boxGeometry` with three dimensions.
Each part mesh owns its position/rotation/scale and contains its own geometry,
material and child meshes. A wrapper must not apply that transform a second time.
The renderer must actually consume the pure helper's topology/offsets.

Keep palette lookup, castShadow selection and root group click/pointer behavior.
Keep root useFrame yaw/bob/bounce/squash, root origin, resolved model scale and
orbiting behavior. Preserve React keys by part ID at each sibling level.
Descendants inherit transforms through Three.js, not by manually editing every
child's world position in separate animation passes.

For verification, compose `Mworld = MparentWorld * T(local) * R(local) * S(local)`.
Three.js Object3D uses this parent/local matrix multiplication. CPU-only matrix
math needs no Canvas/WebGL or new package. Do not multiply mesh geometry dimensions
into its node transform: geometry size and transform scale are separate inputs.

Reference: [Object3D matrixWorld implementation](https://github.com/mrdoob/three.js/blob/dev/src/core/Object3D.js),
consulted through Context7. The reference explains transform semantics; it is not
proof that this project's proposed implementation already works.

## 3. Initial rest table

These are the user's supplied starting dimensions. Every entry is `kind: "box"`.
Pairs expand L to negative x and R to positive x. Numeric refinements may improve
appearance only while the normative invariants/contact/frame remain true; tests
must not snapshot this entire dimension table.

| ID | Role | Position x,y,z | Args w,h,d | Parent |
| --- | --- | --- | --- | --- |
| body | primary | 0,0.20,-0.02 | 0.62,0.50,0.78 | — |
| chest | secondary | 0,0.20,0.39 | 0.40,0.36,0.04 | body |
| hipL / hipR | primary | ∓0.27,0,-0.22 | 0.20,0.38,0.30 | — |
| head | primary | 0,0.70,0.20 | 0.56,0.50,0.50 | — |
| cheekL / cheekR | primary | ∓0.31,0.62,0.30 | 0.08,0.14,0.20 | head |
| muzzle | secondary | 0,0.60,0.47 | 0.26,0.14,0.06 | head |
| earL / earR | primary | ∓0.18,1.00,0.14 | 0.16,0.18,0.08 | head |
| earInnerL / earInnerR | secondary | ∓0.18,1.01,0.185 | 0.08,0.10,0.01 | earL / earR |
| eyeL / eyeR | eye | ∓0.13,0.78,0.46 | 0.11,0.12,0.02 | head |
| pupilL / pupilR | pupil | ∓0.13,0.78,0.472 | 0.035,0.10,0.01 | eyeL / eyeR |
| nose | accent | 0,0.66,0.51 | 0.07,0.05,0.02 | head |
| philtrum | accent | 0,0.60,0.505 | 0.02,0.06,0.01 | head |
| whiskerL1 / whiskerR1 | whisker | ∓0.24,0.63,0.47 | 0.22,0.012,0.012 | head |
| whiskerL2 / whiskerR2 | whisker | ∓0.24,0.59,0.47 | 0.22,0.012,0.012 | head |
| tailBase | primary | 0.22,0.10,-0.45 | 0.10,0.10,0.30 | — |
| tailMid | primary | 0.22,0.31,-0.60 | 0.10,0.32,0.10 | — |
| tailTip | primary | 0.22,0.53,-0.60 | 0.10,0.12,0.10 | tailMid |
| legFL / legFR | primary | ∓0.16,-0.10,0.27 | 0.12,0.22,0.12 | — |
| pawFL / pawFR | primary | ∓0.16,-0.25,0.31 | 0.14,0.08,0.16 | — |
| padFL / padFR | accent | ∓0.16,-0.25,0.395 | 0.08,0.04,0.01 | pawFL / pawFR |
| pawBL / pawBR | primary | ∓0.27,-0.24,-0.16 | 0.16,0.10,0.20 | — |

## 4. Contact proof, not decorative parentage

Parentage and physical adjacency differ: nose/philtrum/whiskers are head children
but attach physically to the muzzle, not directly to the head's box.
The intended adjacency graph is specified in [S7](specs/contact-and-preservation.md).
Use dimensions and composed matrices from the actual table/runtime functions,
not a second hardcoded geometry implementation or a screenshot-only assertion.

For unrotated cases, interval overlap/touch on all axes is sufficient. With
rotation, conservative world AABB overlap is insufficient. For an ear, transform
the four corners of its local base face (`y = -height/2`) into head-local space
and test that face intersects the head's actual box (e.g. clipping against its
six half-spaces). This avoids mistaking an overlapping enclosing AABB or another
part of the ear for base contact. Parent inverse/world composition must match
render semantics. Descendant visual layers must remain attached to their carrier.

Use a small numerical epsilon such as1e-6model units for floating-point comparison,
not a visible-gap allowance. Test rules, not the literal initial widths/positions.
The mathematical frame is model-local, before root modelScale/bob/yaw; it is not
a new camera-frustum/aspect requirement. A browser check later uses the unchanged
viewer and captures actual visual quality separately.

Stress cases: neutral needs and all four needs0; default admin dimensions plus
earSize0.6/1.6; open and a near-closed positive synthetic eye-Y scale; maximum
existing outer-ear droop plus an additional0.25rad tic in its droop direction.
Do not implement blink/twitch/idle motion to run these tests. The exact synthetic
blink factor is a test input, not a new runtime formula or anatomy constant.

## 5. Test/edit inventory

All paths below are relative to frontend/. Tests are proposed, not executed now.

| Path | Planned change / evidence |
| --- | --- |
| `src/features/pet-home/cat-anatomy.ts` | Box-only type/table and parent links; CAT_MODEL_SCALE unchanged. |
| `src/features/pet-home/cat-part-tree.ts` (new) | Pure base-relative topology helper. |
| `src/features/pet-home/components/Cat3DModel.tsx` | Replace geometry switch/flat map with box-only recursive meshes. |
| `src/features/pet-home/need-visuals.ts` | Remove chest/inner-ear ownership branches only. |
| `test/features/pet-home/cat-anatomy.test.ts:50–74` | Replace elongated-sphere/capsule assertion with box rules; pupils use `args[1] > args[0]`, not scale. Add33-ID/role/mirror/frame checks. |
| `test/features/pet-home/need-visuals.test.ts:57` | Fallback `baseBody.scale ?? [1,1,1]`; assert no chest slimming or inner-ear rotation of its own; pin other cue formulas/behavior. |
| `test/features/admin/cat-design-settings.test.ts:37–64` | Existing resolver assertions retained; add parent-owned tuning/unchanged child-own transforms plus once-only world inheritance. No resolver formula rewrite. |
| `test/features/pet-home/cat-part-tree.test.ts` (new) | Parent validity/cycles, base offset reconstruction, nested levels, translated/scaled/rotated parent propagation and child-own deltas without mutation/double application. |
| `test/features/pet-home/cat-anatomy-contact.test.ts` (new) | Pure composed-contact graph, ear-base contact and synthetic stress matrix. |
| `test/features/pet-home/cat-3d-model.test.tsx` (new) | Actual Model recursion/one mesh per ID/box-only geometry/helper use, preserving material/shadow/root interaction semantics. Use existing React/Vitest tools with only renderer-hook boundaries mocked; no new test dependency. |

Existing Viewer/admin/home tests mock rendering, so their passing cannot prove
geometry or hierarchy. Run them as preservation controls, not as anatomy proof.
Keep the retirement CAT_MODEL_SCALE regression in
`test/lib/retired-pet-model-contracts.test.ts` unchanged. The conditional user
fallback `defaultCatDesign().modelScale === CAT_MODEL_SCALE` is not activated:
this proposal changes no model scale.

No additional existing numeric-shape assertion was identified in the bounded
source map beyond the two anatomy assertions, need-visuals scale dereference
and the admin inheritance coverage gap above. If implementation discovers one,
record it before changing it; do not silently weaken unrelated tests.

## 6. Boundaries and later evidence

Do not change Viewer/camera/OrbitControls/ContactShadows/CAT_MODEL_SCALE, home,
admin persisted schema/storage, coat palette or root animation/interactions/purr.
Do not edit historical OpenSpec files; explicitly supersede only rounded-geometry
requirements via the new specs. No GLB/backend/network/persistence/dependency work.

Separate follow-up: high admin headHeight(+0.25) and low bodyDepth(0.7) can separate
otherwise independent root parts in the local preview. This change preserves those
formulas rather than expanding into repositioning other roots or restricting knobs.
Contact acceptance uses default headHeight/bodyDepth and the specified ear range.

Later proof must distinguish RED rules from compatibility controls, run focused
pure/component and existing preservation tests, then normal full-suite/build/
applicable lint checks and browser review. Any known baseline failures must be
recorded separately, not relabeled as passes or fixed outside scope. RDD follows
the user-owned switch/current consent protocol; no old receipt is reusable.
