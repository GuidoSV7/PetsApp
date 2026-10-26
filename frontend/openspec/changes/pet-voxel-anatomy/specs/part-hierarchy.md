# Parentage and runtime composition requirements

Status: proposed; helper and recursive renderer do not exist yet.
See [design](../design.md) for the proposed internal helper shape.

## S4 — Valid base-relative hierarchy

CatPart SHALL gain an optional parent ID. The parent mapping SHALL be:

| Parent | Direct children |
| --- | --- |
| head | cheekL, cheekR, muzzle, earL, earR, eyeL, eyeR, nose, philtrum, whiskerL1, whiskerR1, whiskerL2, whiskerR2 |
| earL / earR | earInnerL / earInnerR respectively |
| eyeL / eyeR | pupilL / pupilR respectively |
| body | chest |
| tailMid | tailTip |
| pawFL / pawFR | padFL / padFR respectively |

Other parts remain roots. Each referenced parent SHALL exist; no self-parent or
cycle is valid. A pure helper SHALL build the tree using the immutable base table.
Child local rest position SHALL equal base child position minus base parent
position; root local position SHALL equal its base world position.

### Scenario: rest-world reconstruction without WebGL
- Given the33parts and exact mapping, when traversing the built tree, then each
  appears once, every parent exists and all chains end at a root without cycles.
- Given identity transforms, when summing local translations down each chain,
  then every reconstructed world position equals the base-table position.
- Given a fixture with a child preceding its parent in input order, then topology
  and offsets remain correct; the helper must not depend on parent-first input.
- Given the helper call, then input parts/positions remain unchanged.
- Expected RED: the current flat base has no required links/helper/recursive tree.

## S5 — Parent transforms propagate exactly once

Rendering SHALL use the pure tree. Every child mesh SHALL be nested within its
parent's transform-bearing node. Runtime child local translation SHALL be base
local offset plus that child's own resolved translation delta relative to base.
It SHALL NOT be derived by subtracting the runtime parent position.

Runtime scale/rotation SHALL be applied once as complete local values, defaulting
to identity when absent. Matrix composition SHALL include every ancestor. There
SHALL NOT be both a transformed wrapper and a mesh repeating the same transform.

### Scenario: inherited position
- Given a translated head with no child-owned translation, then eyes, pupils,
  ears/inner ears, muzzle/cheeks/nose/philtrum/whiskers follow it once.
- Given a translated child as well, then its own delta adds locally under its
  parent, without cancelling parent movement or accumulating a second copy.

### Scenario: inherited scale and rotation
- Given a scaled body, then chest inherits that scale once.
- Given a rotated/scaled outer ear, then its inner ear inherits those transforms.
- Given a scaled eye, then its pupil follows once, including synthetic blink.
- Given tailMid or a front paw transformed in a pure fixture, then tailTip/pad
  follows its parent. These fixtures do not add new runtime animation.
- Given the actual Model component, then recursive output contains all33meshes
  with their geometry/material ownership; mocking Model away is not proof.

## S6 — Needs formulas unchanged, child ownership removed

need-visuals SHALL stop applying its own chest slimming and its own earInnerL/R
rotation. Those parts inherit from body and outer ears. Preserve every other
cue formula/threshold and ordering after admin resolution: body slimming, head
lowering, outer-ear droop, dirty coat, idle speed/amplitude and retained behavior.

### Scenario: no double slimming/droop
- Given all needs0, then body has the existing computed slimming and chest's own
  scale stays identity/base; its world scale equals inherited body scale once.
- Given maximum existing ear droop, then outer-ear own rotation follows the
  existing formula; inner-ear own rotation stays identity/base and its world
  transform contains the outer-ear factor once.
- Given base scale absent, then the existing body-slimming test uses
  `baseBody.scale ?? [1,1,1]` without a non-null assertion.
- Expected RED: current chest/inner-ear branches fail ownership assertions;
  unchanged cue numeric expectations are preservation controls.
