# Fixed-step pose simulation

## Public boundary

`new CatPoseSimulation({seed, reducedMotion?, cues?})` owns a deterministic, renderer-free state. `enqueue(input)` copies an interaction outside the frame callback. Every input has an explicit future integer `tick`; invalid timing throws `Pose inputs require a future integer simulation tick.` before touching the queue or state.

Inputs cover successful care `{action, sequence}`, preview pose selection, pointer look/touch in degrees, petting feedback, motion preference and existing need cues. Successful care sequences are monotonic and consumed once. Neither the simulator nor animation replay invokes HTTP, audio, storage or gameplay mutation.

`step()` advances exactly 1/60 second. `advance(seconds)` accumulates display time, performs all complete fixed ticks, then returns an interpolated frame. A resumed tab contributes at most .25 seconds per display callback; excess wall time does not fast-forward simulation-time sleep. `sample(alpha)` interpolates previous/current quaternions and root coordinates in reusable buffers. Returned frame/buffers are borrowed: copy them only when retaining an external snapshot.

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

## Layers and interaction

The base is 22 local xyzw quaternions, xyz root offset and independent unwrapped heading. Masks are layered afterward. An interruption captures ONLY this base, not a head gesture, look offset, breathing or spring contribution. Redirection waits until the next support-phase boundary or18ticks/300ms, whichever is sooner. Touch updates look targets and interested ears on its next tick regardless of that wait. Outgoing care masks fade separately over9ticks to avoid a visible head snap; their plate hides immediately on cancellation.

Look clamps to horizontal ±45° and vertical −25°..+20°. Pupils lead (80ms filter); head and neck follow at180/240ms, bounded to25°+20° yaw. Feeding owns the downward head mask, sleeping neutralizes gaze. Actual pupil white-margin/raycast constraints belong to the renderer adapter.

The original seeded blink and ear-tic sequences are retained via an incremental cursor; no growing per-frame replay loop. The old direct tail sway is NOT applied. Three bounded, independently damped tail springs receive idle targets; ear/head secondary springs settle independently and are not reset by interruption. Existing morphological droop/dirt/slim cues remain in the resolved bind, not double-added as pose rotations.

Breathing is .4Hz awake and .3Hz asleep, 1% and .6% initial surface amplitudes (awake amplitude follows existing idle-energy scaling). It is a surface signal, never a global root bounce. Support IK still runs LAST in the future adapter.

## Care and motion preference

- Feeding enters quadruped, reveals a stationary cached plate/jaw/tongue, runs three chew cycles across2.4s, closes the mouth and returns legally to the prior rest. The renderer must absorb the existing play pulse, not layer it twice.
- Sleep enters side or curled (explicit seed choice), routes seated→sphinx→side→curled when curled is selected, then has a2s quiet reaction and holds for up to60simulation seconds. Touch/new care/timeout wakes through the graph toward seated, never a standing teleport. Touch retains squint feedback and existing caller-owned purr.
- Bathing uses a stable seated/quadruped base:1.2s sideways ears followed by .45s tapered shake.
- Play is one .8s burst. Pet bounce is only seated/quadruped/loaf; lying petting squints without bounce. Root/support-preserving deformation is the adapter's responsibility, not a license to move planted paws.
- Reduced motion cuts directly to a stable final pose, no fade/breath/spring/shake/hop/sway; blink and squint feedback remain. Legal routes are traversed logically without intermediate rendered motion. Re-enabling motion starts springs at zero velocity and restarts the breathing phase, never resurrecting a suppressed pet/play hop or hidden gesture oscillation.

## Required integration proof, not claimed here

A transitional `supportMask=-1` explicitly means **unresolved transfer contacts**. It is NOT permission to release every foot or pass a zero-support drift test. The rig must resolve phase-specific supports, pin world-space goals with analytic two-bone IK after every additive layer, compensate rear ankles, check reach honestly and enforce the documented .001model-unit/.5projected-pixel tolerance at every rendered interpolation sample. Static non-foot poses still need underside/side/back support and collision checks.

This pure unit does not establish contact, no gaps/penetration, coat appearance, naturalness, actual WebGL draws, node-copy allocation cost, browser behavior or physical-device CPU acceptance. Those remain renderer/browser/owner gates. The admin preview must use this same core, not a separate animation implementation.
