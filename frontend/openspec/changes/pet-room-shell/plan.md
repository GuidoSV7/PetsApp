# B1 — A procedural room for the home cat

**Plan only. Do not implement until A2 has an owner-authorized merge into main.**
Branch `feat/pet-room-shell` starts at verified main `70906fdb87e2279268901ee791afeb1371051dd2`. This document proposes a home-only room, not locomotion, inventory, purchases or decoration. No application code, assets, tests, environments or production state were changed for this plan.

## Decision summary

| Concern | Proposal | Boundary |
| --- | --- | --- |
| Layout | Full available mobile width, CSS aspect-ratio 4/5; desktop up to 480 × 600 CSS px | Keep profile, speech, errors, customization and care controls |
| Camera | Three-quarter diorama, yaw 45° ±20°, elevation 35° with 30–40° limits | No free orbit behind the two walls |
| Focus | A cat tap pets once and focuses the head; reduced motion cuts immediately | No duplicated care/reaction dispatch |
| Room | One opaque merged vertex-colored mesh: floor, two walls, baseboard, fixed window | No textures, external models, SSAO or binary assets |
| Grid | Frozen 8 × 8 right-handed grid, one cell = half canonical neutral cat length | Independent of hunger, pose, breathing, coat and camera |
| Layers | Room render mesh exclusively layer 1; main camera/raycaster layers 0+1 | Contact-shadow camera remains layer 0 |
| Visibility | Visible: normal render loop. Hidden: `never`, with input/tween invalidation suspended | No second clock/manual advance or hidden catch-up |
| Implementation | Merge approved A2 main with a merge commit first | Never rebase or modify another task worktree |

Proposals below are not browser/performance results. Evidence and official links: [source notes](evidence/source-notes.md).

## 1. Existing behavior and retained UI

The current shared viewer has a front-facing camera `[0, .42, 3.05]`, FOV 28, adaptive DPR, contact shadows, mouse/touch orbit and an optional FPS panel. The default home frame is 280 × 280 CSS px; its parent shell also has fixed-height/overflow constraints. Enlarging only the Canvas would therefore be incomplete.

Keep authenticated profile/name, mood, error/busy messages, customization, speech, four free-care buttons and the existing camera modal. Place profile/status above the room; speech remains associated with the cat without blocking its hit target; care buttons sit below the room in the existing accessible order. On narrow screens the page scrolls vertically rather than clipping controls. Preserve loading/error states and pending-care semantics.

Mobile width is the actual content width, not an unconditional 360 px: `height = width × 5/4`. A 360 px available width produces 360 × 450. Desktop proposal: cap the room at 480 × 600, centered in an authenticated content column wide enough to accommodate it. On shorter windows permit ordinary page scrolling; do not scale the whole page or hide controls.

Scope overflow/background changes to the authenticated pet-home presentation. Prefer existing scoped classes; if an authenticated wrapper class is needed in HomePage JSX, change presentation only, not auth decisions, stores, providers, routes or landing markup. Remove the authenticated 2D room-background dependency from this presentation only; do not delete an image still used elsewhere.

The admin preview must retain its existing framing and behavior. New room/camera/gesture behavior is opt-in for home; shared viewer defaults cannot silently become a room for admin.

## 2. Camera and interaction contract

### Framing and zoom

Use +Y up and the cat's canonical +Z forward. Initial yaw is 45°, bounded to [25°, 65°]; elevation is 35°, bounded to [30°, 40°]. These are proposed authoring values, to validate against all room corners and both walls. Disable pan and unrestricted orbit.

Compute overview radius `R` by fitting the projected room bounds at the actual 4:5 viewport, with a 10% safe margin; do not reuse the current distance 3.05. Keep a fixed proposed perspective FOV of 35°. Overview manual zoom is clamped to [0.8R, 1.2R]. Automatic focus uses a separate bounded head-framing radius `F`, with manual focus zoom [0.9F, 1.2F]; fit eye/pupil readability and avoid wall/near-plane clipping before freezing F. Neither radius follows live breathing bounds.

A cat tap invokes the existing pet interaction exactly once and requests focus; it does not create a second care API call or replay A2 reaction events. A reset/overview action returns to R. Proposed normal focus duration: 250 ms with bounded easing; reduced motion assigns the final camera state in one cut, with no hidden tween left running. Keep keyboard-accessible existing rotation controls and expose focus/reset/zoom alternatives for gestures.

### One gesture owner

| Input | B1 effect | Must not happen |
| --- | --- | --- |
| One short cat tap | Existing pet callback once + focus | Duplicate click/reaction/care dispatch |
| One short floor tap | Call the merged-A2 look adapter, if available | Walking, teleporting or calling a fabricated A2 API |
| Floor tap without that adapter | No-op | Runtime error or fallback locomotion |
| Two active touches | Bounded camera rotation and optional bounded pinch zoom | Petting on either touch release |
| One-pointer drag | Reserved; no B1 action | Camera rotation, petting, laser or placement |
| Page interaction outside viewer | Normal page scrolling | Global touch suppression |

Use one canvas-local gesture state machine: idle → pending tap → reserved drag or two-pointer camera → wait-until-all-released. A second pointer cancels the pending pet/floor tap immediately. Suppress the synthetic click after a camera/reserved-drag gesture. Proposed tap thresholds are 6 CSS px and 350 ms; capture cancellation, pointercancel and interrupted focus must terminate the gesture deterministically.

R3F object capture does not support multiple active pointers [R3F events](https://r3f.docs.pmnd.rs/api/events). Coordinate multi-pointer admission at the Canvas DOM surface, not by assuming two object-level captures work. Do not leave default one-finger OrbitControls active alongside this gate. Limit any `touch-action` suppression to the viewer surface; never the document/body or surrounding controls.

Implementation follows A2's actual merged look-input and pause contracts. Names/signatures are deliberately not invented in this plan. No additional public feature flag is needed merely to hide an unavailable adapter.

## 3. Grid: the contract for B2, B3 and A4

Define the room in a room-local, right-handed frame: +X east/right, +Y up, −Z north/back. Cat canonical forward remains +Z. Walls occupy the north and west perimeter; camera yaw bounds remain on the open south/east side.

Freeze `L` as the longitudinal Z extent of the immutable canonical A1 neutral visible boxes at the default design, multiplied by the fixed default model scale. Derive it from immutable box corners once, not live scene bounds; exclude coat patches, animation, hunger/depth variants, UI yaw and newly visible animation extensions. Record the derived numeric value in the future grid fixture before B2 consumes it. The research proposal `L ≈ .9126` (1.17 × .78) is an estimate to check, **not a certified measurement or a second definition**. The source-derived definition is authoritative.

Let cell size `c=L/2`, room side `8c=4L`; grid indices `i,j` are integers 0…7. Southwest boundary origin is `O=(-4c,Yfloor,+4c)`. Cell centers are:

`center(i,j)=(-4c+(i+.5)c, Yfloor, +4c-(j+.5)c)`.

Increasing i moves east; increasing j moves north. Bounds are X in [−4c,+4c], Z in [−4c,+4c]. Point-to-cell is `i=floor((x+4c)/c)`, `j=floor((4c-z)/c)`. Use half-open cells: the east and north outer edges are outside for picking, not clamped into another cell. At an interior edge choose the cell in the increasing-index direction; epsilon handling must not move an actually exterior point inside. Invalid indices/NaN/infinities return no cell. Store integer cell/footprint coordinates, not rounded screen pixels.

Freeze item quarter-turn orientation as viewed from above: 0° forward/south (+Z), 90° east (+X), 180° north (−Z), 270° west (−X). This is an application orientation convention; convert it explicitly to Three's signed Y rotation, not by assuming its sign. B3 footprints declare an anchor cell and local occupied offsets; B2 stores those discrete values; A4 later resolves cell centers into navigation positions. B1 adds no occupancy, collision, inventory or pathfinding behavior.

Freeze room-local `Yfloor=0`. Align the existing model into that frame with an outer presentation wrapper: its Y translation is `Yfloor - existingModelPlacementY - modelScale × A2GroundY`, using the actual merged-A2 hierarchy/ground contract. Do **not** blindly retain the current shadow-plane Y=−.62: it is not proof of paw contact. Preserve A2's authored contacts, internal root/base transforms and rig; adapt outer room presentation/shadow placement, not anatomy or planted paw goals. Freeze that derived transform in integration tests. A design-scale change adjusts the presentation wrapper, not grid size/origin; morphology and breathing never redefine the grid.

North wall local origin: `(-4c,Yfloor,-4c)`, wall U east (+X), V up. West wall origin: `(-4c,Yfloor,+4c)`, U north (−Z), V up. Proposed wall height is 1.5L. Wall thickness/baseboard/window dimensions are authored in L and remain fixed; a fixed opaque inset window panel needs no transparency or external scenery. Window/baseboard geometry is not an inventory item.

## 4. Geometry, AO, lighting and palette

Construct floor, walls, baseboard and window procedurally once per immutable room-design key. Merge compatible geometries without groups, with a color attribute and one opaque material [Three optimization](https://threejs.org/manual/pages/optimize-lots-of-objects.html). One geometry is not one draw if it contains material groups [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html). No texture, GLB, HDRI, SSAO, physics engine or new geometry dependency is planned.

Release temporary geometries after merging; dispose final owned geometry/material on final unmount/replacement. Document cache ownership/reference lifetime so a shared admin/home instance cannot dispose another instance's GPU resources. No geometry construction or color rebaking inside useFrame.

For each face corner sample the two side occupants and diagonal corner in the procedural room's solid occupancy, treating the window/baseboard consistently. Four AO levels use `0` if both sides are solid; otherwise `3-side1-side2-corner`. Proposed linear brightness factors: .55/.70/.85/1. Flip a quad diagonal when `a00+a11 > a01+a10` to avoid anisotropic interpolation [0fps](https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/). Test shared boundaries and corners; AO is baked vertex coloring, not a screen-space effect.

Parse palette colors as sRGB and bake AO into Linear-sRGB vertex attributes; do not multiply gamma-encoded hex bytes directly [color management](https://threejs.org/manual/pages/color-management.html).

| Surface | Proposed sRGB color | Purpose |
| --- | --- | --- |
| Floor | `#8da185` | Muted warm sage, contrasting with dark and white coats |
| North wall | `#c9d4c3` | Light desaturated green, not app white |
| West wall | `#b5c6ad` | Slight diagonal separation without another material |
| Baseboard | `#5f7568` | Grounding edge |
| Opaque window inset | `#e4efd7` | Light panel, no transparency/emissive draw |
| Small fixed trim | `#3dff8a` | Existing app accent, not a large glowing wall |

These are proposals, not a contrast-proof result. Preserve app forest backgrounds `#07140c` / `#0f2418`. The source has **five pattern IDs and seven preset swatches**, not five total presets. Preserve all seven.

The current lights are ambient .72 and directional 1.25/.4/.35; the rear fill is relatively low. Tune a balanced broad key and rear/upper fill in the room, with fixed reference exposure/tone mapping, to lift the back without washing out eyes or white coats. Do not solve darkness by changing coat colors, pupil emissive values or anatomy. Avoid additional shadow maps or post-processing. Keep lights visible to both layers 0 and 1. Select final intensities by paired before/after reference captures, not by claiming these proposed numbers fix every coat.

## 5. Layers and contact shadows

1. Every room **render mesh** uses `layers.set(1)`, not `enable(1)`. Parent-group layers do not recursively configure descendant meshes [Layers](https://threejs.org/docs/pages/Layers.html).
2. Home main camera uses mask 0+1. Its R3F raycaster also uses 0+1; otherwise floor interactions are absent [Raycaster](https://threejs.org/docs/pages/Raycaster.html).
3. Contact-shadow camera uses only layer 0. The cat remains layer 0. Verify the shadow display plane does not become part of the room or cast a duplicate depth pass.
4. Keep previous camera/raycaster/light masks and restore them on home-room cleanup. Scope ownership so admin and future canvases are unaffected.

Pinned Drei 10.7.9 ContactShadows has an internal orthographic camera and **no public shadow-camera-layers prop** [tagged source](https://raw.githubusercontent.com/pmndrs/drei/v10.7.9/src/core/ContactShadows.tsx). Its default camera layer is 0. Do not invent such a prop or silently fork Drei: assert the actual internal camera's mask at integration, and test depth-pass exclusion globally with a room-only scene and a cat+room scene. If the pinned implementation cannot uphold that invariant through a supported integration, stop for an integration decision.

Keep the shadow material/plane on the cat ground plane with only a bounded anti-z-fighting offset. Its region/scale must cover allowed cat poses without forcing the entire room through the expensive depth pass. Shadow frames remain dynamic while the cat animates; do not set frames=1 to fake a performance win [ContactShadows](https://drei.docs.pmnd.rs/staging/contact-shadows).

## 6. Offscreen render pause and lifecycle

Observe the viewer element plus document visibility. When offscreen or hidden, set that owned Canvas to `frameloop='never'`, disable the camera gesture/control update producer and cancel/pause focus tween invalidations. `demand` alone is insufficient if producers keep invalidating [R3F hooks](https://r3f.docs.pmnd.rs/api/hooks).

Do not call manual `advance`, create another simulation clock or mutate the shared R3F clock. Resume through the actual merged-A2 pause/time contract; no simulated elapsed-time jump, replayed care reaction, huge spring delta or background contact-state advancement. If A2 has no suitable pause seam, treat it as an explicit integration prerequisite rather than inventing one or suppressing motion silently.

On return, render the latest state and restore the appropriate visible mode. Cleanup disconnects observers/listeners, cancels owned animation handles, restores masks/modes and disposes owned resources. Unmount, reduced-motion changes and a page becoming hidden during a two-touch gesture must all terminate safely.

## 7. Impact and measurement, not promises

Let `E(t)` be visible skeleton extensions, `P(t)` visible pattern patches, and `N(t)=33+E(t)+P(t)` visible cat render meshes. Extras are instantiated hidden initially; do not equate 39 instantiated boxes with 39 visible draws or assume they stay hidden after animation.

For one nominal complete frame with all counted meshes in-frustum, dynamic smooth ContactShadows contributes N depth draws, four blur draws and one main shadow-plane draw. Main cat adds N: **`Dcat = 2N+5`**, before any other scene passes/meshes. Pattern patch counts are solid0/tabby12/tuxedo8/calico4/pointed12. This is source accounting, not measured renderer output.

The single merged room adds **one main draw and zero shadow-depth draws**. Requested allowance is +1–2; a second room draw requires an explicit reason and must not split the required merged shell. Do not multiply room cost by blur passes. Rebase the accounting on actual merged A2 visible meshes, care plate and full pass sequence; do not present current-source nominal counts as its accepted baseline.

Capture aggregate renderer.info with deliberate frame-boundary reset across depth, blur and main passes, restoring previous autoReset afterward [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). Current `pet3dStats=1` displays FPS, not complete draw accounting; any future instrumentation must not take over/duplicate the render loop.

At equal DPR, 360×450 is 162000 pixels versus 78400, ratio **2.0663**. Framebuffer cost scales with DPR²: DPR2 gives 648000 versus 313600 pixels. Adaptive DPR already has a floor; it is not proof the extra area is free.

Added binary assets target: **0 bytes**. JS bundle delta: **UNKNOWN until matched builds**. Reuse the existing Three/Fiber/Drei packages; measure new route/client raw+gzip/Brotli bytes against the approved merged-A2 baseline with identical lockfile/build environment. Do not infer JS delta from source lines.

Future physical-phone protocol: identify model/SoC/OS/Chrome/GPU, power state, viewport and selected DPR; compare approved-A2 and B1 release builds under the same conditions with `?pet3dStats=1`. Record warm-up, FPS/frame-time distribution, aggregate draws, renderer state and offscreen draw count; retain max/p95 rather than an average alone. Use the same care/pose scenarios and durations, not a synthetic idle-only speedup. Hidden render count must settle to zero. No physical-device performance claim is made in this plan.

## 8. Future RED → GREEN tests and evidence

All rows are planned acceptance, **not executed tests**. Preserve existing assertions and add meaningful behavioral RED before implementation.

| Rule | Required RED witness / GREEN observation |
| --- | --- |
| Layout | Mobile frame not 4:5 or controls clipped → exact ratio, full control access and page scroll; desktop480×600 cap |
| Home-only | Admin camera or landing changes → unchanged default admin/landing snapshots and routing behavior |
| Camera | Unbounded orbit/zoom → deterministic yaw/elevation/radius boundaries and safe framing |
| Pet/focus | One tap calls care twice → exactly one existing callback plus one focus request |
| Reduced motion | Hidden tween survives cut → final camera on first displayed sample, no continuing tween |
| Two pointers | Release after orbit pets cat → pending tap cancelled and no click until all pointers released |
| Reserved input | Single drag/floor tap moves cat → drag no-op, floor look only through present A2 adapter, absent adapter no-op |
| Scroll | Viewer changes document touch handling → outside scrolling remains free |
| Grid | Edge/negative/NaN maps inconsistently → centers, inverse mapping, half-open edges and four orientation fixtures exact |
| Ground | Reusing−.62 floats cat → actual transformed A2 ground equals room floor, no anatomy/goal changes |
| Geometry | Multiple materials/groups or dynamic rebuild → one merged geometry/material, no groups, stable cache and disposal |
| AO | Wrong corner values/seam diagonal → all four levels, shared edge continuity and diagonal rule |
| Layers | Room enters depth pass or floor cannot raycast → room mask2, main/ray mask3, shadow mask1, hit-floor test |
| Cleanup | Masks/listeners/resources leak → prior masks/mode restored and observers/owned resources released |
| Pause | Hidden scene keeps rendering or jumps on return → zero hidden render calls and continuous A2 phase without replay |
| Appearance | Dark back/pupil loss or coat change → paired reference captures preserve all patterns/swatches and readable head focus |
| Draw budget | Room adds shadow work → complete-frame measured delta +1, at most justified +2, no room depth draws |

Use real Chromium WebGL, not only jsdom. Capture mobile and desktop for all five patterns; a seven-case set also covers grey/white/orange solid swatches plus calico/tabby/tuxedo/pointed, without an unnecessary 35-combination Cartesian matrix. Keep before/after same needs/seed/camera state and source identity. Check WebGL creation, no console errors, nonblank canvas pixels, layer/picking behavior, reduced motion, resize and offscreen return. Retain screenshots/traces and source/config/lock/build fingerprints. A software-rendered VPS browser proves rendering, not phone FPS or battery.

Run future full suites/build/E2E with heavy/exclusive coordination and isolated fixtures. No heavy A2 run may overlap another heavy load while swap is nearly full. No such run is authorized or needed for this plan-only delivery.

## 9. Future files and branch intersections

| Surface | Planned implementation ownership / overlap |
| --- | --- |
| New room grid/geometry/AO/camera/gesture/visibility modules under pet-home | Home-only B1; exact module names proposed at implementation |
| Cat3DViewer.tsx | A2 shared viewer; reconcile only after its approved main merge; preserve admin defaults/quality/stats |
| Cat3DModel.tsx | A2 clock/pose/pet callback; do not alter rig, poses, colors or reaction semantics |
| PetHomeStage.tsx | A2 care sequence + Freighter owner/epoch fences; future coin counter may also intersect |
| pet-home.module.css, home.module.css | Authenticated layout/overflow/background only; no landing redesign |
| HomePage.tsx if needed | Authenticated wrapper class only, no auth/store/provider changes |
| New focused tests and browser evidence recipe | Existing deterministic fixtures and owned resources; no new binary assets |

No backend/API/account/login/admin-route implementation belongs to B1. Do not modify Freighter, A2 or coin-purchase worktrees. After an owner-authorized upstream merge, incorporate main by merge commit, never rebase; rerun affected checks. Planning does not authorize a push, PR merge, production deployment or implementation.

## Acceptance status

The plan covers layout, camera/gestures, grid, room/AO/palette/lights, layers/raycaster/shadows/pause, impact, tests and integration. The numeric canonical grid unit, merged-A2 pause/look seams, actual internal shadow-camera mask, visual quality, bundle delta and physical-device measurements remain explicit **future verification gates**, not claimed results.
