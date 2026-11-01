# T4a partial integration — not renderer acceptance

The application still runs the unchanged legacy renderer. **Do not mark T4a done.**
`CatPoseBind` and `CatPoseContacts` are reusable scene-node adapters, not yet mounted
by `Cat3DModel`/`Cat3DViewer`. No A2 rendering, preview, plate lifecycle or browser
parity claim follows from their tests.

## Implemented boundaries

- `PetHomeStage` emits `{sequence, action}` only after its existing successful
  await and `applyState`. `pet` is excluded. Existing pulses, purr, coins, errors,
  busy state and API calls remain intact. Viewer currently does not consume this
  event, so the end-to-end visual care reaction is **not implemented**.
- `CatPoseBind` reuses `buildCatSkeleton`'s resolved rigid rest offsets and composes
  local pose deltas. It maps by exact joint ID (ears are not at the same indexes
  in the skeleton and core arrays). Only visual boxes scale. It resets transforms
  rather than accumulating them, then calls analytic support LAST.
- `CatPoseContacts` captures actual ankle world goals and actual rest knee poles
  once, applies upper/lower world-direction corrections, and removes parent world
  rotation at the ankle to preserve the rest-flat paw. It rejects unresolved
  `supportMask=-1`; it is **not a phase planner**. Unreachable radial endpoints
  remain explicitly counted and their actual drift is reported. An empty mask
  does not manufacture a drift measurement. Initial diagnostics are null.
- `solveTwoBoneSupportInto` uses caller-owned vector scratch and solution tuples.
  The original allocating `solveTwoBoneSupport` API delegates to it and retains
  all original validation/messages/default results. Neither scene adapter
  constructs vectors, arrays or quaternions during `apply`.

## Observed proof and limitations

Private raw evidence: `.git/agent-evidence/a2-cat-poses-implementation/renderer/`.

- Care RED: 5 real event assertions failed because Viewer received `undefined`,
  exit1. First GREEN attempt exposed a new-test endpoint typo (`/pet/feed` vs the
  unchanged `/pet/actions/feed`), corrected only in the test. Final 5/5, exit0.
- Support RED: actual paw center drift exceeded .001 at hunger0/tick5 before
  support was applied. An unrelated new-test mistake compared hierarchical scene
  map order with anatomy order; corrected to inspect `skeleton.bindings`, whose
  insertion order is the contract.
- First support GREEN attempt still failed at hunger100/tick27: upward .005 root
  travel is genuinely unreachable near the seated forechain's extension limit.
  **That upward-motion rule has NOT been fixed.** The test is now explicitly
  restricted to a reachable downward settle; a separate test requires .04 upward
  motion to report unreachable feet and drift >.001, rather than bless a clamp.
- Final bind coverage: 101 integer hunger values, all39 model-space rest matrices,
  22 unit-scale joints, 3 anchors, correct ear indexing and torso follow-through.
  Supported motion covers hunger0/100, .4/.3Hz visual breathing, ticks0..120 with
  half-tick samples, and a downward root settle of 0..-.01. Actual paw normals
  remain +Y and all four finite bottom corners remain at local floor y=-.29.
  These are real Three scene worlds, **not** the public React renderer callback.
- Final focused matrix: 172 tests/14 files, no skips, exit0. Includes the original
  IK/catalog/graph/simulation/plate and immutable A1 model/skeleton specs. Separate
  Viewer/free-care preservation: 48 tests/2 files, no skips, exit0. Private scoped
  TypeScript check: exit0. No full suite, lint, build, server or browser run.
- Raw output/exits are retained. Final source/config/lock hashes are captured in
  `identity.json`; RED source snapshots were not captured contemporaneously, so
  this is not a fully identity-stamped per-stage RED/GREEN transaction.

## Remaining implementation (not merely acceptance work)

1. Author physically reachable nonseated body/limb poses and world-goal phases,
   including belly/side/back support. Resolve every transfer mask, release before
   goal movement, never release all supports as a workaround. Sweep every directed
   edge and interpolated frame; current adapters intentionally reject transfers.
2. Fit visual limb boxes, breathing surface attachments and tail/head seams.
   Implement hinge/cap/surface and OBB clearance proofs; this document does not
   claim that arbitrary nonseated boxes are connected or penetration-free.
3. Connect fixed ticks, interpolation, LAST support and node copying to the actual
   Model, measure their full combined CPU time, preserve default legacy behavior,
   and explicitly select A2 from Viewer only once contact handling is complete.
4. Consume care sequences once without replay on Model remount; suppress a
   duplicate play pulse only when its **new** event sequence arrives, not whenever
   the stale event's action is play. Later pet pulses must still run.
5. Wire the single cached plate mesh, local pointer target/pupil limits, visibility
   lifecycle, shared custom22 preview controls and stable borrowed diagnostics.
   The parent is fixing the editor to copy diagnostics on Pause and to follow
   system reduced motion until an explicit local override. Renderer diagnostics
   must publish WHOLE-route normalized0..1 progress even with contacts OFF, and
   clear/update the borrowed object when route configuration changes so Pause
   cannot read an old route. This publisher is not implemented here. No editor
   or frozen-contract edit was made by this worker.
6. Run the actual public renderer/reaction/morphology/interpolation proofs before
   asking the parent to run canvas/draw/browser/naturalness gates. No projected
   pixels, 85/109 draws, mobile CPU or owner acceptance is claimed here.

## Spec verdicts for this partial handoff

S1 incomplete (no actual A2 app route); S2 incomplete (core exists, renderer not
wired); S3 incomplete (no combined frame CPU); S4 partial (rig solve, no phase
planner/all-transition/OBB proof); S5 inherited core only, renderer incomplete;
S6 incomplete (plate not mounted; limited bind breathing proof only); S7/S8
inherited core only, runtime integration incomplete; S9 Stage emission boundary
implemented, visual consumption incomplete; S10 partial (focused preservation,
no renderer/browser acceptance and incomplete per-stage identity); S11 preserved
(no publishing/production; owner video gate remains); S12 preserved within this
unit (original geometry/IDs/coat/A1 sources and public runtime unchanged).

Risk: item3 — shared renderer/public default remains pending integration and
independent review; .04 upward bounce and unresolved support masks are explicit
remaining source-level constraints, not passed contact gates.

Freighter remains untouched. On resumption, merge main with a merge commit
(no rebase) and place care-event emission behind its existing owner/epoch checks.
