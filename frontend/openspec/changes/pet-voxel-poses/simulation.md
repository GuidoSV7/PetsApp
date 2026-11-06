# Fixed-step pose simulation

## Public boundary

`new CatPoseSimulation({seed, reducedMotion?, cues?, library?})` owns a deterministic, renderer-free state. `enqueue(input)` copies an interaction outside the frame callback. Every input has an explicit future integer `tick`; invalid timing throws `Pose inputs require a future integer simulation tick.` before touching the queue or state.

Inputs cover successful care `{action, sequence}`, preview pose selection, pointer look/touch in degrees, petting feedback, motion preference and existing need cues. Successful care sequences are monotonic and consumed once. Neither the simulator nor animation replay invokes HTTP, audio, storage or gameplay mutation.

`step()` advances exactly 1/60 second. `advance(seconds)` accumulates display time, performs all complete fixed ticks, then returns an interpolated frame. A resumed tab contributes at most .25 seconds per display callback; excess wall time does not fast-forward simulation-time sleep. `sample(alpha)` interpolates previous/current quaternions and root coordinates in reusable buffers. Returned frame/buffers are borrowed: copy them only when retaining an external snapshot.

### Needs synchronization and runtime lifetime

Non-geometric Model need updates use the existing `cues` input at the next
simulation tick; they are not a new simulation epoch or a wake action. Model
memoization must not replace an equal rig merely because dirt/behavioral cues
changed. Sleep hold, clock, queued intentions and consumed care remain owned by
the existing Core. Genuine morphology preparation starts from authoritative REST
and retains that Core through `prepareCatPoseSimulation(..., current)`.
`rebindLibrary` changes only prepared references: previous/current base samples
and their layered rotations move from the old authored stable/edge reference to
the new one at the same phase. Local deviations, bridge age/source deviation,
active/queued goals, reaction age, sleep deadline, springs, gaze, idle scheduler,
input queue and fixed clock are retained. Driver/renderer fractional accumulation
is not reset. No simulation tick, care event, RNG reseed or generic snapshot is
created by rebinding. New-rest Bind is calibrated before its library is installed.
See [the scoped lifecycle proof](renderer.md#authoritative-morphology-rebinding).

### Sampled contact time

For normal motion, the posture ID, directed edge, phase progress, support mask
and posture-extension visibility describe the **same interpolated geometry**.
A finishing edge remains active until its endpoint is sampled, even when the
authoritative tick already starts the next edge. A redirected/restarted base
snapshot is not mistaken for edge completion; a real eighteen-tick bridge
completion does interpolate to its endpoint. The fixed-step completion flag is
explicit, not inferred from coinciding pose IDs.

The frame's `tick` remains the authoritative **integer** simulation tick.
`sample(1)` retains current-tick behavior. Gesture feedback stays current;
reduced motion returns the stable current cut at every alpha without a fade.
This timing correction does not compile morphology-specific transfer FK or
supply a physical interruption/contact context: those remain adapter work.

All degree tables, complete edge tracks and 49 routes are compiled once outside the frame path. Interpolation, masks, idle cursor, filters and springs reuse storage. Exact interpolation endpoints copy rather than normalize again, preserving the precise interruption snapshot. Uninterrupted playback uses the authored track once, never a second whole-edge easing.

## Optional prepared data and additive breathing — bounded S↔L

`CatPoseLibrary` supplies stable bases, directed tracks and routes. Omitting it
uses the original shared tables. The public default differential checks44 cases,
10,560 fixed ticks and52,800 interpolated samples with `Object.is` on every field:
zero differences against the pre-injection simulator class using the same catalog.

`prepareCatPoseSimulation(resolvedSkeleton, options, actualBind)` compiles/caches a
private S↔L FK library, configures that actual Bind and constructs this same simulator. It does not mount the renderer or
start another playback clock. Reference compilation starts from resolved A1 binds,
not displayed nodes/history; analytic IK is used only for grounded reference
configurations. Airborne intervals are quaternion FK. Supported references use
one canonical twist seed, so release does not inherit unrelated authoring twist.

Injected frames become the authoritative `base` inside the core, before gestures,
idle, gaze, breathing and springs. Existing interruption snapshots therefore see
the actual compiled base. Optional visibility tables expose forearms/shins during
transfer, including interpolated samples, while retaining stable endpoint masks.
No event, intent, route, reaction or clock rule is replaced by the library.

Core still consumes ONLY the nominal breath1 base. `PoseTrack.breathFK` stores81
cached reference/FK variants over .99..1.01, covering the existing awake amplitude
(.01×idleAmp .25..1) and sleeping amplitude (.006). The compiler solves only
actually supported reference feet; free trajectories interpolate authored FK.
Bind applies `inverse(nominalFK) * variantFK` as an ADDITIVE local body-surface
rotation before LAST support IK, using reusable quaternion scratch. No joint
translation/scale, root/goal search, display history or second clock is introduced.
The frame/base buffers and parent affine breathing/anchor transform are unchanged.
No-library and breath1 bypass the delta. Prepared nonfinite/out-of-range breath
throws `Breathing FK input is outside the compiled physical range.`; it is never
clamped or suppressed.

The historical eight-case breath RED is corrected on the real public prepared
before/after release AND landing paths. Strict1e-6rad/.001unit tests pass at knots
and all80 interval midpoints across four profiles; largest observed midpoint
rotation error8.162e-7rad. Twenty-four fixed-tick/quarter-frame physical sweeps
pass with original, opposite-phase awake and offset sleep-rate breath signals.
This is finite interpolation proof, not an exact arbitrary-input guarantee.

**The prepared library is not accepted for general motion.** Physical interrupted
bases need an explicit additive handoff context: they need not equal the nominal
edge sample used by this cache. Proximal/interbody clearance, remaining arcs and
renderer/browser/physical-device CPU gates are still pending. Do not compensate
by recapturing goals/history or applying IK to released feet. See
[renderer.md](renderer.md) for current evidence and per-spec limits.

## Layers and interaction

The base is 22 local xyzw quaternions, xyz root offset and independent unwrapped heading. Masks are layered afterward. An interruption captures ONLY this base, not a head gesture, look offset, breathing or spring contribution. Redirection waits until the next support-phase boundary or18ticks/300ms, whichever is sooner. Touch updates look targets and interested ears on its next tick regardless of that wait. Outgoing care masks fade separately over9ticks to avoid a visible head snap; their plate hides immediately on cancellation.

An incoming goal stays pending until its route actually starts: it does not
rename the active route's endpoint. Finishing the old support segment displays
that real endpoint without starting the incoming action's reaction. A newer
immediate route consumes/cancels any older queued intent. Reduced motion still
cuts to the newest pending intent. This prevents premature sleep and replay of
an obsolete goal at an endpoint.

### Shared-leg interruption (S4/S7/S8, bounded S35 correction)

At the existing support deadline (next phase boundary or18ticks, whichever is
sooner), a changed destination whose legal route starts with the active nominal
edge replaces only the route suffix. Core retains that edge's age/base, contact
phase, prepared breathing FK and visibility. It does not choose a nearby stable
endpoint and restart a blend under the next edge's support schedule. An already
bridged edge and a repeated identical goal keep their previous behavior; reduced
motion bypasses this continuation and still cuts immediately to stable rest.

The public default100/seed13 witness starts seated→sphinx at tick1, requests
standing at25 and successful sleep sequence2 at26. Sleep supersedes standing and
keeps seated→sphinx→side→curled. Previously redirection captured an unfinished
base as though sphinx had arrived, then declared belly support at
−.28527777777777774: Bind correctly rejected it. The correction changes route
selection, not Bind's floor/reach guards, goals, calibration, authoring or IK.

`cat-pose-interrupted-support.test.ts` retains the exact twenty fixed callbacks
and measures rendered structural BOX contacts≤.001, floor≥−.291, unit joints,
zero unreachable supports, applicable planted drift≤.001 and body floor support
through fixed/fractional continuation. It also pins newest sleep/stale-care
behavior, uninterrupted S→F, above-floor belly rejection and reduced cuts.
Sleep feedback remains current-tick state: at a fractional arrival sample,
authoritative curled/sleep may coexist with the finishing side→curled geometry.
This is not a seed/RNG change or permission to relabel the interpolated posture.

Scoped verification:2 new tests,74 unchanged runtime-consumer tests and7 retained
lifecycle tests pass; types and installed scoped lint pass. A frozen-own-before
public differential compares700 callbacks (uninterrupted route and unchanged
care/support/morphology-rebind branch), with exact frame/world/goal/revision
values:0 differences. This closes only the named B1 witness, not arbitrary
interrupted blends, B2 scale calibration, whole-domain or visual acceptance.

Look clamps to horizontal ±45° and vertical −25°..+20°. Pupils lead (80ms filter); head and neck follow at180/240ms, bounded to25°+20° yaw. Feeding owns the downward head mask, sleeping neutralizes gaze. Actual pupil white-margin/raycast constraints belong to the renderer adapter.

The original seeded blink and ear-tic sequences are retained via an incremental cursor; no growing per-frame replay loop. The old direct tail sway is NOT applied. Three bounded, independently damped tail springs receive idle targets; ear/head secondary springs settle independently and are not reset by interruption. Existing morphological droop/dirt/slim cues remain in the resolved bind, not double-added as pose rotations.

Breathing is .4Hz awake and .3Hz asleep, 1% and .6% initial surface amplitudes (awake amplitude follows existing idle-energy scaling). It is a surface signal, never a global root bounce. Support IK still runs LAST in the future adapter.

## Care and motion preference

- Feeding enters quadruped, reveals a stationary cached plate/jaw/tongue, runs three chew cycles across2.4s, closes the mouth and returns legally to the prior rest. The renderer must absorb the existing play pulse, not layer it twice.
- Sleep enters side or curled (explicit seed choice), routes seated→sphinx→side→curled when curled is selected, then has a2s quiet reaction and holds for up to60simulation seconds. Touch/new care/timeout wakes through the graph toward seated, never a standing teleport. Touch retains squint feedback and existing caller-owned purr.
- Bathing uses a stable seated/quadruped base:1.2s sideways ears followed by .45s tapered shake. Sampled `bathRoll` carries only its additive torso roll (including outgoing9tick fade), never Core.base. Bind's bath-only vertical compensation derives from true REST lengths/fixed goals and current upper origins; body/head shake timing, frequency and .04/.20 amplitudes remain unchanged. For seated rear hips, it also retains the REST upper-to-ankle span: extra hidden-shin extension cannot supply a visible hip-to-paw bridge. The existing visual-fit weight blends that body-authoring bound back to full-chain reach through transfers; it does not change IK lengths or goals. Preview owns torso/head support geometry and masks this gesture/compensation only there. The full sampled default bath domain now passes reach, floor and rendered contact; see the [scoped correction](renderer.md#bath-rendered-contact--scoped-correction). This is not whole-T4 or final visual acceptance.
- Play is one .8s real jump (S31), not an in-place replacement gesture. Its stable seated base is unchanged. Ages1–7 prepare with a small supported downward flex (up to .006); age8 explicitly releases all feet at zero height; ages9–23 fly with cached local limb FK; age24 replants the original fixed goals at zero height; ages25–47 absorb/settle with the same bounded downward flex before returning legally. The downward gesture changes real supported leg angles through LAST IK, not Core.base or the stable route tables. Root Y follows a sin² arc peaking at .04 at age16; root X/Z and heading stay fixed. `jumpPhase` travels with sampled geometry, including fractional release/landing frames. The plan explicitly has no foot OR body support in flight; null drift there is legitimate, not a planted-support pass.
- Setup compiles81 seated supported release references over the full .99..1.01 breath range. Bind samples only local FK during flight, never airborne-target IK. Preparation, landing and settle retain LAST-layer support solving and its unchanged reach/drift checks. The seven stable bases/thirteen graph edges are untouched.
- Care/pose/touch cancellation during release/flight waits for the short16tick landing span before redirecting (≤18ticks including display interpolation in the bounded checks). Gaze/ears still respond immediately. Reduced motion cuts to supported stable rest and suppresses the jump; petting is not routed into this jump mechanism. Existing petting bounce authoring is unchanged.
- A reduced-motion cut consumes the latest deferred care/pose intention instead of dropping it. It applies the stable target immediately, whether care precedes the cut or follows the preference input at the same tick (the actual renderer ordering). Duplicate care sequences remain consumed once.
- Authoring preview owns its sampled base height/supports and clears gameplay jump metadata and lift. Concurrent PLAY continues in Core but cannot reinterpret a non-seated static pose or edge as a seated jump. This is preview precedence only, never a fallback in the ordinary game path.
- This remains a partial T4 checkpoint: bounded PLAY/lifecycle/handoff proof is green, not whole-feature/browser-device/owner acceptance. See the current [renderer checkpoint](renderer.md).
- Reduced motion cuts directly to a stable final pose, no fade/breath/spring/shake/hop/sway; blink and squint feedback remain. Legal routes are traversed logically without intermediate rendered motion. Re-enabling motion starts springs at zero velocity and restarts the breathing phase, never resurrecting a suppressed pet/play hop or hidden gesture oscillation.

## Required integration proof, not claimed here

A transitional `supportMask=-1` explicitly means **unresolved transfer contacts**. It is NOT permission to release every foot or pass a zero-support drift test. The rig must resolve phase-specific supports, pin world-space goals with analytic two-bone IK after every additive layer, compensate rear ankles, check reach honestly and enforce the documented .001model-unit/.5projected-pixel tolerance at every rendered interpolation sample. Static non-foot poses still need underside/side/back support and collision checks.

This pure unit does not establish contact, no gaps/penetration, coat appearance, naturalness, actual WebGL draws, node-copy allocation cost, browser behavior or physical-device CPU acceptance. Those remain renderer/browser/owner gates. The admin preview must use this same core, not a separate animation implementation.
