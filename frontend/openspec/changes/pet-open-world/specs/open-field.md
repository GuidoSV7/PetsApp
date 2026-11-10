# Spec: the open field (S1, S2)

Requirements that replace the fixed room of [`pet-room-shell`](../../pet-room-shell/plan.md).
Read the [plan](../plan.md). Every requirement here is pinned by
`test/features/pet-home/field-geometry.test.ts`, `room-grid.test.ts`, `room-integration.test.ts`
and `room-viewer-framing.test.ts`.

## R1 — The default world has no walls, baseboard or window (S1)

Task S1, verbatim:

> Las paredes ocultémoslas, la idea es que el jugador al día inicio no tenga nada, todo sea un campo verde abierto

- `createRoom()` is **not** mounted by the home viewer. `room-geometry.ts` stays importable and
  tested, because the walls return as placeable items (S3/S4/T4); nothing in `src/` imports it.
- `FIELD_PALETTE` has exactly two surfaces, `ground` and `line`. No `wall`, `baseboard`, `window`,
  `trim` or `rug` entry exists in the default world palette.
- The mounted field's bounding box has `min.y = 0` and `max.y = FIELD_LINE_LIFT`, i.e. the tallest
  thing in the world is a painted lattice line, not a standing surface.
- `ROOM_PALETTE`, `ROOM_SOLIDS` and `ROOM_WALL_HEIGHT` remain in `room-geometry.ts` unchanged for
  the later placeable walls; this change does not delete them.

## R2 — The field is 16 × 16 squares of `CELL_SIZE` (S2)

Task S2, verbatim:

> la idea del mundo es que sean cuadrados colo en Minecraft

Owner decision (task L2): **16 × 16**, replacing `pet-room-shell`'s 8 × 8.

- `FIELD_SIZE = 16`; `CELL_SIZE = ROOM_LENGTH / 2` is the existing cell size and does not change;
  `FIELD_HALF = (FIELD_SIZE / 2) × CELL_SIZE`.
- The plate is centred on the origin and spans `x`, `z ∈ [-FIELD_HALF, FIELD_HALF]`.
- The plate's top face is `y = 0` in world terms; the mounted mesh is translated to the A2 rig
  ground `catGroundY(modelScale)` so planted paws touch it in every pose.
- `cellCenter(i, j)` / `pointToCell` accept `0…15` and keep the half-open outer edges: an exterior
  or non-finite point is `null`, never clamped into a cell.

## R3 — Every cell edge is visibly painted (S2)

- One strip per lattice line in each direction: `17 + 17 = 34` strips, one cell apart in the
  interior, boundary lines pulled inside the plate by `FIELD_LINE_HALF` so the silhouette stays
  square.
- Lines are lifted by `FIELD_LINE_LIFT = CELL_SIZE × 0.004` above the plate so the ground draw never
  z-fights them.
- The pre-3D placeholder paints the same 34 lines from the same `CELL_SIZE` / `FIELD_LINE_HALF`
  constants, so the lattice does not shift when WebGL arrives.

## R4 — The ground is one draw and one vertex-colour buffer

- `1` plate quad + `34` line strips = `35` quads → `140` position vertices, `140` colour vertices,
  `210` indices, one geometry, one material, **no `groups`** and no material array. One draw call,
  no per-frame rebuild, no voxelisation (`createField` never calls `createRoom`).
- Triangles are all wound counter-clockwise seen from above (`normal.y > 0`, `|normal.x| =
  |normal.z| = 0`), so no normal attribute and no lighting is needed.
- Material: `MeshBasicMaterial` with `vertexColors: true`, `transparent: false`, `opacity: 1`,
  `toneMapped: false` — the cheapest option, and it emits `FIELD_PALETTE` exactly.
- Colours are baked as Linear-sRGB via `new Color(hex)` (Three colour management), never by writing
  gamma-encoded bytes into the buffer.
- Layer `1` (`layers.set(1)`, mask `2`), so the cat's contact-shadow depth pass never renders the
  field. The home camera and raycaster get `0 + 1` and restore their previous masks on unmount.
- Instances are caller-owned: two `createField()` calls share nothing, and `dispose()` releases
  geometry and material exactly once.

## R5 — Palette

Task S6 and S1: one green, readable squares.

| Surface | sRGB | Why |
| --- | --- | --- |
| Ground | `#5b9b52` | "campo verde abierto". Unlit, so this is the rendered pixel |
| Lattice line | `#4a8643` | Darker green, one line per cell edge; reads as Minecraft squares, not a rug |

The same two values are the CSS tokens `--field-ground` / `--field-line` in
`pet-home.module.css`, which is what makes the placeholder identical to the field (S6).

## R6 — Camera framing for an open field

- The diorama contract of `pet-room-shell` is preserved: yaw 45° ± 20°, elevation 35° ± 5°, zoom
  `0.8…1.2`, one bounded 250 ms overview↔focus tween, a cut under reduced motion.
- `overviewFraming` solves radius and target height from two anchors: the front paw plane at
  `lowerNdcY = -0.45` and the **far (north-west) plate corner** at `upperNdcY = 0.9`. There is no
  wall top any more; anchoring on geometry that does not exist is the defect this replaces.
- The solved frame keeps the paws in the lower third and the far corner inside the frame across the
  whole yaw and elevation bands, and the plate still covers the bottom and both sides of the frame
  at every yaw, so the field reads as open rather than as a cut-off board.
- `focusFraming` keeps its rig-root anchors (head's front plane low, ear tips high, target on the
  eye plane) and is closer than the overview radius.
- `field-view.ts` imports no `three` module; only `Cat3DViewer` applies the pose to a real camera.
