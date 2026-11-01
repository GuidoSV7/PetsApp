# Prepared pose-library data boundary

`CatPoseSimulation` accepts an optional `library: CatPoseLibrary` constructor
option. Omitting it and explicitly supplying `CAT_POSE_LIBRARY` produce the same
frames. The default seated bind remains the canonical A1 neutral.

A library supplies stable base records, directed fixed-tick tracks, and cached
legal routes. Each base has 92 numbers: 22 local XYZW joint quaternions, three
root offsets, and separate unwrapped heading. The simulator owns its frame and
interpolation buffers; the prepared library is borrowed and must not be mutated
after construction.

Injected tracks use the existing fixed-step engine, not another animation clock.
Their base participates in interruption snapshots before gesture, idle, gaze,
needs, and spring layers. `sample(1)` remains the authoritative current-tick
sample; interpolated contact metadata follows the existing sampled-time rule.

`PoseTrack.visibility` optionally supplies per-tick posture-extension masks.
`PoseTrack.breathFK` holds renderer-free cached breathing variants for a consumer
adapter; Core does not insert those variants into its base. Data injection alone
does not certify physical contacts, interruption bridges, rendering, or CPU cost.

Pure API tests: `frontend/test/features/pet-home/cat-pose-library.test.ts`.
The two tests retain the original pilot assertions: exact default-library parity
and actual injected-base consumption before additive/interruption processing.
The pilot's ignored-injected-base RED is historical TDD evidence; separating the
unchanged tests into this file is structural refactoring, not a new behavioral RED.
