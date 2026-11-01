# Prepared stable side, curled and belly-up

**Stable D/C/B pass the bounded physical endpoint gate. T4 remains partial and
unmounted. Connecting arcs remain provisional and unaccepted.** No raw catalogue
row, track, graph, Core/type/schema, anatomy or old assertion was changed.

## Calibration: immutable rest, not displayed history

`prepareCatPoseSimulation(skeleton, options, actualBind)` adds three per-rig stable
bases to the same library after existing SL/F/SF/QF setup. It does not replace a
sampled base in Bind or introduce another clock/controller.

The setup compiler composes authored normalized quaternions with immutable rigid
rest joints. For a body box matrix M, its lower world extent is calculated once:

`M[13] − (abs(M[1])*width + abs(M[5])*height + abs(M[9])*depth)/2`.

RootY is the rest-derived neutral paw floor minus that oriented body extent.
This is a closed-form geometric projection, not a root search, sampled fitting,
live adjustment or node/history capture. All root X/Z offsets stay zero. No
foot, airborne target or iterative IK is used in the new stable compiler.

| Pose | Actual authored geometry | Real supporting surface |
| --- | --- | --- |
| D/side | Root roll90°, horizontal torso; loose bent legs; head counters the side roll; relaxed tail. | Body −X face and lower hip proximal cap. |
| C/curled | Same side support, but all four limb chains fold more tightly, neck/head turn inward and tuck, all three tail segments curl. | Body −X face and lower hip proximal cap. |
| B/bellyUp | Root roll180°, torso pitch45°; paws relaxed above the abdomen, head/ears and tail folded clear of the floor. | Body +Y back face at its rear edge, **not the floating hips**. |

Body itself bears support in every case; zero feet is not treated as support by
itself. Existing actual body+hips validator remains unchanged. Limb orientation
is authored from rest bone directions, not an airborne point-target solve. All
wrist/ankle seams use existing rigid bindings and bounded fitting unchanged.

Measured nominal roots / body floor (model space):

| Profile | D/C rootY | B rootY | Body floor |
| --- | ---: | ---: | ---: |
| default hunger0 | −.0482 | .3018785781335847 | −.29 |
| default hunger100 | .0200 | .36254833995939056 | −.29 |
| compact hunger0 | −.0482 | .23734801328250038 | −.29 |
| deep hunger100 | .0200 | .5280113267570425 | −.29 |

## Real affine breathing

Bind's existing scalar affine transform remains `y + (y−anchor)*(breath−1)`.
Only its rest-authored anchor selection changes:

- Null/belly support: original immutable bellyY, with **exact old arithmetic**
  and outputs for S/Q/L/F and all seven accepted directed arcs.
- Side support: body centerY. The actual side-face center stays fixed while the
  cross-section expands along the floor, rather than translating the whole body.
- Back support: body topY. The actual rear/back contact edge stays fixed while
  expansion proceeds away from the floor.

The same transform applies to body/chest positions, torso-child surface
attachments and torso-owned accessory anchors. Body/chest scale visibly changes;
all joints remain unit scale. No suppressed/clamped breath, root bounce, joint
stretch, frame/base overwrite or per-frame allocation is introduced. Existing
breath-FK sampler, contact validation/protocol, LAST IK and skin fitting are
unchanged. Old S/Q/L/F world outputs are checked bit-for-bit, not presumed.

## Executable proof

Evidence root:
`.git/agent-evidence/a2-cat-poses-implementation/renderer-phase-7-lying-rest/evidence/`.
Every execution retains pre-run runnable source/test/config/lock/private-runner
snapshots and raw stdout/stderr/exit/hashes; earlier evidence is immutable.

- Genuine initial RED88 through existing public preparation/Bind: false side/back
  body support, not import/scaffold failures. First implementation68 pass/20 fail:
  compact side head floor−.35084823387248826; compact curled−.33563683319653015.
  Corrected neck/head counter-roll/tuck, not root height or tolerances.
- Final dedicated88 GREEN/no skips:36 fixed-breath cases (.99/1/1.01),24
  updated/cold nonidentity parent cases,4 distinct geometry/four-limb-fold cases,
  12 fixed-surface/attachment breath cases and12 normal-motion120tick sweeps.
- Live sweeps use actual Core breath and alpha0/.25/.5/.75/1:7,200 applications.
  Assert authoritative base/rotations immutable, explicit finite XYZ visible
  corners, floor≥−.291, body support−.29, honest feet0/unreachable0/null drift,
  unchanged goals/revisions, unit joints, visible breathing, coherent neck/back
  attachments and oriented wrist/ankle caps. Cold translated/yaw/uniform-scale
  parents use the actual rest-derived world floor, not a guessed height.
- Prepared differential versus runnable admitted96a71 snapshot, same current
  dependencies: all seven accepted SQ/SL/SF/QF directions, four stable S/Q/L/F,
  7,400 route+48 stable samples,476,672 node comparisons, **zero differences**
  in frame fields, local/world transforms, visibility, diagnostics and revisions.
- QF36/SF48/supported36/staticF26/immutable144 pass without skips. Three-file
  SQ/protocol/library40/84filtered and separate original QF12/84filtered,
  SF24/72filtered, SL24/72filtered pass. Original full matrix is byte-identical.
- A combined60-case original-matrix run passed its assertions but exited1 on
  Vitest `onTaskUpdate` RPC starvation. Retained as failed evidence; corrected
  runner grouping to the three existing focused filters above, with identical
  60 cases/assertions and no test/config/timeout changes. Not called GREEN.
- Global types, focused installed lint and default44case/52,800sample differential
  pass; default comparison is not prepared lying-geometry proof.

Exact commands, current source identities, protected hashes and resource readback
are in phase7 `RESULT.md` / `final-identity.json`. Parent759/76 strict gate belongs
to committed96a71 only; no full suite/build/browser gate ran here.

## Cost and acceptance boundary

Additional retained numeric base storage:3×92×8 = **2,208 bytes/resolved rig**,
plus entry/object overhead. Bind retains two additional scalar anchor coordinates.
Four setup-only FK passes (one rest, three authored poses), no new FK family or
runtime solver. This is not a CPU, bundle or mobile-memory-budget measurement.
No dependencies/binary assets added.

S1/S4/S6/S10 are GREEN only for these bounded stable endpoints and preservation.
S5 sleep route is preserved but F↔D/D↔C/D↔B arcs remain unaccepted; all24 original
cases remain pending and were not blindly run. S7 Core semantics are preserved,
not physical interruption proof. S12 remains protected. Exact nose/tail coverage,
head resting contact, general interbody clearance/naturalness, reactions,
interruptions, reduced cuts, raw exports, mounting/browser/device/owner acceptance
remain separate. Curled is a distinctly folded destination, not nose-coverage or
whole sleeping-route acceptance. The +.005 upward witness is unchanged.
