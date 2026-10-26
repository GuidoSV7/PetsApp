# Proposal: voxel skeleton (A1)

Status: APPROVED by owner Prompt11 with D1/D2 and adjustments1/2.
Implementation branch: `feat/pet-voxel-skeleton`, based on main `867853a291b907d32c453f962c17d9db137f9f8a`, after PR2 and scope PR3 merge commits. Planning originally inspected85152cb while PR2 was OPEN; that historical precondition is now resolved.

## Outcome

Introduce position/rotation-only joints, separate from scaled box meshes, while retaining the current seated appearance and existing idle behavior. A1 prepares articulation; it does not add poses, locomotion or gestures.

The new graph will contain shoulder/elbow/wrist, hip/knee/ankle, neck/head/jaw, three tail joints and ear joints. Six append-only box IDs represent forearms, shins, jaw and tongue; all remain hidden. Three empty accessory anchors cover neck, head and back.

## Why

Today many limbs are independent roots, not bendable chains. The body already scales nonuniformly for hunger and admin depth. Parenting future rotating limbs beneath that mesh would introduce shear.

Source inspection found no existing shear in the supported current hierarchy: scaled-body descendants do not rotate; rotating ears scale uniformly; blink has unrotated pupil descendants. This is a source-derived conclusion, not an executed matrix test. No general affine/shear workaround is proposed.

## Acceptance

- All joint local scales remain `[1,1,1]`; the existing uniform model/interaction wrapper stays outside the joint graph.
- Preserve the 33 original IDs, roles and dimensions, plus full world matrices of those boxes and all pattern boxes within `1e-6`.
- Preserve existing needs, idle, admin settings, camera, shadows, DPR, pattern ownership and interaction behavior.
- Hidden additions contribute zero draws. Total draws remain `2 × visible boxes + 5`: solid 71, tabby 95, tuxedo 87, calico 79, pointed 95.
- Future TDD covers surface contact, exact before/after home pixels and F2's anatomy-derived eye bounds. No tests or captures are run in this phase.

Details: [design](design.md), [joint requirements](specs/skeleton.md), [preservation requirements](specs/preservation.md), [gated tasks](tasks.md).

## Approved owner decisions

- **D1 — Structural test migration.** Recommend replacing assertions that require mesh-to-mesh parents, mesh-local rotations and 33 total scene meshes. Keep equally strong or stronger checks: exact joint topology, 33 unchanged legacy boxes, six additional hidden boxes, direct pattern-to-original-mesh ownership, complete world-matrix parity and unchanged numerical tolerances. Literal preservation of the old topology assertions is incompatible with the requested graph.
- **D2 — Attachment compensation.** Recommend explicit rest offsets that preserve existing head/limb world transforms while neck/shoulder/hip joints follow the scaled torso surface. In A1, those joint movements must not drag previously independent visible pieces. Do not replace this with inverse-scale ancestors or an appearance change.

D1/D2 and the proposed tables were approved by Prompt11. D2 is an A1 compatibility device; A2 decides whether limbs follow the body. Adjustment1 makes the bind `Lb` admin/needs-only and invariant across idle samples. Adjustment2 requires stopping on any pixel difference with difference images, changed-pixel count and maximum delta; do not adjust code to force equality.

## Non-goals and authorization

No new pose, animation, visible change, backend work, production access, new admin controls, camera change, dependency or accessory asset. F1's camera reader and F3's precision follow-ups remain deferred. The earlier Prompt10 planning-only stop is superseded by Prompt11 authorization for T0–T4, coherent local commits and fresh-consent A1-only native RDD. No A1 push/merge, backend or production operations. Freeze T0 evidence before production edits. Stop on any pixel difference as specified above.
