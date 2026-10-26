# Adaptive quality for the voxel cat viewer

Implementation authorized by Prompt2, with a mandatory human shadow checkpoint. Baseline: `6643f8964364051625d4ba71c8a2126eb4a945a3` on `feat/voxel-pet-migration`.
No commits, merge or push. DPR/Stats implementation may proceed; Prompt3 resolves the screenshot decision to fixed256 and authorizes final verification.

## Proposed outcome

Start each viewer at a device-limited DPR ceiling, then use drei PerformanceMonitor with a controlled numeric Canvas DPR. Freeze the latest selected value on fallback. Use fixed256 contact shadows, selected by the owner after paired Chromium captures; no live tiers. Offer an explicitly enabled FPS overlay for real-phone checks; leave it absent by default.

The shared viewer serves home and Diseño 3D. Neither caller, its actions, nor its design settings should change.

## Why both resolution knobs

The current shadow uses two 512×512 targets and five offscreen render calls per update. Four blur passes alone represent approximately 1,048,576 pixel outputs, versus approximately 240,100 main-buffer pixels for a 280×280 canvas at DPR 1.75. Canvas DPR does not resize those shadow targets.

This structural evidence motivates comparing shadow resolutions512/256, not claiming a measured mobile bottleneck. Lowering shadow resolution quarters its offscreen raster area but does not reduce its draw count or animation JavaScript. See [cost analysis and ownership](design.md).

## Scope

- Pure device-ceiling and factor-to-DPR functions; fixed ContactShadows resolution256.
- Client-only hints; initial factor 1, step 0.15, bounds [45,58], flipflops 8.
- Cat3DViewer-owned selectedDpr state passed as numeric dpr={selectedDpr}; no layout-effect driver.
- Synchronous fallback latch preserving the final factor/DPR; shadow resolution stays256 independently.
- Existing drei Stats behind `pet3dStats=1`, with no new dependency.
- Focused TDD, preservation controls and later real-browser/phone evidence.

## Not in scope

Anatomy, geometry, hierarchy, idle scheduling, reduced-motion policy, camera, orbit controls, lights, home/admin actions, sessions, backend, dependencies, persisted quality, demand rendering, mesh batching or animation caching.

Shadow position, footprint, opacity, blur, far and color remain unchanged. Sampling-quality differences require visual validation; identical props alone do not prove equivalent appearance.

## Prompt2 decisions and mandatory stop

1. Controlled numeric DPR replaces the Canvas tuple and renderer driver. Preserve orbit-start/end rerender tests, including after fallback; delete the forced-store-reconfiguration test proposal.
2. DPR<1 returns1: an explicit human-approved exception to <=reportedDPR.
3. Keep flipflops8 and accurately document ninth-event fallback.
4. Before any shadow-policy implementation, capture512/256 pairs with identical framing for normal home and all-zero-needs home. **Completed:** captures presented; Prompt3 human selected fixed256 with all other props unchanged. No tier/threshold tests remain.
5. Independent verifier for THIS candidate: UNEXECUTED / NOT APPROVED, explicitly accepted because its profile isolates HOME. Native RDD is separate; stop/report if it blocks.

## Acceptance and next step

Review [device specs](specs/device-ceiling.md), [live quality specs](specs/live-quality.md), [measurement/preservation specs](specs/measurement-and-preservation.md) and [future tasks](tasks.md).

Tuple RED/DPR-Stats GREEN and paired captures are complete. Prompt3 requires shadow assertion RED→GREEN, then full-suite/build/differential/browser verification and RDD. Phone testing is explicitly deferred to a human; no prior receipt is reused.
