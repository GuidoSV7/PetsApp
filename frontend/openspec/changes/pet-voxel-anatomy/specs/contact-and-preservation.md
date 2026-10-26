# Contact, compatibility and authorization requirements

Status: proposed. No geometry script, runtime test or browser result is claimed.

## S7 — Connected anatomy under in-scope transforms

Using actual dimensions and transforms composed through the parent chain, intended
neighbors SHALL touch or intersect without a positive gap beyond floating-point
roundoff. Parent links alone do not establish geometric contact.

| Physical adjacency | Purpose |
| --- | --- |
| body ↔ head, chest, hipL/R, legFL/FR, tailBase | Connected torso/head/support/tail origin |
| hipL ↔ pawBL; hipR ↔ pawBR | Rear paws connected to matching hips |
| legFL ↔ pawFL; legFR ↔ pawFR | Front legs/paws connected |
| pawFL ↔ padFL; pawFR ↔ padFR | Pads attached to front paw surfaces |
| head ↔ cheekL/R, muzzle, earL/R, eyeL/R | Head-mounted anatomy attached |
| eyeL ↔ pupilL; eyeR ↔ pupilR | Pupils remain attached to eyes |
| earL ↔ earInnerL; earR ↔ earInnerR | Inner layers stay attached to outer ears |
| muzzle ↔ nose, philtrum, whiskerL1/R1/L2/R2 | Face details attached to muzzle, even though parent is head |
| tailBase ↔ tailMid; tailMid ↔ tailTip | Connected tail segments |

### Scenario: rest and worst needs
- Given default headHeight/bodyDepth and neutral needs, then all adjacency checks
  hold in rest, using positions and scales along the complete parent chain.
- Given all four needs0, then the same graph remains connected, despite body
  slimming, head lowering and ear droop.
- Given each case with earSize0.6 and1.6 as well as default earSize, then contact
  remains valid; mirrored sides are tested, not inferred from one side alone.

### Scenario: rotated ear base
- Given maximum existing ear droop plus an extra0.25rad in the same droop direction,
  then the ear's transformed BASE FACE still intersects the head's actual box.
- Check both sides and earSize0.6/1.6. A world AABB overlap test alone is invalid
  evidence: rotated enclosures can overlap while the actual boxes/base do not.
- The inner-ear layer follows the exact same carrier transform; it must not gain
  a second droop factor or become detached from its outer ear.

### Scenario: synthetic blink
- Given open and near-closed positive eye-Y scale factors applied in a CPU-only
  test fixture, then pupils inherit once and remain attached, with eye/head and
  overall model frame preserved.
- These synthetic inputs SHALL NOT introduce blink/tic animation into runtime.

Contact tests SHALL evaluate geometric rules, not snapshot seed positions. Use
small numerical comparison tolerance, not a visual gap allowance. Runtime source
and the pure helper must agree; a separate test-only tree is not sufficient.
Expected classification: geometry/hierarchy regression proof after meaningful
RED; no claim that a missing-helper collection failure is functional RED.

## S8 — Preserve admin tuning semantics and isolate excluded extremes

Admin bodyDepth, headHeight and earSize targeting/formulas SHALL remain unchanged.
Only body, head and outer ears own the existing respective tuning transforms.
Children follow by hierarchy; no extra child-owned factor is introduced.
The home SHALL continue using explicit default design, not browser-local preview
settings. Persisted admin schema/keys/defaults SHALL remain unchanged.

### Scenario: tuning compatibility
- Given default design, then modelScale and all existing resolver expectations
  remain unchanged.
- Given headHeight/earSize adjustments, then child-owned values stay unchanged
  while composed descendants follow the parent once.
- Existing `test/features/admin/cat-design-settings.test.ts:37–64` assertions stay;
  new inheritance assertions complement them, not replace them.

### Explicit follow-up, not acceptance

Admin headHeight +0.25 and bodyDepth0.7 may leave gaps between independent roots
in the browser-local preview. Fixing those extremes is a separate change. Do not
restrict controls, change their formulas or alter home isolation to conceal them.
S7 uses default headHeight/bodyDepth; the earSize range remains in scope.

## S9 — Preserve viewer and experience

Preserve all IDs/roles, cue formulas except redundant child ownership, coat
palette/material mapping, root motion, viewer, camera, OrbitControls,
ContactShadows, CAT_MODEL_SCALE, home, interactions and purring. No GLB path,
new rendering dependency, coat patterns, accessory feature or adaptive resolution
is introduced. Base geometry changes do not authorize a material/palette redesign.

### Scenario: preserved scale contract
- Given this proposal, then CAT_MODEL_SCALE and its retirement regression test
  remain unchanged. The user's conditional fallback assertion is unnecessary
  unless a later authorized visual decision changes scale.

### Scenario: experience controls and later browser proof
- Run existing home/admin/Viewer/interaction/purring/retirement controls later;
  identify which mock Model/Viewer and do not call them geometry proof.
- A later real-browser check shows the sitting voxel cat in the unchanged viewer,
  uses existing camera behavior, checks orbit/click/care/purr interactions and
  default/admin preview separation, and records screenshots/console evidence.
- No idle movement, patterns or adaptive-resolution work is included.

## S10 — Planning now; authorized TDD/RDD later

This step SHALL create only proposal/design/specs/tasks Markdown under this change
folder. No source/test edits, fixture scripts, installs, build artifacts, commits,
push or new native review authority are authorized now.

### Scenario: honest planning delivery
- Verify spec coverage, paths/links,33-ID/role completeness, parent mapping and
  that only the six planned documents were created; record actual structural
  check results separately from future tests.
- Leave implementation/RED/GREEN/browser/RDD tasks unchecked. The user's supplied
  script verification is attributed to the user, not presented as an executed run.
- After later implementation authorization, observe meaningful rule-level RED,
  GREEN and preservation controls; do not count missing-module collection errors
  or mocked-away rendering as anatomy proof. Use applicable RDD with fresh scope
  declarations/consent, never a previous GLB/backend receipt.
- No commits in this step. Any future authorized commit uses Conventional Commits
  and contains neither `Co-authored-by` nor `Generated with…` attribution.
