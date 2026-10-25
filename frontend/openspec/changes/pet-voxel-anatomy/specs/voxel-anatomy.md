# Voxel anatomy requirements

Status: proposed; no implementation/test execution asserted.
These requirements supersede only the sphere/capsule geometry requirement in
`pet-cat-realistic-3d/specs/cat-anatomy.md`; stable anatomy/material contracts remain.

## S1 — Boxes with implicit identity transforms

Every base CAT_ANATOMY part SHALL have `kind: "box"` and exactly three finite,
positive args ordered width, height, depth. CatGeomKind SHALL be only `"box"`;
PartGeometry SHALL always return boxGeometry. The base table SHALL contain no
rotation or scale properties; runtime layers may add them.

### Scenario: validate base geometry
- Given the base table, when each part is inspected, then it has the box kind,
  three positive dimensions, and no own base rotation/scale.
- Given actual Model rendering, then no sphere/cone/capsule/cylinder geometry
  branch is used, and all33parts still render exactly once.
- Expected RED: the current rounded table/geometry switch fails these rules.

## S2 — Preserve33IDs and material roles

The exact33unique IDs and per-ID roles SHALL match the existing compatibility
manifest (also spelled out in the design's seed table), not a list derived from
whatever new table happens to be produced. No part is renamed, added or dropped.

| Role | IDs |
| --- | --- |
| primary | body, hipL, hipR, head, cheekL, cheekR, earL, earR, tailBase, tailMid, tailTip, legFL, legFR, pawFL, pawFR, pawBL, pawBR |
| secondary | chest, muzzle, earInnerL, earInnerR |
| eye | eyeL, eyeR |
| pupil | pupilL, pupilR |
| accent | nose, philtrum, padFL, padFR |
| whisker | whiskerL1, whiskerR1, whiskerL2, whiskerR2 |

### Scenario: compatibility control
- Given the pre-change manifest, when comparing the replacement, then IDs are
  unique, count33, set-equal and mapped to the same roles.
- Expected classification: preservation control, not a new-feature RED claim.

## S3 — Cat proportions, mirrors and frame

In rest anatomy, head center SHALL be above body center; body depth SHALL exceed
body width; each pupil height SHALL exceed its width (`args[1] > args[0]`).
Every L/R pair SHALL have opposite-sign equal-magnitude x, equal y/z/dimensions/
role, and corresponding mirrored parent links. Do not require literal seed sizes.

All box corners, not merely their centers, SHALL remain within model-local
x[-0.5,0.5], y[-0.32,1.25], z[-0.72,0.6] in rest and in the in-scope stress cases
of S7. Exclude the viewer/root model-scale/yaw/bob transform from this frame.
Admin headHeight/bodyDepth extremes are explicitly excluded in S8.

### Scenario: inspect actual geometry
- Given all mirrored hips, cheeks, outer/inner ears, eyes/pupils, whisker rows,
  front legs/paws/pads and back paws, then the mirror rules hold.
- Given rest dimensions and composed stressed transforms, when computing box
  corners, then the specified frame holds within numerical roundoff tolerance.
- Given a future visual refinement, then these inequalities continue to hold
  without changing a full-table numeric snapshot.
- Expected RED: voxel dimension-based pupil/body rules replace the current
  scale/rounded-shape assertions; some mirror/frame checks may already pass.
