# Prepared stable sphinx — bounded physical calibration

**Stable F is physically calibrated through the existing public factory; T4 is
still partial and unmounted.** Incoming/outgoing F transfers, interruptions,
interbody clearance and browser/device acceptance are separate, unaccepted work.
The raw, unprepared global sphinx catalogue row remains provisional. S/Q/L rows,
Core/tracks, graph, anatomy, solver and all original assertions are unchanged.

## Public path

```ts
const simulation = prepareCatPoseSimulation(skeleton, { seed: 13, reducedMotion: true }, actualBind);
simulation.enqueue({ tick: 1, kind: "pose", pose: "sphinx" });
simulation.step();
// This cut isolates stable calibration; it is NOT incoming-transition proof.
simulation.enqueue({ tick: 2, kind: "reducedMotion", value: false });
simulation.step();
actualBind.apply(simulation.sample());
```

The factory caches the complete resolved 22-quaternion F base in its existing
library and keeps static model-space F goals alongside it. Core consumes that
base before additives; Bind does not replace it behind Core. No new factory,
controller, clock, Core/tracks field or schema was added. The shared compiler
reference helper is the former S↔L rest-rig builder, reused without display input.

## Authoring and support

- Flat belly height, upright head/neck and folded hind limbs reuse the proven
  loaf configuration. F is not an alias: its front chains are genuinely supported
  forward and its extension mask is forearms only (`3`), with front support mask3.
- For each resolved forechain, measure actual rest lengths `a,b`. Choose
  `r = (a+b) - .05*((a+b)-abs(a-b))`, strictly inside the reachable interval.
  Keep neutral wrist X/Y and solve the positive forward Z component analytically
  from `r²-dx²-dy²`. Reject a nonfinite/nonpositive radius or non-forward goal.
  No fixed `+.1Z`, numerical/root search or clamped endpoint is used.
- A genuinely supported compiler reference extracts normalized local front
  rotations with the existing canonical twist seed and analytic LAST solver.
  Playback uses the same actual Bind; only the two planted fronts are solved.
- Belly corners really meet the floor. The chest is lowered with the flat torso;
  its shorter primitive is not falsely labelled as a second floor-contact face.
  Both paws stay flat, fixed and forward through breathing. All visible finite
  corners and oriented shoulder/elbow/wrist cap pairs are checked.

Observed neutral forepaw centers are Z=.31 in every profile. At breath1:

| Profile | Prepared center Z | Forward displacement | Toe Z | Body/chest-front Z |
| --- | ---: | ---: | ---: | ---: |
| default hunger0 | .414640155 | +.104640155 | .494640155 | .3154 |
| default hunger100 | .476877874 | +.166877874 | .556877874 | .4100 |
| compact hunger0 | .397034226 | +.087034226 | .477034226 | .21478 |
| deep hunger100 | .835404812 | +.525404812 | .915404812 | .6680 |

These are model/rest coordinates, not screen projection or world +Z after yaw.
They prove forward placement in the tested profiles, not owner-approved naturalness.

## Static configuration and model/world semantics

`CatPoseBind.configureLibrary(library, sphinxGoals?)` remains backward-compatible.
The optional buffer contains12 finite MODEL-space coordinates (four wrist/ankle
XYZ goals). Bind converts them once using its captured immutable rest-parent
matrix, then the plan copies/seals its WORLD-space F table. Caller arrays and
shared catalogues are never retained for mutation. Identical preparation is
idempotent; a different later F table is rejected. A morphology change needs a
new resolved rest Bind, not retargeting a planted foot. Runtime `applyPlan` still
enforces release before landing at a different active goal; setup does not move
active goals or increment diagnostics/revision counters.

`CatPoseContactPlan.configureSphinxGoals` is the world-space setup operation used
by Bind, not a per-frame goal controller. Input validation is shared. Rejected
configuration preserves prior library behavior, plan data, stored active goals,
diagnostics and revisions; tests also reapply the same live S↔L frame afterward.

Exact errors:

- `Sphinx goals require 12 finite model coordinates.` — wrong length/NaN/±Infinity.
- `Sphinx rest goals are immutable after preparation.` — changed repeated setup.
- `Sphinx rest geometry has no forward support radius.` — unsupported analytic geometry.
- `Sphinx reference has unreachable planted feet.` — failed supported reference.

Nonidentity proof covers all four profiles with translation `[1.3,.4,-.7]`, yaw
`.63` radians and positive uniform parent scale1.3, both pre-updated and cold
world matrices. Bind copies its immutable parent matrix AFTER the existing
Contacts rest-world update, not before it. Goals and the finite floor remain
world-correct at breath .99/1/1.01; local joint scales remain1. This is not
proof for a changing, tilted or nonuniformly scaled rest parent.

## Evidence and limits

New evidence only:
`.git/agent-evidence/a2-cat-poses-implementation/renderer-phase-4-sphinx/evidence/`.
Every run has pre-execution source/test/config/lock/private-runner identity and
raw stdout/stderr/exit. Old physical/math evidence and the parent brief are untouched.

- Genuine RED:22 assertion failures, no import/scaffold failure. Belly floor was
  -.278444928 instead of -.29; new setup arguments were ignored.
- Separate cold-parent RED:4 unreachable-forefeet assertion failures/22 filtered.
  Moving the matrix copy after the existing rest-world update fixes these cases.
- Final GREEN:26 tests =12 breath-extrema cases,4 normal stable-motion cases
  (120ticks ×5 interpolation alphas each),8 nonidentity cases and2 atomic setup
  cases. No filtered/skipped cases in this final stable-sphinx gate.
- Regression:40 passed/60 filtered across contact-plan, transfer AND frozen library
  files; separate S↔L24 passed/48 filtered; immutable144 passed/12files/no skips.
- Global frontend types and installed focused lint pass. Default differential
  rerun:44cases/10,560ticks/52,800samples/zero differences with shared current
  dependencies. It does not validate the new prepared F geometry.

New cached numeric F data is92 base values +12 goals =832bytes/resolved rig,
plus object and immutable-parent-matrix overhead. This is not CPU/bundle/device
measurement. No dependencies or binary runtime assets were added.

S1/S4/S5/S6 verified only for this stable prepared posture and tested domain;
full feature/transition/plate claims remain partial. S10 has genuine bounded
RED→GREEN and preservation, not full application/browser acceptance. S12 is
preserved. Next author the actual S→F/Q→F/F→S and lying-transfer boundaries;
physical interruptions and general clearance remain unaccepted. Do not mount.
