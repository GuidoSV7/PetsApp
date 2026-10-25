# Design: seeded idle motion and base-face pivots

Status: implementation authorized by Prompt2; no commits. Results belong in review.md.
Baseline: `6bde6001f94bb891c2156b0bae5574b3223c0901`.

## 1. Data flow and exact edit inventory

Keep:
CAT_ANATOMY → resolveCatAnatomy(admin) → applyNeedVisualsToAnatomy(needs)
→ existing base-local transform → new complete pose composer → nested meshes.

The pure idle sampler supplies only deltas to the last composer. Read raw elapsed
seconds once in the existing useFrame. Do NOT pass the root's already-speed-scaled
time to a sampler that multiplies by idleSpeed again.

| Runtime file, under src/features/pet-home/ | Planned change |
| --- | --- |
| new `cat-idle-motion.ts` | Pure seeded schedules and sparse deltas for exactly six permitted IDs. |
| new `use-reduced-motion.ts` | Client media-query snapshot/subscription/cleanup, no frame polling. |
| existing `cat-part-tree.ts` | Add pure `resolveCatPartPose(node,resolved,delta?)`; retain existing exports/behavior of buildCatPartTree and resolveCatPartTransform. |
| new `cat-idle-frame.ts` | Testable frame body: sample, compose and write all six meshes and root; return current bounce. Receives actual objects/refs and current data. |
| existing `components/Cat3DModel.tsx` | Stable mount seed, hook and refs; connect useFrame to the frame function. No duplicated frame logic. |

Protected: anatomy data/types/parents, need-visuals formulas, admin resolver and
storage, viewer/lights/camera/OrbitControls/ContactShadows, home/actions/purr,
pet layout/scale, palette, session/API/backend, packages/lockfiles.

## 2. Pure sampler contract

Illustrative API, not an implementation:

```ts
sampleCatIdleMotion(elapsedSeconds, cues, { seed, reducedMotion })
  // sparse record: eyeL, eyeR, tailMid, tailTip, earL, earR only
  // optional local rotation delta, position delta, multiplicative scaleY factor
```

Inputs are finite nonnegative mount-relative elapsed seconds, existing cue values,
an unsigned32-bit seed and a boolean. No clock, Math.random, DOM, storage, timers,
React or mesh mutation inside this module. No new input-error API is proposed.

Identity: position/rotation delta0, scaleY factor1. Missing entries mean identity,
NOT “retain last frame”. No pupil/inner-ear/root/body entries. Position compensation
belongs in the geometry-aware pose composer; no duplicate dimensions in schedules.

### Seeded timing recommendation

Use a small documented32-bit generator, e.g. LCG
state=(1664525*state+1013904223) modulo2^32; use Math.imul for the low32bits and
u=state/2^32. Separate deterministic streams for blink timing, tic timing and side
selection so consumption in one does not alter another. Pin algorithm/stream
derivation and independent expected timestamps before implementing tests.

Every blink cycle starts open: open_i=low+(high-low)*u_i, then the fixed closed
duration. Every tic starts after its sampled interval; subsequent intervals are
between ONSETS, not an interval plus another0.18s. Side selection chooses one ear
per event; no alternating-side requirement was requested.

All active intervals are [start,end): inclusive start, exclusive end. Hold exact
closed factor0.1 / tic delta+0.25 throughout the specified duration; no unspecified
extra opening/closing/easing phases. Timing is in raw seconds: do not stretch
blink/tic windows by idleSpeed. Only tail/root formulas use the numeric speed.

For illustration, an unshifted LCG stream at seed0 has first u=1013904223/2^32;
its first normal blink begins at3+3*u, tired at2+2*u. This is an algebraic example,
not an executed fixture or a requirement to expose generator internals publicly.

A direct pure prefix walk is the initial design. Measure per-frame sampling at
8h elapsed on this VPS and record method/results in review.md. If it exceeds
~0.5ms, add a deterministic PER-MOUNT event memory and compare its outputs against
from-scratch sampling for the same seed/time, including profile/time-order changes.
Otherwise add no cache. No global cache, repeating tape or timeline truncation.

### Needs transitions

Use the current energyLow/funLow profile at the same mount-relative time, with the
same seed. Reconstruct that profile's schedule from the same origin; do not reseed
or reset time on rerender/preference changes. A transition can shift event phase;
continuity of an already-active event is not promised. A history-preserving
scheduler would need an explicit different contract rather than accidental state.
Tail formulas always use current numeric cues; no separate severity mapping.

## 3. Tail targets

Let a=0.25*idleAmp and w=2*idleSpeed:
midAbs=clamp(sin(t*w)*a,-0.35,0.35);
tipAbs=clamp(sin(t*w-0.6)*a*1.3,-0.46,0.46).

Emit mid local Z=midAbs and tip local Z=tipAbs-midAbs. Clamp the ABSOLUTE targets
before subtraction, not the resulting local tip angle. Preserve all other base
components. Bounds refer to the reconstructed model-local absolute angles,
excluding whole-cat root yaw/bob/scale.

## 4. One geometry-aware pose composer, no pivot wrapper groups

Keep the old base resolver untouched. The new pose composer first calls it ONCE
on the raw current resolved part, obtaining unpivoted local center p0, Euler r0
and scale s0. Then form:

- p=p0+idlePositionDelta;
- r=r0+idleRotationDelta component-wise in the current XYZ convention;
- s=(s0.x,s0.y*scaleY,s0.z);
- c=(0,-boxHeight/2,0) for earL/R and tailMid/Tip; c=0 otherwise;
- q=S*c; finalPosition=p+(q-R*q).

R is the complete final rotation, including existing ear pitch AND signed roll,
not just a tic quaternion. Matrix form:
T(p+S*c) · R · S · T(-c).
The same lower-face point maps to p+S*c before/after rotation, while zero rotation
preserves the current center even when earSize changes. Compute q-R*q first so
identity rotation introduces no rest-position roundoff drift.

Apply the final position/rotation/scale to the SAME mesh. Geometry and descendants
therefore share its carrier transform. No wrapper insertion between parent and
child meshes; no reparenting, moved geometry origin or modified base offsets.
Never feed an already-compensated pose back into the composer: that double-pivots.

JSX uses the new composer with identity idle input, so existing need ear droop
hinges even before the first frame. Frames use that SAME composer on raw current
resolved anatomy plus idle input. The old resolver remains available unchanged
for its compatibility tests.

### Tail joint and whole ear-base proof

Rest tailMid top Y=0.31+0.32/2=0.47; tailTip bottom Y=0.53-0.12/2=0.47.
Its local lower-face anchor is exactly the parent's upper-face center. Keeping
both lower-face pivots fixed gives coincident world joint anchors after composing
the actual chain, even when tip local rotation differs. Assert actual face contact,
not equality of rotated face normals or AABB overlap alone.

Ear rest hinge Y=1.0-0.18/2=0.91; head top Y=0.7+0.5/2=0.95. These values derive
from the existing table, not new hardcoded animation dimensions. At default size,
transform ALL FOUR lower-face vertices into head-local space using actual complete
XYZ transforms for X=0.55+0.25 and mirrored Z=±0.1375. Check every coordinate within
head half-extents. This is a future assertion, not a passing result established
by planning. Head lowering/height translate descendants through the existing graph.

## 5. Model frame lifecycle and refs

Choose a fresh seed once for each committed browser mount via crypto.getRandomValues
OUTSIDE the pure sampler. Retain it across needs/design/preference rerenders; no
storage or module-global seed shared by tabs. Server-only structural rendering may
use a stable unused placeholder. StrictMode's development remount is a new lifetime;
do not claim cryptographic uniqueness or count render invocations as mounts.

Register/remove named refs for the six allowed meshes; retain the root Group ref.
Each frame samples raw elapsed time, gets current cues and CURRENT resolved
anatomy, composes poses and sets the six mesh transforms from scratch. No +=,
multiplication onto last frame, hidden animation cursor or per-frame setState.
Restore all six from identity deltas when absent, including reduced-motion changes.

No pupil ref is animated. Its existing need-owned local scale remains unchanged;
eye blink multiplies through the existing parent relation. Inner ears similarly
inherit one outer-ear pose.

For the root, preserve existing bounce decay/hop/squash and modelScale. Reduced
mode selects yawBias (static orientation) and bob0, so Y=-0.22+hop; normal mode
keeps current root formulas and orbiting behavior. Preference does not disable
OrbitControls or touch callbacks/purring. Per-part idle need not pause on orbit.

## 6. Reduced-motion subscription

Recommended hook uses React useSyncExternalStore: boolean matches snapshot,
stable subscribe callback for '(prefers-reduced-motion: reduce)', and symmetric
MediaQueryList change listener cleanup. No per-frame matchMedia calls.
Server/hydration snapshot is false; a client-only Canvas reads the actual client
snapshot before animated frames. Missing window/matchMedia yields false/no-op
subscription. Match client hydration to the server snapshot, then update normally.

React official reference consulted via Context7:
https://react.dev/reference/react/useSyncExternalStore
Snapshot stability, subscribe cleanup and consistent getServerSnapshot are
documented there. No React/Next/package change is needed.

## 7. Test inventory and proof boundaries

New:
- `test/features/pet-home/cat-idle-motion.test.ts`: exact seeded windows/sides,
  flags, absolute tail bounds, sparse IDs, determinism and reduced output.
- `test/features/pet-home/use-reduced-motion.test.tsx`: initial snapshots,
  live false→true→false, same-listener cleanup, SSR/missing API.
- `test/features/pet-home/cat-3d-model-frame.test.ts`: actual component/frame
  callback/ref integration, needs/design rerender, reset/no accumulation,
  current bases, root reduced gates and intentional bounce.

Extend without deleting existing assertions:
- `cat-part-tree.test.ts`: new composer's pivot math/identity; old exports intact.
- `cat-anatomy-contact.test.ts`: use production pose composer for existing24cases;
  keep SAT/frame/intersection/ownership checks; add stronger default ear-base
  containment and sampled animated tail-face joint checks.

Keep existing actual-Model SSR, anatomy/roles/parents/admin/cue/home/viewer/
interaction/purr/GLB-retirement tests as controls. Do not rewrite the table tests.

Prompt2 supersedes the mounted-harness requirement: extract the ENTIRE frame body
into cat-idle-frame.ts. Test it without Canvas using real Three Object3D/Mesh,
including all position/rotation/scale writes, no accumulation, reset, current bases,
reduced mode and preserved bounce. A small real-Model test only proves useFrame
connects that function with its root/six mesh refs and current data. DOM nodes in
that connection-only test are explicitly not a GPU/Three transform proof. A fully
mounted Canvas harness is optional, not a gate. Existing SSR controls remain.

New test: test/features/pet-home/cat-3d-model-connection.test.tsx. Frame tests live
in cat-3d-model-frame.test.ts and use actual Three objects, no host adapter.

## 8. Future validation and boundaries

Prompt2 authorizes implementation now, without commits: assertion-level frame/geometry RED, then pure
module/hook tests (missing-module collection failures separate), GREEN and focused
controls; full frontend suite/build; baseline differential for shared old behavior.
Record the known four SEO TypeScript diagnostics separately, never as a pass.

For UI verification later, use real browser/SwiftShader with isolated pet fixtures
and OS media emulation; record visible motion/attachments/reduced behavior without
repairing or depending on the old camera-uniform observer. No result claimed now.
Fresh native RDD under user-owned mode/consent, exact full scope declared below.
For THIS candidate the human explicitly leaves independent verification UNEXECUTED,
NOT APPROVED because its profile isolates HOME. Record that limit; if native RDD
blocks for this or anything else, stop and report. No retry/recovery workaround.
No commits, push or production access.

## 9. Complete intended candidate scope declared before runtime edits

- Runtime5: src/features/pet-home/{cat-idle-motion.ts,cat-idle-frame.ts,use-reduced-motion.ts,cat-part-tree.ts,components/Cat3DModel.tsx}.
- Tests6: test/features/pet-home/{cat-idle-motion.test.ts,cat-3d-model-frame.test.ts,use-reduced-motion.test.tsx,cat-3d-model-connection.test.tsx,cat-part-tree.test.ts,cat-anatomy-contact.test.ts}.
- Documents7: proposal.md,design.md,tasks.md,review.md and the existing three specs/*.md in this change.
- Evidence8: evidence/{idle-sampler-8h.json,differential-summary.json,webgl-smoke.json,home-normal-a-chromium.png,home-normal-b-chromium.png,home-needs-zero-chromium.png,home-reduced-a-chromium.png,home-reduced-b-chromium.png}.

All26paths are intended, including new/untracked paths. Local odd/ tracking and
owned temporary runner/browser scripts are excluded from the candidate. Native
INSPECT must select all intended untracked paths before START; no borrowed receipt.
Browser acceptance: normal two cat images ~1s apart with pixel difference; all-zero
needs with attached drooped ears; reduced two images ~1s apart with stationary
root/tail (blink allowed); no console errors in all three. Real temporary npx
Playwright/Chromium/SwiftShader/owned server only, no old camera probe.
