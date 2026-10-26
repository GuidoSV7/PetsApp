# Proposal: pet-voxel-idle-motion

Status: Prompt2 implementation authorized, no commits. Baseline: `6bde6001f94bb891c2156b0bae5574b3223c0901`.
Prompt1 was planning only; Prompt2 authorizes T1–T7 with a standalone frame body
and8h measurement. Independent verifier explicitly unexecuted/not approved; no commits.

## Understanding

Add per-part idle life to the existing voxel cat: seeded blink, tail sway and
one-sided ear tic, responsive to the existing need cues. Respect live system
reduced-motion changes while preserving intentional touch bounce and purring.
Keep the33parts, material roles, rest table, parent graph and need formulas.

The pure sampler receives elapsed seconds, current cues and {seed,reducedMotion}.
It emits only animated part-local deltas. The current Model frame callback applies
current resolved base plus those deltas through refs, without frame-driven state.

## Baseline source findings and mismatches

| Current surface | Finding / consequence |
| --- | --- |
| `src/features/pet-home/components/Cat3DModel.tsx`, `useFrame` | Only root yaw/bob/hop/squash exists; no per-part animation or mesh-ref map. Preserve root formulas except the requested reduced-motion gates. |
| `cat-part-tree.ts`, `resolveCatPartTransform` | Correct immutable base offsets; no off-center pivot. Add a new pose composer alongside it, not a new hierarchy or a changed rest table. |
| `need-visuals.ts`, `applyNeedVisualsToAnatomy` | Ear droop has X pitch AND mirrored Z roll. Preserve both; hinge the complete final rotation, not just tic. |
| `cat-anatomy.ts` | tailMid is a root, not a child of tailBase; only tailTip hangs from tailMid. Preserve this exact graph. |
| Current accessibility | CSS reduced-motion rules exist, but no JS media-query hook controls the WebGL frame loop. |
| `test/features/pet-home/cat-3d-model.test.tsx` | Real Model SSR structure is tested, but useFrame is stubbed. This does not prove imperative frame updates. |
| `cat-anatomy-contact.test.ts` |24stress cases prove contact and some ear-base intersection, not whole ear-base containment. Add the stronger default-size vertex test; keep the old assertions. |

All source/test paths above are under `frontend/`; relative source filenames in
the middle rows are under `src/features/pet-home/`.

## Proposed behavior

- Blink only eyeL/eyeR, scale-Y factor0.1. Normal open3–6s/closed0.12s;
  energyLow open2–4s/closed0.35s. Pupils inherit once.
- Tail angles use raw elapsed seconds and the existing idleSpeed/idleAmp exactly
  once. Tip has its own absolute target; its local delta subtracts the mid target.
- One outer ear tics +0.25X for0.18s, onset intervals5–9s or funLow10–16s.
- Both outer ears hinge at their own lower-face centers for existing need droop
  and new tic. Inner ears inherit; the sampler never targets them.
- Reduced motion leaves blink only and disables root idle yaw/bob. Static yawBias,
  user orbit, hop/squash and purr remain.

## Geometry interpretation

A rotating tip with a different absolute angle cannot keep its entire lower face
coplanar with the mid's upper face. Specify coincident face-center joint anchors
and actual face contact, not an impossible all-vertices coplanarity requirement.
No hierarchy or rest-coordinate change is needed.

Likewise, a base-center hinge does not by itself prove universal containment for
every possible angle/size. The requested stronger proof is for default earSize,
existing mirrored roll and maximum droop+tic; the old earSize0.6/1.6 contact stress
still applies. Do not broaden this into an unproven universal geometry claim.

## Scope and deliverables

Five runtime surfaces after Prompt2: new `cat-idle-frame.ts` plus new `cat-idle-motion.ts`, new
`use-reduced-motion.ts`, extend `cat-part-tree.ts` with a new pose compositor,
and integrate `components/Cat3DModel.tsx`. Planned tests and proof boundaries:
[design](design.md), [tasks](tasks.md), [timing specs](specs/idle-timing.md),
[pivot specs](specs/pivots-and-composition.md),
[accessibility/preservation specs](specs/reduced-motion-and-preservation.md).

No table, cue-formula, palette, viewer/camera/orbit, home/action/API/admin-storage
redesign. No coat patterns, adaptive resolution or old camera-observer probe fix.
No dependency additions proposed.

## Risks

- Double-applying pivots/scales or stale bases; one shared final-pose compositor.
- Confusing absolute tail-tip angle with its local angle.
- Leaving a blink/tic/tail pose stuck when a sparse delta disappears.
- Subscription/hydration/cleanup mistakes and accidentally suppressing touch bounce.
- Frame-test host/ref adapter feasibility is unproven; SSR is not a substitute.
- Scheduling profile changes may shift event phase; design makes this explicit.
- Long-time prefix replay cost must be measured later; no hidden global cache or
  arbitrary timeline truncation is proposed.
- A future implementation touches existing renderer composition: re-evaluate risk
  then. Earlier feature approvals or accepted verification omissions are not fresh
  authority for this candidate.
