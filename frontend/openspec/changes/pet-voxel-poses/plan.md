# A2 — Procedural cat poses and transitions

> **S19 controls acceptance.** Structural parent-child articulation contact/overlap within the existing .001 tolerance and unchanged floor/support are numeric gates; visible crossings require real WebGL front/three-quarter/diorama evidence. SAT/zone/pivot metadata are NONBLOCKING diagnostics, not rejection gates. C keeps a rigid torso, head hipward and independently authored same-side headward tails without a nasal/front-plane target. [Prepared C measurements](lying-poses.md) freeze actual connected-endpoint tip/head distances ±.005 and disclose immutable A1 neutral/decorative gaps. D authoring/tests/outputs stay frozen. Complete transitions/integration/browser/full gates and owner visual approval remain pending. Earlier contradictory S16–S18 criteria are superseded, not new requirements.


**Status: APPROVED for implementation with owner amendments recorded in `odd/tasks/a2-cat-poses.md`. No push or merge before owner video approval.** Branch: `plan/a2-cat-poses-transitions`, based on fetched `main` / `origin/main` at `70906fdb87e2279268901ee791afeb1371051dd2`. Implementation is frontend-only; no dependency, API, database or production changes.

Freighter T7 is **paused by the owner, not failed**. Preserve `feat/freighter-user-pet` at `31615747ea866438eb4a3887a9ff785901059e0b`; no rebase, deletion, push or merge. Its guide and review dispositions remain separate. Fresh resource audit found eight owned scratch paths absent, no matching processes, no listeners on 3102–3104 and no T2–T5 test databases. Native immutable review candidate views are retained evidence, not running test servers.

## 1. Scope and evidence boundary

Keep the approved choices: custom procedural animation, seven data-defined poses, directed transition graph, quaternion interpolation with intermediate poses, separate heading, interruption from the instantaneous **base** pose, fixed-step state, ordered layers, second-order springs, gaze, four care reactions, an admin pose editor and real-Chromium owner acceptance. No AnimationMixer or artist rig. Analytic two-bone support IK is now explicitly authorized as the LAST layer after springs; no gait, locomotion or navigation (A4). Do not use CCDIKSolver/SkinnedMesh.

Preserve all 33 original box IDs, six A1 extension IDs, 22 joint IDs and three accessory anchors. Preserve coat recipes/colors/camera suggestions, backend needs/actions/free care, API/database, authentication/roles/admin routing and landing. Implementation is authorized. Do not push or merge before owner video approval; if two rounds still look robotic, present toy style as a proposal ONLY, without implementing it.

### Observed source map

All paths in this table are relative to `frontend/`.

| Existing evidence | Relevant fact |
|---|---|
| `src/features/pet-home/cat-skeleton.ts:16–95` | Existing hierarchy already parents limbs/head through torso; D2 recompiles rest offsets against legacy world targets. Joints are rigid/unit-scale; visual boxes are separate. |
| `src/features/pet-home/cat-anatomy.ts:30–64` | 33 original boxes, +Y up, +Z forward, left = negative X. Three existing tail boxes, not a new tail mesh requirement. |
| `src/features/pet-home/cat-skeleton.ts:68–89` | `forearmFL`, `forearmFR`, `shinBL`, `shinBR`, `jaw`, `tongue`: allocated meshes, currently `visible:false`, no coat patches. |
| `src/features/pet-home/need-visuals.ts:43–79` | Hunger below 45 narrows body X/Z down to .78; admin bodyDepth also affects Z. |
| `src/features/pet-home/cat-idle-motion.ts:24–65` | Seeded stateless blink/tail/ear sampler; no fixed-step spring state yet. |
| `src/features/pet-home/cat-idle-frame.ts:27–59` | Current frame combines idle, root yaw/bob and intentional bounce. Reduced motion disables automatic motion, but currently retains deliberate petting bounce. |
| `src/features/pet-home/components/PetHomeStage.tsx:156–171,249–296` | Care success insertion point after awaited successful result; Stage forwards viewer/model props. Legacy HTTP-200 `broke` errors are already rejected by the service. |
| `src/app/admin/_components/design-3d/AdminDesign3DPage.tsx:37–153` | Existing four-knob design draft and preview; no hunger/pattern preview controls yet. Reuse existing route/guard. |
| `scripts/browser-evidence/README.md:29–36` | Historical A1 whole-home pixel gate was superseded by approved header changes. Do not reuse that whole-home image as current baseline or overwrite A1. |

### Exact rig contract

```text
joint-root
  joint-torso
    joint-neck -> joint-head -> joint-jaw, joint-earL, joint-earR
    joint-shoulderFL -> joint-elbowFL -> joint-wristFL
    joint-shoulderFR -> joint-elbowFR -> joint-wristFR
    joint-hipBL -> joint-kneeBL -> joint-ankleBL
    joint-hipBR -> joint-kneeBR -> joint-ankleBR
    joint-tailBase -> joint-tailMid -> joint-tailTip
```

Anchors stay `accessory-neck`, `accessory-head`, `accessory-back`, on their existing owning joints. No pupil joint or plate joint is added to this list.

## 2. Seven poses: authoring criteria, visibility and contacts

Numbers below are **initial authoring ranges/criteria, not validated final angles**. The owner explicitly permits editor-defined criteria instead of pretending untested angle tables are final. The editor exports a complete 22-joint degree table for each pose, including zero entries. Angles are local XYZ deltas from the resolved A1 rigid rest bind, converted once to normalized quaternions; root yaw is stored as separate, unwrapped `headingDeg`. Never infer angle signs from a screen projection.

Legend: S seated; Q quadruped; L loaf; F sphinx; D side-lying; C curled; B belly-up. `A` = both forearms, `H` = both shins, `J` = jaw, `T` = tongue. Hidden here means `visible:false`, not scale zero. Original 33 boxes remain enabled, even when geometrically occluded by a folded pose.

| Pose | Criteria for final per-joint degree table | Enabled A1 extensions | Required contacts/support |
|---|---|---|---|
| **S — seated** | All 22 pose deltas exactly zero; preserve current ear rest rotations, root placement and resolved geometry. Tail remains the exact rest geometry for parity capture; spring motion is tested separately. | None | Existing shoulder/leg/paw, hip/paw, chest/head, ear/head and three tail seams; existing seated supports. |
| **Q — quadruped** | Pitch torso forward from vertical toward horizontal; start torso pitch search at 55–80°, then position root vertically and tune shoulders/elbows/wrists and hips/knees/ankles together. Head counter-rotates to look forward. No root X/Z travel. | A + H (4) | Four pads/paws share the authored support plane; elbow and knee connectors bridge adjacent pieces; neck/chest/head stay joined. |
| **L — loaf** | Lower torso over folded limbs; forearms/shins tucked entirely inside silhouette and disabled. Fold shoulders/hips, not joint scales. Head upright and ears relaxed. | None | Chest/torso underside bears weight; tucked original paws must not protrude or penetrate forbidden regions. Tail wraps outside the paws/body. |
| **F — sphinx** | Lower torso with forelegs extended forward; tune front chains as a coupled FK curve, hind chains folded. Neck supports an upright head. | A (2) | Belly/rear support and front paws on support plane; no shoulder-to-forearm or forearm-to-paw gaps. |
| **D — side-lying** | Roll via F onto a chosen side, then fold legs loosely. Author left-side canonical pose and mirror by a tested joint mapping, not negative joint scale. Root height follows support hull. | A + H (4) | Side of torso/hip and cheek or head support; exposed limb chains remain connected; no body through floor. |
| **C — rigid-torso curl (S19)** | Start from D; fold limbs, turn the head toward hips and route the tail along the same body side toward the head as far as it reaches. Preserve A1 geometry/IDs/anchors/fixtures. No spine split or tail extension inside A2. | A + H (4) | No nasal-distance/front-plane target. Actual structural parent-child contact/overlap ≤.001; unchanged floor/support at endpoints and every transition frame. SAT/zones/pivot metadata NONBLOCKING. Measured stable tip/head distances frozen ±.005; real WebGL crossing/naturalness acceptance and transitions remain pending. D stays unchanged; see lying-poses.md and joint-zones.md. |
| **B — belly-up** | Start from D with roll waypoints; abdomen faces upward and paws relax above it. Total root roll can reach 180°, but no single interpolation segment exceeds 150°. | A + H (4) | Back/hip supports; no shoulder/hip detachment or limb-through-torso clipping; head remains neck-connected. |

Jaw/tongue remain off in all seven **rest** poses; only feeding enables them. Existing three tail box IDs and their patch children remain unchanged. Hidden limb extensions use their existing host coat material/role; no new patch recipe or color is introduced.

### Editor calibration and constraints

- Each of the 22 joints is edited in its actual local frame. Initial safety limits: neck yaw ±25°/pitch ±30°; head yaw ±35°/pitch −45°..+35°; jaw opening 0..25° around its hinge; ears ±35° around authored rest. Tail segment bend initially ≤80° per axis, then tightened by seam/clearance tests. Limb ranges are set by FK contact authoring, not an invented shared feline-anatomy limit.
- Root/torso roll is handled with explicit intermediate poses rather than a 150° joint clamp. Root Y is authorable for support height; horizontal root motion remains zero. These are pose parameters, not new rig IDs.
- Final export requires structural-contact/floor/support sweeps, preserved A1 neutral pixels and owner video review. S19 removes all C tip/nose distance and front-plane requirements; SAT/zones/pivot metadata in joint-zones.md are diagnostics only. Frozen-D numeric penetration is not a blocker under S19. C↔D all-frame acceptance still needs the parent-owned sweep and visual evidence. A spine split or tail extension requires a separate spec and is not implemented inside A2.
- Contact uses designated seams and oriented-box feature distance (zero for touch/overlap), with existing wrist/ankle hinge-cap contracts preserved. Existing AABB tests remain regressions, but AABB overlap alone cannot certify a rotated seam. SAT and pivot metadata are diagnostic only; visible crossing rejection requires real WebGL evidence.
- Proposed numerical gate: seam separation ≤0.001 model unit; planted support-point horizontal drift ≤0.001 model unit and ≤0.5 projected pixel in the acceptance camera. Tune stricter if owner videos reveal sliding. Track contacts per transition phase: release a support before lifting it; never label an intentionally moving paw as planted.

## 3. Directed transition graph

This is deliberately **not an undirected graph**. A floor pose cannot reach Q by reversing Q→F and bypassing S. Route any floor-to-standing request through S. No runtime straight interpolation between disconnected poses.

Easing: `smoothstep = 3t²−2t³`; `smootherstep = 6t⁵−15t⁴+10t³`. Times are initial visual-tuning proposals, all integral 1/60-second ticks. Each staged interval has zero-speed shared endpoints unless intentionally joined with matched tangents.

| Directed edge | Duration | Intermediate stages / contact changes | Easing |
|---|---:|---|---|
| S → Q | .85 s / 51 ticks | Shift support to front paws; raise pelvis; extend rear/front chains; head counters torso. | smootherstep per stage |
| Q → S | .95 s / 57 ticks | **Pelvis lowers first** (0–45%); fold hind chains (25–70%); forelegs settle (50–85%); **tail settles last** (80–100% plus bounded spring tail). | smootherstep |
| Q → F | .90 s / 54 ticks | Bend elbows, lower chest, fold hind chains, settle belly; feet release only in declared phases. | smootherstep |
| S → F | .90 s / 54 ticks | Extend front paws forward, lower chest, transfer underside support; no standing detour. | smootherstep |
| F → S | .90 s / 54 ticks | Raise chest over forelegs, bring pelvis under body, then restore seated support. | smootherstep |
| F → D | .85 s / 51 ticks | Shift support to one side; roll 0→45→90°; place cheek and relax legs. | smoothstep per stage |
| D → F | .85 s / 51 ticks | Lift head, roll onto belly with explicit support transfer, extend front paws. | smoothstep |
| D → C | .95 s / 57 ticks | Fold limbs, turn head toward hips, route tail along the same side toward head; S19 structural contact and floor/support every frame, visible crossings checked in WebGL. | smootherstep |
| C → D | .95 s / 57 ticks | Move tail away from the face first, unfold head/limbs, restore side supports; preserve S19 structural contact/floor/support and verify visible crossings. | smootherstep |
| D → B | 1.10 s / 66 ticks | Roll via explicit 90→135→180° world-roll landmarks; transfer back support; relax paws after torso. | smootherstep per waypoint |
| B → D | 1.10 s / 66 ticks | Restore head clearance; roll through 180→135→90°; settle side supports. | smootherstep |
| S → L | .75 s / 45 ticks | Lower chest, tuck paws, spread support to underside, wrap tail. | smootherstep |
| L → S | .80 s / 48 ticks | Unwrap tail, expose front paws, lift chest, recover seated support. | smootherstep |

Examples: Q→D = Q→F→D; B→Q = B→D→F→S→Q; C→Q = C→D→F→S→Q; S→B = S→F→D→B. Disallow F→Q and D→Q shortcuts. Sleeping from S uses S→F→D→C or stops at D; never passes through Q.

All joint segments use normalized quaternion slerp; insert more local waypoints whenever angular distance exceeds 150°, including interrupted routes. Separate unwrapped heading prevents a 350°→370° heading request from becoming a long spin or a 180° roll from choosing an unwanted short path.

**Interruption:** sample the in-flight base pose at the event's simulation tick, *before* gesture/idle/gaze/needs/springs. That becomes the first retarget keyframe. Preserve spring positions/velocities independently; never bake their offsets back into base or restart from the old origin. Use phase/contact metadata to finish at most 300ms (18 fixed ticks) of the current support-transfer segment before rerouting. Gaze and ears respond on the next tick after touch rather than waiting for this base redirect. A new request can interrupt, but cannot teleport a planted foot or skip mandatory graph nodes.

## 4. Replace D2 compensation without changing seated pixels

A1 already has the correct ancestry. Its compiler chooses legacy world targets and compensating offsets, especially for head and distal limb joints (`cat-skeleton.ts:29–65,85–89`). Simply deleting offsets or changing parent names is incorrect.

1. Freeze a **fresh A2 baseline from unchanged main 70906fd**, using A1's deterministic browser protocol. Preserve A1 PNGs, compressed oracle and assertions. Historical whole-home/header changes are not an A2 rig regression.
2. Resolve needs/admin morphology once, retaining existing original-box world matrices as the seated rest oracle. Derive rigid, unit-scale joint rest frames and each mesh bind using `inverse(jointRestWorld) × meshRestWorld`. At zero pose delta, require the original 33 box/patch transforms to match the oracle; reuse exact baseline arithmetic where necessary for pixel parity.
3. A2's pose path uses fixed local rest bindings and FK descendants of the torso. It must not re-target distal joints to legacy **world** positions after torso/limb motion. Keep the legacy compiler/tests as a compatibility oracle rather than rewriting the goldens to bless a new silhouette.
4. Keep every joint scale `(1,1,1)`. A mesh's visual scale never becomes its child's transform. If an attachment originates on a body/head surface, compute its local attachment point from the host mesh's scaled local geometry, then place the rigid child joint there. Never decompose a rotated non-uniformly scaled parent to approximate a new skeleton.
5. Separate **morphology rest rebinding** (hunger/admin settings) from **runtime movement** (poses/breathing). Calibrate each resolved seated rest to the oracle; do not continuously rebuild inverse posed-world offsets that cancel the requested follow-through. Breathing moves surface attachments; LAST-layer analytic support IK pins declared paw goals in world space with unit-scale joints, per-leg bend direction/reach and flat rear feet.
6. Pose/support phases are authored across bodySlim/hunger and breathing. Analytic two-bone IK (law of cosines) runs after springs, pinning planted paws within ≤0.001 model unit world drift. Report unreachable goals honestly; never mark a clamped endpoint as planted. Rear thigh/shin solve by IK; ankle compensates to keep foot flat. No gait/navigation.

**Zero-pixel contract:** same browser/build environment, viewport/DPR/camera/lights/coat/design/needs and a frozen **neutral seated rest**: idle/gaze/gesture/breathing deltas neutral, springs at equilibrium. Compare fresh baseline vs new torso-following rig, all five coats at hunger 0 and 100; 0 differing canvas pixels, matching world transforms and unit joint scales. Add dense pure geometry checks for hunger 0..100. Keep a fresh whole-home comparison as a separate integration check. New animated tail, breathing and gaze frames are intentionally different; do not claim they match old animated A1 captures pixel-for-pixel.

## 5. Simulation, layers, springs and gaze

### Pure deterministic simulation

- A TypeScript core owns explicit state, seeded event scheduling, input events indexed by simulation tick and a 1/60 s step. No React, DOM, clock reads, `Math.random`, storage or network in the core; Three math types are allowed without renderer dependencies.
- State includes base route/phase, gesture phase, idle scheduler, gaze target, spring position/velocity and previous/current output. Read-only input state and caller-owned scratch/ping-pong buffers avoid frame allocations and global mutable state. R3F receives output and copies it to nodes only.
- `useFrame` accumulates render delta, advances whole fixed ticks, then interpolates previous/current output (positions linearly, quaternions via slerp). Do not interpolate visibility to half-existing boxes: switch visibility at authored, occluded contact phases. No per-frame React state updates or object construction.
- Retain catch-up backlog with a bounded per-render step count; never enlarge spring dt or silently drop simulation ticks to catch up. Pause on background visibility and reset only the wall-clock accumulator on resume, not seeded simulation state. Replay guarantees mean same seed **and same tick-indexed inputs**, not different user interactions magically giving identical results. Cross-device numeric tolerances accompany visual equivalence; do not promise bit-identical transcendental math across JS engines.

### Required composition order

| Layer | Responsibility / ownership |
|---|---|
| 1. Base | Pose graph, support phases, root Y, separate heading; interruption snapshot is taken here. |
| 2. Masked gesture | Feeding jaw/head; bathing ears/shake; short play burst; sleep entry/exit. Explicit weights and joint masks; one writer per degree of freedom. |
| 3. Additive idle | Keep seeded blink and ear-tic scheduling. Replace old direct tail sine rotation with a small target offset for the **new three-segment spring chain**; do not apply both old and new tail rotations. |
| 4. Gaze | Neck/head/pupil target offsets in current local pose; feeding/sleep masks suppress conflicting pointer gaze. |
| 5. Needs | Existing needs remain authoritative; apply morphology, energy/fun amplitudes and pose-specific breathing, preserving coat attachment. No backend values or rules change. |
| 6. Springs | Bounded secondary targets for tail/ears/head; never oscillate planted goals. |
| 7. Support IK | LAST: analytic two-bone solution, bend/reach constraints and flat rear feet; preserve world-space goals through breathing, transitions and reactions. |

Tail posture targets: happy = raised base with curved tip; relaxed seated = wrap around paws; curled = tail follows the same body side toward the hipward head as far as it reaches under S19, with no nasal distance/front-plane target. Ears forward for interest, partly closed eyes for petting and small torso breathing. Breathing starts at neutral phase for reference captures; approved awake frequency .4Hz/amplitude1% torso mesh, sleep .3Hz/.6%, then tune within contact constraints. Never scale a joint.

### Second-order springs: initial proposal, not measured tuning

Use the standard second-order target response `y + k1*y' + k2*y'' = x + k3*x'`, with `k1=ζ/(πf)`, `k2=1/(2πf)²`, `k3=rζ/(2πf)`. Integrate at fixed step with a stability-aware coefficient bound/substeps; do not feed variable render delta to the solver. For rotations, use bounded local rotation-vector error and reconstruct/normalize quaternions, not unconstrained Euler wrapping. All parameters/velocities are explicit replay state.

| Chain | Frequency f | Damping ζ | Initial response r | Bounds / intent |
|---|---:|---:|---:|---|
| tailBase |3.0Hz|.85|.15|Small follow-through, no torsion discontinuity at torso. |
| tailMid |2.5Hz|.80|.15|Later than base; preserve box seam. |
| tailTip |2.0Hz|.75|.10|Latest; positional clearance clamp near nose/ground. |
| ears L/R |5.0Hz|.85|.10|Short lag, small overshoot around authored rest. |
| head |3.0Hz|1.00|0|Critically damped, lag without repeated nodding. |

Frequency is Hz; damping and response are dimensionless. Clamp velocities/amplitudes at contact-sensitive phases, project to authored legal range, and remove outward velocity when hitting a bound. Test sustained targets, rapid reversals and long replay for finite/bounded output. These are starting values inspired by the referenced family of solvers—not a claim that the inaccessible original video or these exact parameters were validated.

### Look-at

Raycast/project the pointer or finger onto a local target plane near head depth, transformed by the cat's current root heading. No global pointer capture or interference with page scrolling. A finger uses the last active touch target; release returns to neutral smoothly. The touch target and interested-ear response are consumed on the next simulation tick; base interruption delays never delay them.

Eyes lead (approximately80ms response), then head (180ms), then neck (240ms). Initial total yaw budget45°: pupils first within their eye whites, then up to25° head and20° neck; final total pitch initially −25°..+20°. These dynamic limits are tighter than editor safety limits. Clamp pupils to ≤50% of available white-margin travel; do not translate them outside the eye. Pupils are mesh-local offsets, not new rig joints. Behind-body/unreachable targets clamp at the limit, never turn the torso or relocate the cat. Feeding owns head/neck gaze toward the plate; sleep returns it to neutral.

## 6. Care reactions and plate

Emit a discrete `{sequence, action}` reaction **only after the existing care request succeeds**. Do not infer actions from need deltas or button clicks. Rejects, network errors and legacy `broke` responses emit nothing. Keep existing text, numbers, prices/free care and parent callbacks untouched. Consume each sequence once; unmount clears the local visual queue. Preserve any existing owner-generation checks when later integrating with Freighter.

| Action | Visual sequence / mask | Approximate extra time, excluding graph travel |
|---|---|---:|
| Feed | Route to Q; freeze support, reveal plate; neck/head lower toward it, enable jaw and tongue, 3 slow chew cycles; tongue/jaw disappear while mouth closes; return along legal graph to prior resting pose. Gaze/idle head movement masked while eating. |2.4s|
| Sleep | Route to C or D using seed-selected stable choice; close eyes and run slow breathing while the sleep reaction holds; settle rather than teleport, then return on explicit wake/new successful care event. This is a visual state, not new backend sleep gameplay. |entry graph +2.0s reaction, then sleep until touch/care or60s hold timeout|
| Bathe | Keep/route to stable S or Q; ears rotate sideways during a1.2 s wash gesture; finish with a .45s tapered torso/head/ear shake. Paws stay in support; no water assets/particles needed. |1.65s|
| Play | Short .8s in-place body/head/tail burst, no root X/Z displacement. Retain/absorb the existing play bounce once; do not apply the legacy play bounce and a second new bounce. |.8s|

**Petting:** bounce only in seated, standing or loaf; lying poses use squinted eyes + purr. Touching sleep wakes through the graph with squint+purr, never a jump to standing. Reduced motion suppresses every bounce. Do not route petting through the care API or duplicate pulses.

Use **one merged plate mesh** with vertex colors: author bottom/rim/food geometry then merge with no material groups into one BufferGeometry and one material. No textures, model downloads, new audio or new cat IDs. Place it on the authored support plane in front of the cat, outside paw clearance; bake the target relative to root heading at reaction start, not into a springing head/accessory anchor. It stays still while chewing. Mount/cache once, toggle visibility, and hide/clean it on cancellation, completion or unmount. No persistent room object before a room exists.

Latest successful care event retargets from current base using the same contact-safe interruption policy; deduplicate sequence IDs. A sleep request may replace another reaction, and a new care event wakes it. Never replay a backend mutation to replay an animation. Existing control/request disabling policy is preserved.

## 7. Reduced motion — owner approved

Approved: **cut directly to the final stable pose**, with no oscillatory springs, body shake, hop, tail sway or torso breathing. Keep automatic blink. Show plate/static lowered-head feed pose and existing success text; sleeping = stable C/D with closed eyes; bathing = static sideways ears then neutral; play = one static attentive pose then neutral. Restoring normal motion starts from the displayed pose with zero spring velocity, not a hidden elapsed animation.

Also suppress the intentional **visual petting bounce** under reduced motion, preserving feedback and purr. This is now explicitly owner-approved; NO fade.

Runtime preference changes immediately stop oscillations at a stable target. Test both initial preference values and changes during all reactions/transitions. Motion preference is not stored as a pose or account setting.

## 8. Minimal admin pose editor

Live only inside existing `/admin/design-3d`, under the unchanged admin/super_admin guard. No new public route, API, role or persistence schema.

- List22 joint rows by exact ID, **one slider per joint for the selected X/Y/Z axis**; axis tabs expose all three components without66 simultaneous sliders. Show selected joint/pivot and local frame in an editor-only overlay.
- Pose selector for the seven poses; reset-to-seated, play/pause/scrub transition preview; separate heading and root-height controls. These are authoring controls, not extra joints.
- Preview-only hunger 0..100, existing five-pattern selector, breathing/reduced-motion toggles, hidden-piece visibility and contact diagnostics. None writes gameplay needs or modifies the existing four-knob design storage schema.
- Copy button exports a readable TypeScript pose literal with pose ID, all 22 degree triplets, heading/root-height fields, six-piece visibility, support/contact metadata and schema version. No quaternion-only export, no timestamps/random data. Paste into versioned pose-data module; normal PR review is the only publication path.
- New `CatPoseEditor.tsx` owns editor state; existing admin page mounts it beside the current preview. Clipboard writes only on explicit click, with success/failure feedback. Runtime preview uses the same core and viewer adapter as the actual cat, not an independent fake renderer.

## 9. Performance: exact arithmetic, measurements and missing proof

### Draw-call budget by pose and coat

Current eligible base meshes =33, coat patch boxes = solid0/tabby12/tuxedo8/calico4/pointed12. Hidden A1 objects are allocated but do not draw. Keep current rendering protocol and measured formula `draws = 2 × (visible cat boxes + patches + plate boxes) + 5`. Occluded-but-enabled boxes still count; this table is a **predicted budget**, not a new renderer measurement.

| Rest pose | A1 extras enabled | Visible cat boxes | solid | tabby | tuxedo | calico | pointed |
|---|---:|---:|---:|---:|---:|---:|---:|
| S seated |0|33|71|95|87|79|95|
| Q quadruped |4|37|79|103|95|87|103|
| L loaf |0|33|71|95|87|79|95|
| F sphinx |2|35|75|99|91|83|99|
| D side |4|37|79|103|95|87|103|
| C curled |4|37|79|103|95|87|103|
| B belly-up |4|37|79|103|95|87|103|
| Feeding maximum: Q + jaw + tongue +1 merged plate |6|39 +1plate|85|109|101|93|109|

Transitions conservatively use the union of source/target limb visibility: up to4 extra limb boxes, no jaw/tongue outside feeding. Feeding max is the overall planned bound. Visibility switches only at occluded/contact-authored phases; verify draw counts and absence of pops in Chromium's actual main + contact-shadow passes. If renderer/pass behavior invalidates the formula, report actual counts before changing budgets.

**New binary assets: 0 bytes for every pose and coat.** All geometry/poses/plate are code; reuse existing materials and purr. This does **not** mean zero additional JS bundle bytes. Measure the production chunk delta after implementation; no dependency addition is planned. New test videos/PNGs are review evidence, not shipped runtime assets.

### CPU evidence now

Historical artifact `frontend/openspec/changes/pet-voxel-idle-motion/evidence/idle-sampler-8h.json`: worst median batch mean0.156965010ms/call; largest batch mean0.196781555ms/call. It is not new evidence.

A **new current-idle-only baseline** was measured for this plan, at main 70906fd, Node 24.22.1 / AMD EPYC 9354P. Export: `sampleCatIdleMotion(elapsedSeconds, cues, {seed,reducedMotion})`; seed123; elapsed28800+n/60; four energy/fun profiles;100warmups+7batches×200calls/profile. TypeScript was transpiled in memory before timing; each timed call includes a small `Object.keys` checksum. Original executable historical harness was not found, so this is a reconstructed-method baseline, **not a strict before/after comparison**.

| Current seated idle profile | New median batch mean ms/call |
|---|---:|
| energy normal / fun normal |.123299065|
| energy normal / fun low |.076554575|
| energy low / fun normal |.137482775|
| energy low / fun low |.102713065|

New worst median = **.137482775ms/call**; largest batch mean = **.212976005ms/call**, command exit0. Raw batches, checksums and source/config/lock/runtime identity are retained in [`evidence/current-idle-node.json`](evidence/current-idle-node.json). Original stdout/stderr/exit are retained locally in `.git/agent-evidence/a2-cat-poses-plan/current-idle-node.*`.

**A2 CPU per pose/pattern is not measured: the implementation does not exist.** A sampler call is not full simulation/FK/node copying or GPU rendering. Do not extrapolate .137ms to seven new poses or to phones. Each of the7×5 pose/coat cells,12 directed edges and4 reactions must later record measured median/p95/max for simulation + render interpolation/node copy. The pure core should be coat-independent; verify that claim instead of inventing identical timing numbers.

Proposed acceptance budget for **every pose/coat cell**: ≤2ms CPU per displayed frame at p95 on the owner-selected low-end phone, including all fixed ticks performed that frame, layers, support IK and node writes. Also report worst frame and missed frame rate. This is a proposed budget, not measured attainment.

### Measurement protocol after implementation

- Node: production-equivalent compiled core, warmup then raw batches, seeded8h simulation time without waiting8h; record all 7 poses × 5 coats, every edge and reaction, normal/reduced motion and hunger boundaries. Separate core step and renderer-adapter costs. Keep baseline and candidate harness identical for actual comparison; retain source/build/runtime hashes and results.
- Physical Android Chromium: owner identifies target device before gate; if no low-end phone exists, measure the available phone, report model and leave low-end budget UNVALIDATED. No SwiftShader/CPU-throttling substitution for physical proof. Fixed viewport/DPR, same production build and fixture, warmup30s,3×60s captures, cool-down/device thermal state recorded. Time core+interpolation+node writes with Performance API; collect median/p95/max, tick counts/frame, GC and long frames. Report draw calls separately from CPU and GPU/frame presentation. Do not rerun measurements merely to select a favorable result.
- Chromium desktop/SwiftShader verifies rendering/contacts/video generation, **not mobile GPU or CPU performance**. If the phone is unavailable, report the missing proof explicitly; do not claim the2ms mobile gate passed.

## 10. Planned edit surfaces and Freighter overlap

The following are authorized implementation surfaces, bounded by owner amendments and exclusions. Overlap was checked using `git diff --name-only main...feat/freighter-user-pet` with main 70906fd/Freighter3161574.

| Proposed path (relative to frontend/) | Freighter overlap? | Boundary |
|---|---|---|
| `src/features/pet-home/cat-pose-data.ts` |No/new|Seven complete degree tables and visibility/contact metadata. |
| `src/features/pet-home/cat-pose-graph.ts` |No/new|Directed edges, waypoints, durations/easing and mandatory routing. |
| `src/features/pet-home/cat-pose-simulation.ts` |No/new|Fixed-step explicit state, layers, events, interruption. |
| `src/features/pet-home/cat-pose-springs.ts` |No/new|Second-order state and stable bounded integration. |
| `src/features/pet-home/cat-pose-bind.ts`, `cat-support-ik.ts` |No/new|Rest calibration, scaled surface anchors, FK and LAST-layer analytic support IK. |
| `src/features/pet-home/cat-skeleton.ts` |No|Minimal reusable bind/motion boundary if needed; retain legacy seated oracle and exact IDs. |
| `src/features/pet-home/cat-idle-motion.ts`, `cat-idle-frame.ts` |No|Reuse blink/ear scheduling, remove direct tail rotation in A2 path, reconcile bounce; no double motion. |
| `src/features/pet-home/need-visuals.ts` |No|Only if necessary to expose existing morphology as ordered needs-layer data; never change gameplay rules. |
| `src/features/pet-home/components/Cat3DModel.tsx`, `Cat3DViewer.tsx`, possibly `CatSkeletonParts.tsx` |No|Output-to-node adapter, gaze/event forwarding, visibility and plate group. |
| `src/features/pet-home/components/PetHomeStage.tsx` |**YES**|ONLY emit/forward a discrete care event after existing valid success; no other Stage edits. Suppress duplicate play pulse inside renderer adapter. No auth/bootstrap/claim/coin logic movement. |
| `src/app/admin/_components/design-3d/CatPoseEditor.tsx` |No/new|Editor-local authoring/clipboard state. |
| `src/app/admin/_components/design-3d/AdminDesign3DPage.tsx`, `admin-design-3d.module.css` |No|Mount editor/preview controls; existing guard, route and storage schema unchanged. |
| `test/features/pet-home/cat-pose-*.test.ts[x]`, admin editor tests |No/new|Public-core/renderer integration and editor contracts. |
| Existing skeleton/idle/model/need visual regression test files |No|Preserve existing assertions; add A2 cases separately, never rewrite immutable A1 expectations. |
| `scripts/browser-evidence/pet-voxel-poses.cjs` and runner test |No/new|Fresh A2 baseline/video/performance protocol, isolated state. |
| `openspec/changes/pet-voxel-poses/` |No/new|Plan, future spec/evidence and owner decisions. |

**Intentionally do not edit:** HomePage, PollarHomePage, pet-home.module.css, pet.service, use-pet-coins/use-pet-gameplay, all auth/account/proxy/store/role/backend files, frontend README, package/lockfiles, anatomy IDs or coat recipes. These avoid nearly all Freighter integration conflicts. Both homes already share PetHomeStage; passing one optional discrete reaction prop is sufficient. Preserve any future Freighter success/mounted/owner fences at the small shared hunk. No merging or editing the paused branch to resolve this now.

## 11. Test-first rules and visual acceptance

These are **planned RED→GREEN tests**, not tests already written/run. Existing A1 fixtures/goldens/assertions stay immutable; no A2 failure may be fixed by changing an A1 expected result.

| Rule | Meaningful initial RED | What makes it GREEN |
|---|---|---|
| Rig IDs and no joint scaling | Public A2 frame changes an ID/count or emits a non-unit joint scale under morphology/pose/breath. | Exact22/33+6/3 contracts; scale only visual boxes. |
| Seven poses / extensions | Unknown pose or wrong explicit six-piece visibility mask; incomplete22-entry export. | Seven validated tables and correct rest masks. |
| Torso follow-through / seated parity | Torso rotation fails to carry head/paws, or neutral seated world transforms/canvas differ. | New FK bind semantics plus fresh baseline0-pixel comparison. |
| Shape/contact preservation | A named seam/support fails during hunger 0..100, breathing phase or rotated pose; AABB falsely accepts separation. | OBB/seam contracts and authored morphology-coupled FK curves pass declared tolerances. |
| Directed routing | B/C/D/F/L→Q bypasses S; Q→D skips F. | Explicit directed routes and no disconnected interpolation. |
| Staged sitting/lying | Tail settles before pelvis or a support moves while marked planted. | Authored phase/support intervals and staged torso/limb/tail tracks. |
| Long rotations / heading | A requested roll takes an incorrect short arc or heading wraps unexpectedly. | ≤150° quaternion waypoints and separate unwrapped heading. |
| Interruption | Retarget at25/50/75% jumps to source or contains baked idle/gaze/spring offsets. | Base-only instantaneous snapshot, preserved spring state/contact route. |
| Fixed-step replay | Same seed/tick inputs at30/60/120Hz yield different tick states, or a stall changes dt/skips ticks. | Explicit tick scheduling, retained backlog and render interpolation. |
| Layer order / masks | Gaze overrides feeding, old/new tail both apply, or needs rescale a joint. | Single ordered composition and explicit masks. |
| Springs | Target reversals/8h replay explode, seam breaks, or head oscillates repeatedly. | Stable fixed-step solver, local quaternion error, bounds and initial tuning. |
| Gaze | Pupils leave whites, behind-target flips torso, or head leads eyes. | Local target clamp, eye→head→neck timing and masks. |
| Care success / failures | Failed/broke/rejected request emits a reaction; replay/remount duplicates one. | Success-only sequenced event, consumption and lifecycle cleanup; backend calls unchanged. |
| Four reactions / plate / petting | Feeding has no chew/plate, sleep lacks quiet pose, bath lacks ears/shake, play translates or doubles bounce, petting loses purr. | Named gesture outputs; one-mesh vertex-color plate lifecycle; existing petting preserved. |
| Reduced motion | Any spring oscillation/hop/shake/breath survives preference, or toggling causes a jump through stale animation. | Approved stable-pose policy, blink and state reset rules. |
| Admin editor | Non-admin routing changes, wrong/missing joint fields, preview changes real needs, clipboard exports quaternions only. | Existing authorization unchanged; local controls and stable complete degree export. |
| Rendering/performance/assets | Draw counts exceed table, frame updates call React setState, or new binary assets/loaders appear. | Actual renderer pass counts, output-only adapter, zero new runtime binary assets and measured budgets. |

Contact sweep covers all seven poses, every fixed tick of all directed edges, hunger at every integer0..100 and breathing neutral/extrema. Add intermediate breathing phases where the worst clearance is not at an extremum; inspect interpolated render samples too, not only physics endpoints. All five coats retain their recipes and correct transforms/draw counts. Validate unchanged current behavior through the same public core/viewer/action interfaces; record failures, stdout/stderr/exits and source/build identity. Tests may not depend on Git history at runtime.

### Chromium video and screenshot manifest

Capture in real Chromium with a WebGL context, nonblank canvas, fixed seed/clock/viewport/DPR/build identity, no unexpected console/page errors, and muted playback for gesture comprehension. Preserve first-failure evidence. Use owned local fixture state; no production/API/database writes. Do not fabricate recordings at plan time.

| Evidence | Required view/cases |
|---|---|
| `seated-parity-*` screenshots | Fresh main baseline and candidate,5 coats×hunger 0/100;0 differing canvas pixels and world-transform agreement. Fresh whole-home baseline separate; A1 images untouched. |
| `seven-poses` video +7 still images | Front and3/4 views; one pass each coat, plus hunger 0/100 silhouette montage. Show all support contacts and hidden connectors. |
| `all-directed-edges` videos | Every one of the 13 edges, front and side, normal speed and slowed replay; pelvis-first/tail-last Q→S highlighted. |
| `floor-to-standing` video | C/B/D/F/L→S→Q routes, with graph path visible in editor overlay; no impossible shortcut. |
| `interruption` video | New requests at25/50/75% of representative sit/roll/sleep/feeding paths; no pose jump or inherited additive drift. |
| `tail-and-ears` video | Happy tip, seated paw-wrap, S19 rigid-torso curl with same-side headward tail, reversal/settling; visible torso→tail→ear/head delay, no twisted tail. |
| `gaze` video | Pointer sweep and touch/release, extreme/behind targets, sleeping/feeding masks; eyes lead head/neck. |
| `care-feed/sleep/bathe/play` videos | Four silent clips from successful public care actions, plate lifecycle, chew/slow breath/ear-shake/in-place burst clearly legible. Separate petting/purr regression clip. |
| `reduced-motion` video +stills | Seven stable destinations, four reactions, petting and live preference toggle; no oscillatory movement. |
| `morphology-breathing` video | Hunger0→100 and awake/asleep breathing at fixed root X/Z; contact overlays and close-up support/neck/limb/tail seams. |
| `admin-editor` video | Existing admin route,22 sliders/axis selector, preview, clipboard export and re-imported identical pose. Existing non-admin denial remains a test, not new auth work. |
| `mobile-performance` trace/video | Physical low-end phone with declared model/Chromium/build/thermal state; per-pose/pattern CPU and frame data, not desktop emulation. |

PR must record: after A2 lands and Freighter resumes, merge `main` into `feat/freighter-user-pet` with a merge commit (NO rebase); care-event emission stays behind Freighter owner/epoch checks. Do not modify that paused branch now.

Owner gate: **no skating, no separated parts, no jumps between poses, delayed tail/ears, silent gesture comprehension**. Permit at most two visual-tuning rounds. If still robotic after round2, PRESENT a **toy style** plan—clear held poses and restrained in-betweens—without implementing it. Do not expand into realism/IK/locomotion to rescue this gate.

## 12. Risks, owner decisions and implementation order after approval

| Risk | Mitigation / stop condition |
|---|---|
| D2 removal changes rest or hungry geometry | Fresh unchanged-main baseline, rigid bind calibration and0-pixel seated gate before other poses; never rewrite A1. |
| Support drift or unreachable IK goals | World-space planted goals, per-leg reach/bend constraints, flat rear feet and per-frame transition/breathing sweeps; no fake pass via clamped endpoints. |
| Three-box tail may not read naturally as a rigid-torso curl / loaf wrap | S19 freezes actual connected C distances, not a .04 target; preserve A1 and judge visible crossings/naturalness in real WebGL. A curled-cat video failure permits a separate rig-change spec only, not a rig change within A2. |
| Visibility pop / mirrored pose breaks IDs | Occluded switch phases and explicit ID mapping; no negative joint scale. |
| Determinism is lost to render timing, random mount seed or retargeting | Tick-indexed events, explicit seed/state, base-only interruption and replay tests. |
| CPU budget or visual realism not attained | Physical-device evidence and two owner rounds, then toy style; no false mobile claims. |
| Shared PetHomeStage overlaps Freighter | One success-event seam; no account/coin/API refactor, no changes to paused branch. |

**Owner decisions now recorded:**

1. APPROVED reduced motion: direct stable-pose cuts, no oscillation/breathing/shake, and suppression of deliberate petting bounce while preserving purr/feedback.
2. APPROVED **p95≤2ms/frame** CPU budget plus maximum. Owner identifies physical phone before gate; available non-low-end phone is allowed but does not validate low-end budget. Actual per-pose/pattern CPU remains an implementation gate, not a fabricated number in this proposal.
3. APPROVED initial timings/spring tuning, with amended contact-safe reaction policy (sleep holds visually until wake/new care; latest successful care retargets). The seven poses, procedural approach and layer order are already decided and are not reopened.

Authorized implementation order: (a) freeze fresh A2 baseline and contact contracts; (b) implement rigid torso-following binds with seated parity; (c) pose data/editor and graph; (d) fixed-step layers/springs/gaze; (e) success-only care events/plate/reduced motion; (f) full functional/browser/mobile evidence and owner rounds. Each is a reviewable cohesive unit with its tests. Preserve original anatomy/coat/A1 fixtures throughout. No push or merge until both plan validation and implementation acceptance.

### References checked for this plan

- [Hackaday: A Math Based Personality For Games](https://hackaday.com/2022/06/30/a-math-based-personality-for-games/) — frequency/damping/initial-response controls and variable-step instability. Linked original t3ssel8r video could not be fetched without browser sign-in/API access; no claim of watching it.
- [Three.js Matrix4](https://threejs.org/docs/pages/Matrix4.html) — compose and non-uniform parent/decompose limitation; Context7 `/mrdoob/three.js` also confirms shortest-path quaternion slerp. Installed Three.js 0.186.1.
- [R3F performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) — refs/useFrame, no setState or allocations per frame, cached geometry/materials and visibility instead of repeated mounts; Context7 `/pmndrs/react-three-fiber`. Installed R3F 9.8.2.
