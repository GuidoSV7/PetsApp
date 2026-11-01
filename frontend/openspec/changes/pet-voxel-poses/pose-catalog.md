# A2 pose catalog and directed graph

Status: initial rigid-FK authoring, **not visually/contact validated**. Implements the
T1b catalog/graph portion of S1/S5/S7/S10/S12; the owner amendments in
`odd/tasks/a2-cat-poses.md` override the original plan. No renderer is activated here.

## Public interface

- `cat-pose-data.ts`: `CAT_POSE_IDS`, `CAT_JOINT_IDS`, `CAT_POSES`,
  `compileCatPose(definition)`.
- `cat-pose-graph.ts`: `CAT_POSE_EDGES`, `findCatPoseRoute(from, to)`,
  `sampleCatPoseTransition(fromCompiled, toCompiled, edge, progress)`.
- All contracts reuse the parent-owned `cat-pose-types.ts`. No new anatomy,
  skeleton, tail segment, accessory or joint-scale fields are introduced.

`CAT_POSES` contains seven complete 22-joint degree tables, including zeros.
Sparse source literals are expanded once by `definePose`; exported constants,
triplets and metadata arrays are frozen. Compilation copies input metadata and
converts local XYZ degree deltas to normalized quaternion tuples using Three r186.
Seated deltas, heading and root offset are all zero; existing bind ear rotations
must be composed by the renderer, not overwritten by these zero deltas.

Axes: +Y up, +Z forward, left −X. Positive local X pitches the upright axis toward
+Z. The canonical side pose uses positive root Z roll (left side down), with
90° side and 180° belly-up landmarks. All root X/Z offsets remain zero. Heading
is separate unwrapped yaw in degrees, not part of the root quaternion.

| ID | Initial root Y delta | Rest extensions | Declared paw supports | Other intended support / tuning |
| --- | ---: | --- | --- | --- |
| seated | 0 | none | FL FR BL BR | Existing seated supports and rest seams unchanged |
| standing | .14 | both forearms + both shins | FL FR BL BR | Four-paw plane; torso pitch 60° |
| loaf | −.10 | none | none | Underside; folded original paws need clearance checks |
| sphinx | −.09 | both forearms | FL FR | Belly/rear underside; front paws extended |
| side | −.13 | both forearms + both shins | none | Left torso/hip side and cheek |
| curled | −.13 | both forearms + both shins | none | Side/hip; existing three tail segments target nose |
| bellyUp | −.08 | both forearms + both shins | none | Back/hip; relaxed elevated paws |

`supports` describes paw goals only, not an exhaustive body contact hull; the
shared type has no torso/cheek support IDs. Jaw and tongue are disabled for every
rest pose. These initial FK angles/heights are not a proof of reachable planted
goals, floor clearance, a connected silhouette or tail-to-nose reach.

## Directed timing and stage semantics

Durations are integral 60 Hz ticks; values remain owner-approved initial tuning.

| Edge | Ticks / seconds | Authored stages |
| --- | --- | --- |
| seated → standing | 51 / .85 | Front support first, delayed rear extension |
| standing → seated | 57 / .95 | Root/pelvis lowers by 45%; hind fold 25–70%; front settle 50–85%; tail 80–100% |
| standing → sphinx | 54 / .90 | Front bend before hind fold |
| sphinx → seated | 54 / .90 | Chest raises before rear settle |
| sphinx → side | 51 / .85 | Explicit 45° root roll at 50%, then cheek relax |
| side → sphinx | 51 / .85 | Head lifts, explicit 45° roll, front extension |
| side → curled | 57 / .95 | Limbs fold, tail base then mid then tip |
| curled → side | 57 / .95 | Tip uncovers first, then tail and limbs unfold |
| side → bellyUp | 66 / 1.10 | Explicit 135° roll at 50%, paws relax after torso |
| bellyUp → side | 66 / 1.10 | Head clears before 135° roll to side |
| seated → loaf | 45 / .75 | Lower/tuck before tail wrap |
| loaf → seated | 48 / .80 | Tail unwrap before front recovery |
| seated → sphinx | 54 / .90 | Front extends before chest lowers, no standing detour |

Routing is deterministic breadth-first over the directed table and includes both
endpoints. A stay returns `[from]`. Examples:

```ts
findCatPoseRoute("seated", "curled"); // seated, sphinx, side, curled
findCatPoseRoute("bellyUp", "standing"); // bellyUp, side, sphinx, seated, standing
```

Waypoint joint maps are **sparse per-joint tracks**: an omitted joint does not
acquire an implicit key at that time. Root offsets have their own track. Each
track interpolates between its authored keys with smootherstep, except the two
sphinx/side edges which use smoothstep. Both have zero endpoint velocity.
Rotations use normalized quaternion slerp, never an Euler blend. Every adjacent
joint quaternion interval must be at most 150°; longer custom/interrupted tracks
throw a `RangeError` naming the joint and require explicit additional waypoints.
The sampler does not invent a roll direction from endpoint Euler angles.

Heading is linear in the original, clamped progress, independent of stage easing:
350° → 370° passes through 360°, without wrapping. Inputs are never mutated;
outputs and metadata arrays are newly allocated. The output `id` remains the
source ID until progress 1, then becomes the destination ID.

## Integration limits and remaining proof

- Intermediate visibility is the source/target extension union, endpoints exact.
  This preserves the predicted four-limb-extension bound, **not** a no-pop proof.
  Occluded visibility switch/contact phases still need renderer/editor tuning.
- For different pose IDs, intermediate `supports` is conservatively empty: no
  moving paw is falsely certified as planted. Endpoint supports are exact. The
  runtime contact planner must maintain/release/replant explicit world goals and
  apply LAST-layer support IK. Do not feed this empty list straight into a runtime
  and claim planted-contact acceptance. Body hull contacts are not modeled here.
- Waypoint times expose authoring stages, not the runtime interruption policy.
  T3 must enforce the S7 maximum 18 ticks/300 ms before base rerouting, preserve
  the instantaneous base snapshot, and handle gaze/ears on the next tick.
- This allocation-based pure sampler is an authoring/reference API; frame-loop
  buffer reuse and CPU measurements remain integration work. It reads no clock,
  DOM, React state or randomness and imports no sibling IK implementation.
- T4/editor/browser must validate all 22 unit-scale FK joints, morphology,
  breathing/support contacts, seams, visibility, tail reach, seated pixels and
  owner-perceived naturalness. No claim of mobile performance or visual approval.

Focused tests cover exact IDs/masks/zero seated compatibility, complete distinct
poses, normalized compilation, input immutability, deterministic all-pair routes,
approved edge timings, sleep/floor routes, hip-first/tail-last stages, explicit
rolls, long-segment rejection and per-tick normalized samples of all 13 edges.
Behavioral RED used runnable all-seated/no-transition implementations, not missing
imports. Raw RED/GREEN stdout/stderr/exits and source hashes are under
`.git/agent-evidence/a2-cat-poses-implementation/catalog/` (not shipped assets).
