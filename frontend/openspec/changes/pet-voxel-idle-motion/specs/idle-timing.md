# Deterministic per-part idle timing

Status: proposed. No implementation or timing result is claimed.
Design choices, timeline semantics and proof boundaries: [design](../design.md).

## S1 — Pure deterministic sampler and per-mount seed

The module SHALL accept elapsed seconds, existing NeedVisualCues and
{seed,reducedMotion}, and return only sparse local deltas for eyeL,eyeR,tailMid,
tailTip,earL,earR. It SHALL NOT read a clock, call Math.random, mutate inputs,
write meshes, access DOM/storage, or depend on previous sampler calls.

Rotation/position are additive local deltas; scaleY is multiplicative, identity1.
Omitted entries mean identity, not last-frame state. Pupils and inner ears SHALL
never be direct animation targets. The geometry-aware composer owns hinge-position
compensation; the timing module SHALL NOT duplicate anatomy dimensions.

Random durations/ear choice SHALL use documented independent seeded streams.
The browser Model SHALL retain one chosen seed throughout a committed mount,
including needs/design/preference rerenders. Independent mounts/tabs obtain fresh
seed choices; no shared persisted seed. Seed generation is outside the pure module.

### Scenarios
- Same inputs yield the same values, including after interleaved seeds, profiles,
  reduced flags and time sampled out of order. Inputs remain unchanged.
- Fixed distinct fixture seeds demonstrate different event windows. Pin exact
  expected boundaries independently of production schedule helpers.
- Source/runtime controls detect forbidden random/clock access in the module.
- Rerender existing Model with new cues/design/preference: seed remains stable;
  a separate mount requests a new seed. No claim of absolute collision-free RNG.
- Time is mount-relative RAWseconds. Only tail/root numeric formulas scale time;
  blink/tic durations SHALL NOT be divided/multiplied by idleSpeed.

## S2 — Blink eyes only with normal/tired windows

Every cycle SHALL start open with scale factor1 and then hold eyeL/eyeR scaleY0.1:
normal open3–6s, closed0.12s; energyLow open2–4s, closed0.35s.
Both eyes close together. Closed windows are [start,end). Outside a closed window
the sampler omits the eye delta; application restores current base scale.
Pupil-owned transforms remain unchanged and inherit eye-Y scale once.

### Scenarios
- Fixed-seed first and subsequent windows: test just before start, exact start,
  interior, just before end and exact end for both profiles. Assert exact keys
  and factors, not only interval bounds.
- Normal/tired open durations stay in their respective ranges and closed
  durations match0.12/0.35s exactly within numeric timing tolerance.
- Pupil IDs never occur in output. With existing pupil need scale, composed
  world Y includes eye factor once; pupil local need scale remains unchanged.
- Repeated samples at one timestamp do not close further or accumulate scale.

## S3 — Tail absolute targets, local tip difference and caps

Using raw t, midAbs SHALL be sin(t*2*idleSpeed)*0.25*idleAmp, capped to±0.35rad.
TipAbs SHALL be sin(t*2*idleSpeed-0.6)*0.25*idleAmp*1.3, capped to±0.46rad.
Mid local Z delta SHALL equal midAbs; tip local Z SHALL equal tipAbs-midAbs.
Apply caps before subtraction. No other rotation axis or scale is animated.

### Scenarios
- Known sample times/current healthy and tired cue values match the equations;
  no double speed multiplication. Current needs, not a captured old profile.
- Reconstruct mid/tip model-local absolute orientations from actual chain
  composition and check their own caps, including synthetic amplitude stress.
  Do not mistake the tip-local angle for its absolute angle or clamp it again.
- Reduced mode has no tail entries. Preference changes restore neutral tail pose;
  returning to normal uses the same seed/time origin, not a new schedule.

## S4 — Single-ear tic and boredom frequency

A tic SHALL add +0.25rad to X of exactly one outer ear for0.18s.
Sample onset-to-onset intervals5–9s normally,10–16s when funLow.
The first onset follows a sampled interval from mount time. Ear selection uses
a seeded stream; alternation is not required. Active windows are [start,end).
Preserve current base Y/Z, including mirrored need-owned roll. No direct inner-ear
delta. Energy idleSpeed SHALL NOT stretch the tic or lower its amplitude.

### Scenarios
- Fixed-seed exact onset/end boundaries, duration, side and at least two subsequent
  intervals for both normal/bored profiles; maximum one active ear at any time.
- Only the active outer ear gains +0.25X; inactive ear remains at its current need
  droop, and the active ear resets after the pulse.
- funLow/energyLow use the existing booleans; no replacement threshold/severity
  formulas. Current-profile changes retain seed/time origin. The design's
  stateless phase recomputation is explicit; no history-continuity claim.
- Reduced mode emits no tic. Disappearing sparse entries cannot leave an old tic.
