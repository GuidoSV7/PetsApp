# Adaptive viewer quality: cost and ownership

Prompt2-authorized implementation; Prompt3 resolves the shadow decision to fixed256 and authorizes final verification. Baseline `6643f8964364051625d4ba71c8a2126eb4a945a3`.
Installed: drei 10.7.9, Fiber 9.8.2, Three 0.186.1. No performance improvement is measured or claimed here.

## 1. Current code and prompt alignment

| Evidence | Current behavior / implication |
|---|---|
| `src/features/pet-home/components/Cat3DViewer.tsx:51–58` | Canvas DPR [1,1.75], antialias/alpha true, implicit continuous render loop. A tuple clamps physical DPR; it is not always rendering at 1.75. |
| Same file :79–87 | ContactShadows omits resolution, frames and smooth: installed defaults are 512, Infinity, true. |
| `src/features/pet-home/cat-anatomy.ts:30–64` | 33 boxes; hierarchy is not GPU instancing. |
| `components/Cat3DModel.tsx:155–183` | Frame callback and one single-material mesh per box; blinking scales eyes rather than hiding geometry. |
| `cat-idle-frame.ts:24–48`, `cat-part-tree.ts:35–51` | Sampler, six pose lookups/writes, temporary pose/vector work and root animation each frame. |
| `cat-idle-motion.ts:35–64` | Rebuilds seeded event prefixes from time zero. Cost grows with elapsed mount time; do not optimize it in this feature. |
| `components/PetHomeStage.tsx:40–55`, `app/admin/_components/design-3d/AdminDesign3DPage.tsx:16–28` | Both load the same viewer with ssr:false. Keep callers unchanged. |
| `pet-layout.ts:8–19`, `components/pet-home.module.css:295–312` | 280px is the home maximum, not a guaranteed 280×280 buffer on every viewport. Admin preview can be larger. |
| `test/features/pet-home/cat-3d-viewer.test.tsx:48–63` | Existing camera/control/forwarding test pins [1,1.75]; change only that expected DPR behavior and preserve its other assertions. |

Paths in this section are relative to frontend/src/features/pet-home unless a different prefix is shown. Source references below are installed frontend/node_modules paths, not tracked files to edit.

## 2. Per-frame cost estimate

Assumptions: default viewer, one material per mesh, all 33 boxes submitted, smooth contact shadows, no extra scene objects or light shadow-map work. Frustum/layer culling can lower actual counts.

| Work | Estimated submissions | Pixel sensitivity |
|---|---|---|
| Main scene | 33 cat draws + 1 contact plane; 398 triangles | Main framebuffer CSS area × DPR²; antialiasing, lighting, overdraw and bandwidth add cost. |
| Contact depth | 33 more cat draws; 396 triangles | Shadow resolution²; overrideMaterial renders the scene, not only the five meshes marked castShadow. |
| First blur pair | 2 full-plane draws; 4 triangles | Two shadow-target-sized passes. |
| Smooth blur pair | 2 more full-plane draws; 4 triangles | Two more shadow-target-sized passes. |
| Total subtotal | About 71 draws / 802 submitted triangles; six render invocations | Five offscreen render calls plus the main call. This is not six times the same pixel shader. |
| Animation/control JS | Idle sampling/pose allocation, root writes, OrbitControls and renderer traversal | Neither DPR nor shadow resolution lowers this work or batches meshes. |

A BoxGeometry contributes 12 triangles. Six palette roles do not imply six shared material instances. Its geometry groups do not multiply draw calls by six when the mesh uses one material.

At 280×280 CSS pixels, main-buffer areas are 78,400 at DPR1, 122,500 at1.25, 176,400 at1.5 and 240,100 at1.75. DPR1.75→1 reduces this area about67%, not necessarily frame time by67%.

The default two shadow targets each have 262,144 pixels. Four blur passes cover about1,048,576 pixel outputs; the depth pass adds scene coverage within another 512² target. At256, each target has65,536 pixels and the four blur passes cover262,144 outputs: 75% less area, with the SAME passes and draw-call count. Pixel outputs are not measured texture fetches, covered depth fragments or GPU milliseconds.

The supplied ~0.16ms sampler measurement is server-CPU evidence, not phone-GPU or total-frame evidence. Triangle count is low, but many small submissions, blur bandwidth, renderer traversal and long-session JS may still matter. We cannot rank their actual phone costs from source alone.

Installed evidence: drei/core/ContactShadows.js:9–17,29–32,58–90; Three src/geometries/BoxGeometry.js:32,81–86,158–181 and src/renderers/WebGLRenderer.js:362–365,1939–1959.

## 3. Device ceiling

A pure maxDprForDevice takes explicit deviceMemory, hardwareConcurrency and devicePixelRatio values; it never reads browser globals. Snapshot the hints only in the client-loaded viewer.

1. If memory is available: <=2 →1.25; <=4 →1.5; >4 →1.75. Ignore core count on this branch.
2. Otherwise: known positive core count <=2 →1.25; unknown or >2 →1.5.
3. For DPR>=1: min(device tier, reported DPR), rounded DOWN to0.05. For DPR<1: return1, the human-approved floor exception.
4. No UA sniffing, hardware-score claim or persisted quality.

Memory is approximate/coarsened; hardwareConcurrency may intentionally under-report cores. These are starting caps, not GPU benchmarks. Use the reported numeric memory thresholds without byte conversion.

| Memory | Cores | DPR | Ceiling |
|---|---|---|---|
| 0.5 / 1 / 2 | any | 3 | 1.25 |
| 2.01 / 4 | any | 3 | 1.50 |
| 8 | 2 or unknown | 3 | 1.75 |
| unavailable | 1 / 2 | 3 | 1.25 |
| unavailable | unknown / 4 / 8 | 3 | 1.50 |
| 8 | any | 1 | 1 |
| 8 | any | 1.37 | 1.35 |
| 4 | any | 1.49 | 1.45 |
| 8 | any | 1.74 | 1.70 |
| 2 | any | 1.23 | 1.20 |
| any | any | 0.8 | 1 (human-approved exception) |

**Human-approved exception (Prompt2):** DPR0.8 returns1. The floor takes precedence over <=reportedDPR below1. This is an explicit requirement change, not literal compliance with both original inequalities. Hints are a per-mount snapshot; continuous device reclassification is not proposed.

## 4. Controlled numeric DPR — Prompt2 replacement

Use PerformanceMonitor with factor1, step0.15, bounds={() => [45,58]}, flipflops8. Retain ms250, iterations10 and threshold0.75; no second FPS sampler.

Cat3DViewer snapshots the client hints and stores selectedDpr in state, initially the ceiling. It passes a NUMBER, dpr={selectedDpr}, not [1,ceiling]. onChange clamps factor to[0,1], maps raw DPR=1+(ceiling-1)*factor, and quantizes downward to0.05 within[1,ceiling]. Update state only when that quantized DPR changes; no per-frame React state.

A synchronous latest-value ref prevents duplicate updates before React commits. onFallback derives the final value from api.factor with the same mapping, applies it and immediately latches; subsequent callbacks cannot change it. Orbit-start/end parent rerenders retain the selected numeric prop before and after fallback. Preserve model identity; do not wrap/remount it by quality.

This replaces the original range-plus-imperative-setDpr design. Fiber configuration still applies the Canvas prop, but that prop is now the selected number, so configuration restores the RIGHT value. No useThree/setDpr driver, no layout-effect driver, no forced store-reset test, and no new controller component. The installed Fiber finding remains historical rationale for choosing controlled input, not justification for retaining a driver.

## 5. Actual monitor semantics, not inferred semantics

Installed drei/core/PerformanceMonitor.js:45–86 changes factor, calls onChange, then onFallback in the same frame. Closing over React state in fallback can freeze a stale value.

The vendor counter increments for ANY qualifying incline/decline, including repeated directions and events already clamped at an endpoint. Its test is flipped>flipflops: passing8 triggers fallback on the NINTH qualifying event, not after eight direction reversals. Preserve the explicitly requested prop8; do not patch the dependency, pass7, or replace the monitor.

A decision normally collects ten windows of at least250ms; at least eight averages qualify because the threshold is strictly greater than7.5. Decline uses<45 and incline>=58. The monitor stops its own sampling after fallback, not animation or unrelated application setters. Fixed bounds target approximately60Hz behavior; no90/120Hz-specific policy is added.

## 6. Human-approved fixed shadow resolution 256

The four paired real-Chromium captures were presented in Prompt2. Prompt3 human decision: “comparé las capturas emparejadas y 256 se ve igual que 512.” The decision gate is resolved.

Pass resolution={256} directly to ContactShadows, independent of monitor factor/fallback. Do not add a tier function, shadow state, threshold crossing tests or live reallocations. The DPR fallback latch remains unchanged.

Preserve position[0,-0.62,0], opacity0.28, scale3.4, blur2.6, far2.2, color#1c2b22, smooth=true and continuous updates. No moving-shadow freeze/removal, blur compensation, anatomy or lighting changes.

Retain the four original baseline comparison images and their disclosed fixture protocol as historical decision evidence. Final real-browser captures now use the current moving viewer with fixed256; adaptive-normal-stats-off.png supplies the requested final256 capture within the existing24path inventory. Lower pixel area is not a guaranteed phone-FPS result.

## 7. Phone FPS inspection

Proposed opt-in: append pet3dStats=1 to the existing home or Diseño3D URL; preserve other query parameters. All absent/other values leave Stats unmounted, including production. Read location only on the client; a reload applies a changed flag.

Use the installed drei Stats with showPanel0 in a viewer-local parent and a pointer-events:none CSS class. Explicitly override its default fixed panel positioning so the opted-in overlay remains local to the viewer; do not change the existing host/layout rules. Reuse its cleanup for DOM and global before/after-loop subscriptions. Do not add stats.js directly, telemetry, storage, auth bypasses or a second animation loop. Document the URL in frontend/README.md during implementation.

For a low-end Android and an iPhone: record model/browser, viewport, battery/thermal conditions and reduced-motion setting; reload, observe startup and at least30s settled foreground FPS, orbit/tap, and inspect the fixed256 shadow. Record results manually; remove the parameter/reload to disable. Recheck reduced motion and the admin preview. No need to expose real credentials or production data.

Stats measures frame-loop FPS, not GPU duration or causal bottleneck attribution; it adds overhead and global callbacks may include other Fiber roots. Foreground results are the meaningful observation. Phone FPS observations are not a controlled A/B experiment; the shadow stays fixed256. These phone checks are future human evidence, not tests run here or a guaranteed FPS improvement.

## 8. Planned edit inventory

All paths below are relative to frontend/.

| Path | Planned change |
|---|---|
| src/features/pet-home/pet-render-quality.ts | NEW pure ceiling/factor mappings; no shadow-tier mapping. |
| src/features/pet-home/components/Cat3DViewer.tsx | Client-only hints, controlled numeric DPR state, monitor/fallback and optional local Stats parent; preserve all model/control/light/camera props. |
| src/features/pet-home/components/pet-home.module.css | Add only the opt-in overlay class; no existing layout/style edits. |
| test/features/pet-home/pet-render-quality.test.ts | NEW tables and quantization tests. |
| test/features/pet-home/cat-3d-viewer.test.tsx | Public assertion RED, controlled-DPR callbacks/latch/orbit rerenders and Stats flag/lifecycle tests; retain original assertions except replaced tuple expectation. |
| README.md | Explain the opt-in flag, disable procedure and phone-proof limitations. |

### Complete candidate declared before test/source writes — 24 paths

- `frontend/README.md`
- `frontend/src/features/pet-home/components/Cat3DViewer.tsx`
- `frontend/src/features/pet-home/components/pet-home.module.css`
- `frontend/src/features/pet-home/pet-render-quality.ts`
- `frontend/test/features/pet-home/cat-3d-viewer.test.tsx`
- `frontend/test/features/pet-home/pet-render-quality.test.ts`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/proposal.md`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/design.md`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/tasks.md`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/specs/device-ceiling.md`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/specs/live-quality.md`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/specs/measurement-and-preservation.md`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/review.md`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/tdd-results.json`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/shadow-comparison.json`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/adaptive-browser.json`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/viewer-differential.json`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/shadow-home-normal-512.png`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/shadow-home-normal-256.png`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/shadow-home-zero-512.png`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/shadow-home-zero-256.png`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/adaptive-normal-stats-off.png`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/adaptive-normal-stats-on.png`
- `frontend/openspec/changes/pet-3d-adaptive-resolution/evidence/adaptive-reduced-stats-on.png`

Four tracked edits and20new/untracked paths are intended. Future post-decision evidence is declared now, not claimed to exist. Native entry must explicitly select all intended new paths. Excluded local tooling: odd/tasks/pet-3d-adaptive-resolution.md, odd/evidence/pet-3d-adaptive-resolution-*.cjs and .git/agent-evidence/ raw streams/isolated fixtures. No unlisted implementation/evidence path may be silently added.

Protected: Cat3DModel.tsx, anatomy/tree/frame/motion helpers, use-reduced-motion.ts, PetHomeStage.tsx, AdminDesign3DPage.tsx, camera/controls/lights, actions/services/backend, package manifests and lockfiles. Read/run existing tests as controls, not edit them to accommodate regressions.

## 9. Future verification and risks

See [device specs](specs/device-ceiling.md), [quality specs](specs/live-quality.md), [measurement/preservation](specs/measurement-and-preservation.md) and [T1–T7](tasks.md).

Future implementation needs assertion RED before behavior, focused GREEN, full frontend suite under heavy/max2workers, typecheck/build and a public-behavior differential for the shared viewer. Preserve model props, orbit/tap callbacks, reduced-motion output and caller behavior; DPR/shadow/debug changes are the only permitted deltas.

Real Chromium/WebGL verification must check context creation, nonblank canvas, absence of JS errors, actual buffer scaling, controls, opt-in cleanup and the fixed256 shadow. Use installed browsers and SwiftShader if needed; mocked Canvas tests do not prove pixels. Smartphone FPS/visual observations remain separately pending until actually supplied; independent verifier UNEXECUTED / NOT APPROVED for THIS candidate by Prompt2; no borrowed RDD authority. Full verification follows the shadow decision; earlier focused GREEN/captures are partial evidence only.

Risk areas: shared viewer contract, stale fallback state, aliasing, high-refresh displays, background-tab FPS and CPU/draw-call bottlenecks untouched by pixel knobs. The removed renderer driver is not retained as an extra safety mechanism. No runtime proof is claimed before execution.

## Sources consulted

- [drei PerformanceMonitor](https://drei.docs.pmnd.rs/performances/performance-monitor), also queried through Context7 /pmndrs/drei.
- [MDN hardwareConcurrency](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency).
- [MDN deviceMemory](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory).
- [drei Stats documentation](https://github.com/pmndrs/drei/blob/master/docs/misc/stats.mdx), retrieved through Context7.
- Installed sources listed above take precedence over examples from another version. External docs are not proof of application integration.
