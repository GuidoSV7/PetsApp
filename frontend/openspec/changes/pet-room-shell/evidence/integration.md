# B1 — room shell integration and art pass (T5)

Branch `feat/pet-room-shell`, main merged as `e0b62a8`. Raw captures are local only
(`evidence/screens/` = BEFORE, `evidence/screens-after/` = AFTER, 46 PNGs, never committed: the
plan's "0 new binary assets" holds for the shipped app).

## What was integrated

- `createRoom()` from the approved modules is mounted in the home viewer: one caller-owned opaque
  vertex-coloured mesh, AO baked at build time, `layers.set(1)` (not `enable`), main camera sees
  layers 0 and 1, the contact-shadow depth pass sees only layer 0, and the R3F raycaster enables
  layer 1 with the previous masks restored on unmount.
- The room floor is placed on the **A2 rig ground** (`catGroundY`), so the paws touch it in every
  pose; the old hardcoded `-0.62` plane floated the cat by 0.174 world units (~11% of the visible
  height). The contact shadow now lives on the room floor, for the cat only.
- Render pauses when the viewer leaves the screen and when the document is hidden, and resumes
  without a clock jump.
- Home layout: 4:5 with real caps on **width and height** (`PET_FRAME`), replacing the inline
  variables that pinned the frame at 280 px and made the `min-height: 780px` query dead. Measured
  canvas CSS sizes: 350×437.5 (390×844), 475.2×594 (1440×900), 337.9×422.4 (1340×640, capped by
  66dvh; the page scrolls 84 px exactly as plan §1 allows). The authenticated column is no longer
  pinned to 480 px on wide screens.
- Camera: bounded three-quarter diorama (yaw 45° ±20°, elevation limits, zoom 0.8-1.2, 250 ms
  focus tween that becomes a cut under reduced motion), paws on the lower band, wall top in frame,
  accessible desktop controls (`‹ › + − ⟳`) instead of drag.

## Art pass (owner decision "pulir el cuarto 3D")

The plan calls its palette a proposal, and the sage set read as a grey prototype next to the grey
coat. Final values in `ROOM_PALETTE`:

| Surface | Hex | Why |
| --- | --- | --- |
| Floor | `#b07a4e` | Warm wood; keeps grey, white, orange and calico coats separated from the floor |
| North wall | `#f2e4cb` | Cream, lighter than every coat |
| West wall | `#e6d2b3` | Slight diagonal separation without a second material |
| Baseboard | `#6d4630` | Grounding edge between wall and floor |
| Window | `#cfe8ff` | Daylight panel instead of the old flat green outline |
| Trim | `#fbf5e8` | Cream frame around the window |
| Rug | `#4f8f5f` | Saturated base under the cat |

- The rug is a **recolour of the floor's top voxel layer**, not a new solid: a one-voxel box is
  4.5 cm thick in this lattice, which would have lifted the cat off the A2 ground and moved the
  floor raycast. Recolouring keeps the visible rug face exactly at Y=0.
- `ROOM_WALL_HEIGHT` went 30 → 20 voxels. The overview frames the paw plane against the wall top,
  so a 1.37-unit wall shrank the cat to a fifth of the frame; at 0.9126 the cat reads at a proper
  scale while the framing contract still holds.
- Contact shadow: opacity .32 → .45, blur 2.6 → 2.0, scale 2.6 → 2.9, colour `#223024`.
- The cat's shade matches the landing dog's reference: Canvas `flat` (NoToneMapping), warm
  hemisphere fill instead of flat ambient, materials at roughness .42-.48 with metalness 0.
- Page background is a warm cream gradient so the shell and the room read as one scene.

## Verification

- `tsc --noEmit --incremental false` exit 0.
- 67/67 tests: room-integration 8, room-viewer-framing 11, cat-3d-viewer 38, room-geometry 3,
  room-grid 4, room-ao 2. Only two expectations were updated, both values the art pass legitimately
  replaces (the shadow opacity/blur pin and the mesh top, which now follows `ROOM_WALL_HEIGHT`); the
  geometry test still checks every face against palette x AO, extended to model the rug recolour.
- Real stack Chromium evidence: local test PostgreSQL, built NestJS API on 3106, production Next
  standalone build on 53132 behind `/petsapp-api`, throwaway `super_admin`. 17 AFTER captures
  (3 viewports x home/frame/Dormir, 7 coat presets, `?pet3dStats=1`), zero console/page errors, zero
  failed requests, non-blank pixel checks. Draw calls flat at 72 and 42,570 triangles per frame
  across viewports (plan budget: +1-2 over the previous formula, satisfied by one room draw).

## Not verified / open

- Physical low-end phone CPU (S3) and the owner visual approval (T8).
- FPS numbers in the stats capture are SwiftShader software WebGL, not a device claim.
- The weakest coat contrast pair is white/grey against the cream walls: an owner art call.
- The cat keeps its voxel silhouette (frozen A1 geometry); "smooth like the dog" is delivered as
  shading, tone mapping and material, not as geometry. Rounded boxes were considered and left out:
  they would open bevel gaps at shared faces and are a separate, measurable experiment.
