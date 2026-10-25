# Pivot geometry and current-base composition

Status: proposed; algebra below is not executed geometry proof.
Full derivation: [design](../design.md). Timing: [idle-timing](idle-timing.md).

## S5 — Preserve hierarchy and apply each resolved base/delta once

All33IDs/roles, box data, parent edges and immutable model-world rest coordinates
SHALL remain unchanged. Keep old buildCatPartTree/resolveCatPartTransform behavior.
Add one authoritative pure final-pose compositor alongside them.

For the current resolved part, get unpivoted local center p0 from the existing
baseLocal+(resolved.position-base.position) contract. Compose current Euler r0
plus idle rotation delta; multiply current own Yscale by blink factor. Geometry
dimensions determine a lower-face pivot c=(0,-height/2,0) for four carriers:
earL,earR,tailMid,tailTip. Otherwise c=0.

For final rotation R and scale S, final local center SHALL be
p0+idlePositionDelta+(S*c-R*S*c).
Use the SAME carrier mesh for geometry and descendants. Do not insert pivot
wrappers between mapped parent/child meshes, change base offsets or double-apply
a compensation from an earlier frame. Zero rotation preserves current center
exactly, including earSize adjustments.

### Scenarios
- Existing33node reconstruction, child-first/nonmutation and generic nested
  translation/rotation/nonuniform-scale fixtures still pass unchanged.
- Zero-rotation pose equals old local pose at default and changed admin settings.
- Nonzero pivot pose maps its lower-face center to the same parent-local anchor
  before/after rotation; use complete XYZ rotation/current scale, not just X.
- Actual Model JSX and frame updates use the same new compositor on raw current
  resolved values, not two subtly different formulas.
- Same frame twice is identical. Rerender needs/design replaces the old base;
  ending blink/tic or enabling reduced mode restores the current base, not an
  original mount pose. No per-frame setState or accumulated transforms.

## S6 — Ear need droop AND tic use the base-face hinge

Both ears SHALL hinge existing need-owned rotation and tic together about the
center of their own lower face. Preserve existing X droop and signed Z roll;
inner ears inherit once. Do not modify needVisualCues or its targeting/formulas.

At default earSize, with maximum existing X droop0.55 plus tic0.25 and existing
mirrored roll±0.1375, ALL FOUR lower-face vertices of each ear SHALL lie within
the actual head box. Test coordinates in composed head-local space, excluding
whole-cat root motion. Use numerical tolerance only, not a visual gap allowance.

### Scenarios
- Evaluate both sides independently with complete transformed vertices and head
  half-extents. A base-center point or overlapping/clipped AABB alone is invalid.
- Head lowering/admin head translation carries the ear/inner ear through the
  unchanged graph, without introducing their own translation.
- Preserve all24old stress combinations: needs100/0 × earSize1/.6/1.6 ×
  eye-Y factor1/.1 × extra pitch0/.25. Route their complete synthetic rotations
  through the production pose composer. Keep all existing SAT adjacency,
  base-intersection, frame and child-ownership assertions.
- The old fixture may stress both ears simultaneously as geometry input; that
  does not authorize a two-ear runtime tic. Whole-face containment is the stronger
  default-earSize requirement, not an unproven guarantee at all sizes/angles.

## S7 — Tail face joint stays registered under absolute-angle motion

tailMid SHALL remain a root and tailTip its child; tailBase parentage is unchanged.
Both animated tail segments rotate about their own lower-face centers.

Across sample times and healthy/tired numeric cues, the composed center of the
tip's lower face SHALL coincide with the composed center of the mid's upper face,
and their actual transformed faces SHALL contact. Include nonzero phase difference,
opposite-direction local rotation and cap-stress samples. Use the actual production
sampler, pose composer and existing parent-chain matrix composition.

A world AABB overlap alone is not evidence. Entire faces are not required to be
coplanar: distinct absolute angles make that impossible. Small intersection at
the articulated joint is allowed; positive separation is not. Never make tip
inherit the full mid rotation PLUS its absolute target.

### Scenarios
- Check face-center equality, actual face contact and reconstructed absolute
  targets at t0 and multiple nonzero phases, not just stored seed coordinates.
- Preserve tailBase↔tailMid↔tailTip contact, other legacy edges and existing frame
  constraints without changing dimensions/parents or inflating tolerances.
- Root uniform scale/yaw/bob does not establish a false local angle/contact result;
  local geometry proof excludes root transforms as in the prior spec.
