# Reduced motion, experience and authorization

Status: planning only. [Design](../design.md) / [tasks](../tasks.md).

## S8 — Reactive system preference, blink only in reduced mode

A client hook SHALL read '(prefers-reduced-motion: reduce)', listen for changes
and clean up the same listener on unmount. It SHALL NOT poll inside useFrame.
Use a stable boolean snapshot/subscription; SSR/hydration and missing matchMedia
fallback SHALL not access unavailable browser APIs.

When active, the pure sampler SHALL return only blink entries, or an empty record
while eyes are open. No tail/tic entries. The Model SHALL disable root idle yaw
and bob, retain static yawBias and preserve touch-driven hop/squash and modelScale.
Orbit controls remain usable; reducing idle motion is not disabling interaction.

### Scenarios
- Initial true/false preference and live false→true→false without remount; correct
  query, subscription cleanup, no post-unmount updates. Stable snapshot avoids
  needless rerenders/resubscription; server/hydration snapshot agrees.
- Reduced sampler keys are a subset of eyeL/eyeR, with normal/tired blink windows
  unchanged. Its pure outputs remain deterministic across toggles.
- Frame after enabling preference clears any prior tail/tic/root idle pose; blink
  continues. Returning to normal uses current bases/cues and the same mount seed.
- Touch reactPulse still yields existing hop/squash under reduced motion. Purring
  and exactly-once interaction callback behavior remain unchanged.

## S9 — Preserve existing experience and proof boundaries

Do not change IDs/roles/table/hierarchy/need formulas, palette, viewer, camera,
OrbitControls, ContactShadows, home/actions, admin schema/defaults/storage,
CAT_MODEL_SCALE, bounce or purr. No coat pattern/adaptive-resolution work, new
rendering dependency or camera-observer probe repair.

Existing anatomy, pure tree, numeric cue, admin inheritance, real-Model SSR,
viewer/home/interaction/purr/layout/GLB-retirement tests SHALL remain controls.
Missing random-module imports are collection failures, not functional RED.
SSR with useFrame stubbed and mocked-away Model/Viewer do not prove frame execution.

### Scenarios
- Prompt2 replaces the mandatory mounted harness with a standalone frame function
  tested on real Three Object3D/Mesh. Preserve old root behavior as a control;
  the real-Model test only proves connection of that function with its refs.
- Keep old Model SSR ancestry/33geometry/material/palette/base-offset checks.
  Frame tests execute writes into real Three objects, no Canvas; mounted harness
  optional. The separate connection test is not GPU/transform proof.
- No frame-driven rerender/state-setter/care API call. Component rerenders from
  actual preference/needs/design changes are allowed and expected.
- Later authorized verification records focused/full/build results, unchanged
  protected paths and baseline differentials for old shared behavior. Known SEO
  TypeScript diagnostics remain separately reported, never labeled passing.
- Actual browser motion/OS preference proof, if run later, uses isolated fixtures
  and the real scene; it does not depend on the old failed camera-uniform observer.
  No browser result or fresh exemption is inherited from the previous feature.

## S10 — Prompt2 implementation, meaningful TDD and fresh RDD without commits

Prompt2 authorizes implementation/verification of this validated plan, plus a
standalone frame body and8h performance measurement. Declare all intended files
at entry. Review records commands/results, S1–S10 RED/control classification,
measurement, captures and deviations. No commits. Independent verifier is
unexecuted/not approved for this candidate (HOME violation), explicitly accepted
by the human; if native RDD blocks for that or anything else, stop/report.

### Scenarios
- Structural validation covers document/spec coverage and local links, proposed
  existing/new paths and unchanged tracked source/index/HEAD. Do not call that
  runtime geometry/timing/accessibility proof.
- Check tasks only after observed outcomes. Measure8h sampling per-frame on VPS;
  >~0.5ms requires deterministic per-mount event memory plus equivalence test
  against from-scratch same seed/time; otherwise add no cache.
- After separate implementation authorization: meaningful assertion RED before
  behavior, GREEN, controls and truthful full-scope fresh native review under the
  user-owned switch/consent. No previous receipt or omission decision is authority
  for this future candidate; any unavailable required proof is reported explicitly.
- No commits now. Any later authorized commit uses Conventional Commits without
  Co-authored-by or Generated with attribution. Push remains a separate decision.
