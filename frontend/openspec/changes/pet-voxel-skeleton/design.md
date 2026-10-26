# Design: voxel skeleton (A1)

Status: IMPLEMENTED and verified for A1. D1/D2 and owner adjustments below remain the approved contract. Base main867853a; implementation f6a0002 received native APPROVED + acknowledgement. See [verification report](review.md) for exact functional proof, accepted isolation deviation and nonblocking follow-ups.
All coordinates below are model-space coordinates before the existing outer wrapper; dimensions use the current box units.

## 1. Current graph and transform ownership

Paths in this section are relative to `frontend/`.

- `src/features/pet-home/cat-part-tree.ts:14–31` builds nodes in two passes. A child's bind-local position is its immutable anatomy center minus its parent's center; original ordering and child-first input are supported.
- `cat-part-tree.ts:35–67` adds only the part's own resolved displacement, adds idle Euler deltas and multiplies eye Y scale by blink. Ears, tailMid and tailTip use a scaled lower-face pivot through the correction `p − R p`. Other parts rotate around their centers.
- `components/Cat3DModel.tsx:104–136,187–218` resolves admin tuning, then needs, while constructing the parent graph from the original anatomy. Meshes currently carry both geometry and transforms; child anatomy and pattern meshes inherit their transforms.

The current graph is not a connected skeleton:

| Existing carrier | Existing children |
|---|---|
| Model root | body, hipL, hipR, head, tailBase, tailMid, legFL, legFR, pawFL, pawFR, pawBL, pawBR |
| body | chest |
| head | cheekL/R, muzzle, earL/R, eyeL/R, nose, philtrum, whiskerL1/L2/R1/R2 |
| earL / earR | earInnerL / earInnerR |
| eyeL / eyeR | pupilL / pupilR |
| tailMid | tailTip |
| pawFL / pawFR | padFL / padFR |

Transform sources:

| Source | Current effect; must remain identical |
|---|---|
| `src/features/admin/resolve-cat-design.ts` | bodyDepth scales body Z; headHeight translates head Y; earSize uniformly scales each outer ear and its descendants. Model scale is external. |
| `src/features/pet-home/need-visuals.ts` | Hunger scales body X/Z down to .78; energy lowers head by up to .08; fun rotates ears and scales pupils; hygiene mixes dirt into primary/secondary, not accent. |
| `src/features/pet-home/cat-idle-motion.ts` | Blink scales eye Y; ear tics add rotation; tail angles include the existing relative tip angle. Reduced motion preserves its current behavior. |
| `src/features/pet-home/cat-idle-frame.ts:24–49` | Rewrites six registered poses absolutely each frame, then applies existing root yaw/bob/reaction behavior; never accumulates last frame's transforms. |
| `src/features/pet-home/coat-patterns.ts` | Patches remain direct children of named box meshes; their own positions, dimensions, colors and rotations do not change. Tabby bands stay on legFL/legFR. |
| `src/features/pet-home/components/Cat3DViewer.tsx` | Camera `[0,.42,3.05]`, FOV28, target `[0,.18,.05]`, contact shadow256, DPR policy and controls remain untouched. |

The present supported matrices have orthogonal basis columns: body scale has no rotating descendant; ear scale is uniform; pupils do not rotate below blinking eyes; tails have no nonuniformly scaled ancestor inside the model. The shear risk arises if a future rotation is placed below body scale, not merely because that scale exists.

Three r186 documents warn that [decompose](https://github.com/mrdoob/three.js/blob/r186/docs/pages/Matrix4.html) may fail for such world matrices and [attach](https://github.com/mrdoob/three.js/blob/r186/docs/pages/Object3D.html) does not support nonuniformly scaled scene graphs. A1 must not use automatic `Object3D.attach()` reparenting or assume arbitrary affine matrices can be decomposed.

## 2. Proposed representation and transform evaluation

Keep the original 33-box anatomy, IDs, roles, dimensions, order and legacy tree/pose API semantics. Introduce a separate typed joint graph and an extended box manifest whose prefix is those 33 entries, followed by the six hidden additions. A mesh's visual hierarchy no longer defines skeletal ancestry.

Every joint is a non-mesh Object3D/group with local position and rotation only, and local scale exactly `[1,1,1]`. Mesh-local translation offsets are allowed; all nonuniform scale belongs to box meshes. No joint descends from a box mesh. The existing uniform outer modelScale/reaction wrapper, including its translation/yaw/bob, is not a joint and is applied once, unchanged.

Resolve admin → needs once per changed configuration. In model space, let `Wb0` be an original box's resolved REST matrix and `Jb0` its owner joint's rigid REST matrix. Compile the static mesh bind once:

`Lb = inverse(Jb0) × Wb0`.

**Owner adjustment1:** `Lb` depends ONLY on admin/resolved needs. Never recalculate it per frame from a legacy animated world. Idle changes ear/tail joint rotations and a separate explicit blink scale on eye/pupil boxes; boxes follow the joint hierarchy. The final blinking mesh scale is dynamic, but its base bind/offset is not. Test strict bind invariance across idle samples with fixed configuration, and verify compilation is not called by frame application.

Joint orientations follow the corresponding existing rigid rotations, so `Lb` contains the required positional offset and diagonal scale, not shear. Recover positions/scales through the known transform factors; do not introduce arbitrary matrix baking or silently approximate a nonorthogonal result. Surface joints and intermediate limb joints that currently have no rotating equivalent have identity rest rotation. Supported-input orthogonality and complete matrix parity become future test gates, not assumptions accepted without tests.

Explicitly preserve scale inheritance that the old meshes supplied: body scale reaches chest offsets/scale; earSize reaches inner-ear offsets/scale; eye blink reaches pupil scale. Rotations of ears and tail move to joints, preserving the exact lower-face hinges. Never apply the old pivot correction and the new joint pivot twice.

Keep the six-ID idle registry identity/cleanup contract and add a separate joint-ref map. A transform-adaptation stage consumes the same existing sample once: ear/tail rotations target joints; blink targets box scales. Preserve existing frame-helper compatibility and root equations; do not create another clock, sampler, detached dummy meshes or a second need multiplier. New joint definitions/components should not add dynamic group literals to Cat3DModel's existing root declaration: its camera-test AST reader must keep finding the unchanged root position and `modelScale` expression. F1 is not included in A1.

## 3. Joint table: default rest pose

`P0` is the model-space pivot, `L0` the translation relative to the listed parent, with default admin settings, full needs and idle deltas zero. All rotations are zero in this table. Runtime legacy ear/tail rotations are applied as described above. Every row's local scale is one.

Names use the `joint-` prefix to avoid collisions with the preserved box IDs. FL/FR and BL/BR preserve the existing sign convention: L is negative X.

| Joint ID | Parent | P0 | L0 | Direct box ownership |
|---|---|---|---|---|
| joint-root | outer wrapper | (0,0,0) | (0,0,0) | — |
| joint-torso | joint-root | (0,.20,-.02) | (0,.20,-.02) | body, chest |
| joint-neck | joint-torso | (0,.45,.20) | (0,.25,.22) | — |
| joint-head | joint-neck | (0,.70,.20) | (0,.25,0) | head, cheekL/R, muzzle, eyeL/R, pupilL/R, nose, philtrum, whiskerL1/L2/R1/R2 |
| joint-jaw | joint-head | (0,.60,.45) | (0,-.10,.25) | jaw, tongue, both hidden |
| joint-shoulderFL | joint-torso | (-.16,-.05,.30) | (-.16,-.25,.32) | legFL |
| joint-elbowFL | joint-shoulderFL | (-.16,-.12,.27) | (0,-.07,-.03) | forearmFL, hidden |
| joint-wristFL | joint-elbowFL | (-.16,-.21,.27) | (0,-.09,0) | pawFL, padFL |
| joint-shoulderFR | joint-torso | (.16,-.05,.30) | (.16,-.25,.32) | legFR |
| joint-elbowFR | joint-shoulderFR | (.16,-.12,.27) | (0,-.07,-.03) | forearmFR, hidden |
| joint-wristFR | joint-elbowFR | (.16,-.21,.27) | (0,-.09,0) | pawFR, padFR |
| joint-hipBL | joint-torso | (-.31,.10,-.22) | (-.31,-.10,-.20) | hipL |
| joint-kneeBL | joint-hipBL | (-.27,-.07,-.22) | (.04,-.17,0) | shinBL, hidden |
| joint-ankleBL | joint-kneeBL | (-.27,-.19,-.16) | (0,-.12,.06) | pawBL |
| joint-hipBR | joint-torso | (.31,.10,-.22) | (.31,-.10,-.20) | hipR |
| joint-kneeBR | joint-hipBR | (.27,-.07,-.22) | (-.04,-.17,0) | shinBR, hidden |
| joint-ankleBR | joint-kneeBR | (.27,-.19,-.16) | (0,-.12,.06) | pawBR |
| joint-tailBase | joint-torso | (.22,.10,-.41) | (.22,-.10,-.39) | tailBase |
| joint-tailMid | joint-tailBase | (.22,.15,-.60) | (0,.05,-.19) | tailMid |
| joint-tailTip | joint-tailMid | (.22,.47,-.60) | (0,.32,0) | tailTip |
| joint-earL | joint-head | (-.18,.91,.14) | (-.18,.21,-.06) | earL, earInnerL |
| joint-earR | joint-head | (.18,.91,.14) | (.18,.21,-.06) | earR, earInnerR |

These 22 rows cover all 33 original boxes exactly once and the six new hidden boxes. The visible tailBase stays unrotated in A1; tailMid/tailTip retain their existing motion and relative-angle convention.

### Surface following and compatibility offsets — D2

Let `c` be resolved body center, `Sbody` its resolved diagonal scale after admin and needs, and `a` the bind offset in a surface-joint row. Its pivot is `c + Sbody × a`; only the position changes, never the joint scale. Neck/back use the upper face, shoulders the lower face, hips the lateral faces and tailBase the rear face. Derive face coordinates from the unchanged body dimensions, not duplicated tuning formulas.

Head's target center retains the existing headHeight/energy displacement. Elbows, wrists, knees and ankles retain the old limb model-space target positions in A1. Compute their parent-local rest translations and box binds only when admin/resolved needs change, using the rigid REST parents and `Lb` above. Otherwise merely attaching the old independent roots would move the cat and violate parity.

For example, at hunger0/default admin, body X/Z scale is .78. The left shoulder moves from `(-.16,-.05,.30)` to `(-.1248,-.05,.2296)` on the scaled lower face. legFL remains centered at `(-.16,-.10,.27)`; its compensated local offset is `(-.0352,-.05,.0404)`. This retains both the surface attachment and the existing visible limb. It is an explicit A1 compatibility offset, not a new pose or an inverse-scale joint.

Ear pivots follow the scaled bottom face: default head-relative Y `.30 − .09 × earSize`, plus the existing head displacement in model space. Mid-tail pivot remains its old lower face; the tip pivot is `.32` above it in the mid joint's rotating frame. Existing admin/need inputs, not last frame's mutated state, determine every offset.

## 4. Hidden boxes and accessory anchors

All six additions are actual hidden box meshes with explicit `visible=false`, stable unique IDs and no pattern attachments. They remain hidden across all inputs and reconciliation. A2 activation is not implemented. There are 39 base mesh objects, but still only 33 visible base boxes; D1 must account for this distinction.

| New ID | Default center | Dimensions | Containing original box | Material role |
|---|---|---|---|---|
| forearmFL | (-.16,-.16,.27) | (.10,.08,.10) | legFL | legFL's role |
| forearmFR | (.16,-.16,.27) | (.10,.08,.10) | legFR | legFR's role |
| shinBL | (-.27,-.13,-.22) | (.14,.12,.20) | hipL | hipL's role |
| shinBR | (.27,-.13,-.22) | (.14,.12,.20) | hipR | hipR's role |
| jaw | (0,.57,.47) | (.20,.06,.04) | muzzle | muzzle's role |
| tongue | (0,.565,.476) | (.10,.012,.024) | jaw, itself inside muzzle | nose's role |

Containment is checked in the containing box's local frame, including boundaries; the shins reach the hip's existing lower face. Hidden-box offsets/scales follow their containing visual frame so the volumes remain contained under current needs/admin/idle. Original geometry arguments are not resized, split or reused under different IDs.

| Empty anchor | Parent | Default model-space position | Following rule |
|---|---|---|---|
| accessory-neck | joint-neck | (0,.45,.20) | Same surface pivot as neck |
| accessory-head | joint-head | (0,.95,.20) | Resolved head upper-face center |
| accessory-back | joint-torso | (0,.45,-.22) | Body upper-face offset (0,.25,-.20), scaled position only |

Anchors are empty, unit-scale nodes. No accessory meshes, assets, storage or UI are added.

## 5. Verification design and risk controls

All checks here are planned for the later TDD phase, not executed evidence.

| Risk | Required future proof |
|---|---|
| New joint below scaled mesh; inverse-scale cancellation | Assert every joint/accessory local scale is exactly one and no joint has a mesh ancestor inside the rig. Matrix bases must remain orthogonal for supported inputs. |
| Double pivot, lost scale inheritance or wrong parent compensation | Independently frozen pre-change actual-scene world matrices for all 33 boxes and every patch; compare all 16 elements at absolute error ≤1e-6. Cover endpoints, existing idle extrema and admin fixtures. |
| Circular oracle | Capture baselines before refactoring; runtime tests read committed fixture data, not git history or the new solver/legacy evaluator used by production. Unchanged parity checks can begin GREEN; that is not a new-feature RED. |
| Gaps during hunger changes | For default admin, sweep hunger0–100 and check surface equations plus actual adjacent-box contact/overlap: body/chest, body/head, body/hips, body/front legs, legs/front paws, hips/hind paws and existing tail connections. Use oriented geometry for rotating pieces, not just AABBs. |
| Misinterpreting contact | Overlap is valid; do not force face-to-face contact. Preserve intentional existing gaps and existing admin effects rather than moving boxes to repair them. No universal contact promise under every independent admin tuning. |
| Idle reset, drift, double application or broken controls | Existing timing/reduced-motion/orbit/reaction controls, repeated-frame stability, live need/admin updates, and pattern switches with stable mesh/ref/registry identities. |
| Hidden boxes leak into renders | Assert all six actual mesh visibility flags remain false, then measure main/contact passes. Visible counts stay33+N and draws stay2×(33+N)+5. |
| Traversal/material sorting or floating-point changes alter pixels | Before/after real-WebGL home screenshots and actual canvas buffers under the same deterministic settings; zero changed pixels, not a relaxed threshold. Owner adjustment2: ANY nonzero difference immediately stops execution with before/after/difference images, changed-pixel count and maximum channel delta. Do not adjust code to force pixel equality. |
| Brittle existing structural tests | D1 migration replaces old physical-parent/local-TRS assertions with exact new graph and complete old observable invariants. Preserve legacy helper tests and all unrelated assertions; do not delete failures or lower precision. |
| F2 copies today's eye constants | Derive bounds from head/eye positions and dimensions; retain strict stripe inequalities and unchanged recipes. No eye movement or F1/F3 work. |

A fresh future native RDD candidate must cover A1 itself, after applicable checks and the repository's commit-first policy. The old coat-pattern approval is not A1 approval. No runtime parity, pixel equality, performance or native-review result is claimed by these documents.
