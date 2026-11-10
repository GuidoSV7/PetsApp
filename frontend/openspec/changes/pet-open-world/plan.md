# pet-open-world — an open field instead of a room, and a loading state that *is* the field

Feature task: [`odd/tasks/pet-open-world.md`](../../../../odd/tasks/pet-open-world.md).
Branch `feat/pet-open-world-field`, base `main` `7f04bff`. This change covers **T1** (S1, S2)
and the first-frame/placeholder half of **T2** (S6). T2's walk-into-selection, T3, and the
purchase/persistence tasks (T4, T5, S3, S4, S5, S7, S9, S10) follow this change and are not
designed here.

The task document's `## Specs` are authoritative. Every quoted string below is verbatim from it.

## Decision summary

| Concern | Requirement | Implementation surface |
| --- | --- | --- |
| Default world (S1) | No walls, no baseboard, no window: only ground. Walls become placeable items later | `field-geometry.ts` replaces the mounted `createRoom()` in `Cat3DViewer` |
| Field (S2) | 16 × 16 squares, one cell = `CELL_SIZE`, centred on the origin, `y = 0` on the top face | `room-grid.ts` (`FIELD_SIZE`, `FIELD_HALF`), `field-geometry.ts` |
| Lattice | Every cell edge is painted, so the world reads as squares | 17 + 17 thin strips baked into the same ground geometry |
| Ground cost | One geometry, one material, no groups → one draw, zero per-frame work | `createField()` |
| Palette | Unlit `#5b9b52` ground with `#4a8643` lines | `FIELD_PALETTE` |
| Camera | Same bounded three-quarter diorama, re-framed on the far field corner instead of a wall top | `field-view.ts` |
| Loading (S6) | The pre-3D affordance and the loaded field are the same green and the same framing | `FieldBackdrop` / `FieldPlaceholder` + `field-backdrop.ts` |
| First frame (S6) | Low tier: DPR 1 and no MSAA on the first frame, adaptive DPR afterwards | `pet-render-quality.ts` + `Cat3DViewer` |

## 1. Owner request (verbatim, task L1)

> Las paredes ocultemoslas, la idea es que el jugador al día inicio no tenga nada, todo sea un campo verde abierto y pueda comprar paredes y cosas así para su mascota

> la idea del mundo es que sean cuadrados colo en Minecraft y pueda seleccionar un cuadrado para poner algo

> Hay que arreglar ese cuadro verde que aparece y tarda en cargar el gato

Sizes are an owner decision (task L2): **16 × 16**, not the earlier 8 × 8 of `pet-room-shell`.

## 2. What replaces the fixed room

`createRoom()` (the baked voxel shell of `pet-room-shell`) is **no longer mounted**. It stays in
`src/features/pet-home/room-geometry.ts` as an importable, tested module because the walls return
as placeable items in S3/S4; deleting it would have to be undone by T4. Nothing else imports it.

The default world is now a single flat, unlit, vertex-coloured mesh:

- one plate quad plus one thin strip per lattice line in both directions: `1 + 2 × (16 + 1) = 35`
  quads, `140` vertices, `210` indices, one index buffer;
- no `groups`, no material array, `layers.set(1)` so the cat's contact-shadow depth pass never
  renders it;
- built in the mount effect, not deferred to an idle callback, so the first painted WebGL frame
  already contains the field;
- caller-owned and disposed on unmount (`geometry.dispose()` + `material.dispose()`).

Palette `ground: #5b9b52` / `line: #4a8643`. The material is `MeshBasicMaterial` with
`toneMapped: false`, so the rendered green is the authored sRGB value; that is what lets the CSS
placeholder use the identical colour (see §4).

Detailed, testable requirements: [`specs/open-field.md`](specs/open-field.md).

## 3. Camera framing for an open field

The diorama contract (yaw 45° ± 20°, elevation 35°, zoom 0.8–1.2, one bounded 250 ms focus tween)
is unchanged. What changed is the *anchor*: with no walls there is no wall top, so the overview
band tops out on the **far (north-west) corner of the plate** while the front paw stays on the
lower third (`lowerNdcY = -0.45`, `upperNdcY = 0.9`). At the solved radius the plate runs past the
bottom and both sides of the 4:5 frame, which is what reads as an open field instead of a rug, and
the cat still covers roughly a third of the frame height. The head close-up keeps its symmetric
band and its rig-root anchors.

`field-view.ts` is free of `three` on purpose: the pre-3D placeholder projects the plate with the
very same pose without pulling the 3D chunk into the placeholder bundle.

## 4. Loading: the placeholder is the field (S6)

The stage must never show an empty green rectangle that looks broken, and the loaded field must not
arrive as a visual jump. Two surfaces cooperate:

1. `FieldPlaceholder` — the `dynamic(..., { ssr: false })` fallback — now renders `FieldBackdrop`:
   the sky plus the 16 × 16 field drawn as SVG in the authored 4:5 frame. The status text stays
   available to assistive tech but is visually hidden (`.srOnly`), never painted over the field.
2. `FieldBackdrop` also stays mounted **behind** the transparent canvas in `Cat3DViewer`, so the
   WebGL field grows in over the same picture while it initialises.

Both the placeholder and the loaded field derive green and framing from one source: the CSS
tokens `--field-ground` / `--field-line` mirror `FIELD_PALETTE`, and the projected plate comes from
`homeCameraView` + `catGroundY`, the same tokens the viewer's camera is applied with. Yaw and zoom
are props, so the backdrop tracks the live camera instead of being a static picture.

First-frame cost on the low tier: `initialDprForDevice` returns `1` and `antialiasForDevice`
returns `false`; a mid/high device keeps its ceiling and MSAA. The adaptive `PerformanceMonitor`
keeps working after that first frame, exactly as it did before.

Testable requirements: [`specs/field-loading.md`](specs/field-loading.md).

## 5. Superseded requirements

The following requirements of [`../pet-room-shell/plan.md`](../pet-room-shell/plan.md) are
superseded by this change. That document is kept intact as history, with the superseded sections
marked inline; nothing is deleted.

| `pet-room-shell` requirement | Now |
| --- | --- |
| §Decision summary "Room": one merged mesh with floor, **two walls, baseboard, fixed window** | Only ground by default. Walls/baseboard/window are placeable items (S3/S4) |
| §Decision summary "Grid": frozen **8 × 8** grid | 16 × 16 field (owner decision, S2) |
| §3 "Walls occupy the north and west perimeter", wall origins/thickness/window dimensions | Walls are not part of the default world |
| §4 palette table (floor, north wall, west wall, baseboard, window, trim, rug) | Default world palette is one green plus one line colour; `ROOM_PALETTE` survives only inside the retained wall builder |
| §Camera/§Overview radius "fit the projected room bounds" with the wall top as the upper anchor | Overview is anchored on the far field corner |
| §8 appearance rows about wall/rug contrast | Replaced by field/placeholder parity rows |

Everything else in `pet-room-shell` (4:5 frame sizing, bounded camera controls, layer ownership,
contact shadow on the rig ground, offscreen pause, accessible rotation, admin preview defaults)
still holds and is preserved here.

## 6. Preserved behaviour and out of scope

Preserved, and pinned by the existing suites: the 4:5 home frame with real width/height caps, the
bounded yaw/zoom controls, reduced-motion camera cuts, the offscreen/hidden render pause without a
clock jump, contact shadows derived from `catGroundY`, and the **admin preview** — `variant:
"preview"` keeps the front camera `[0, 0.42, 3.05]`, FOV 28, `OrbitControls`, adaptive DPR and
MSAA, and mounts neither the field nor the backdrop.

Out of scope for this change: cell selection and placement (S3/S4, T4), tap-to-walk (S5, T3),
persistence (S7, T5), coins (S8–S10), and the A2 pose diagnostics owned by another worktree.

## 7. Evidence

The feature log lives in `odd/evidence/pet-open-world/`; the suites that pin these requirements are
`test/features/pet-home/field-geometry.test.ts`, `field-backdrop.test.ts`,
`field-placeholder.test.tsx`, `room-grid.test.ts`, `room-integration.test.ts`,
`room-viewer-framing.test.ts`, `cat-3d-viewer.test.tsx` and `pet-render-quality.test.ts`.
