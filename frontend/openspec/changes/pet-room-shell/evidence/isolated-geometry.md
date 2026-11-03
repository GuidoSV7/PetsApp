# Isolated room geometry — T6 evidence

## Scope and self-review

This is isolated S1–S3 preparation, not integrated B1 delivery. No viewer, cat,
stage, barrel, CSS, backend, approved plan or source-notes changes. The worker
snapshot below predates parent acceptance; parent checks are recorded at the end.
No dependency changes, merge or push were performed.

- **S1: PASS for the delegated geometry subset.** 8×8 grid; procedural floor,
  north/west walls, baseboards, opaque window and trim; one indexed geometry,
  color attribute, zero groups and one opaque vertex-color Lambert material.
  Render mesh uses `layers.set(1)` (mask 2). Exposed voxel faces share the same
  solid occupancy used for side-side-corner AO, including the window and trim.
  Four linear factors and diagonal selection are verified on produced geometry,
  not merely on the helper truth table. Independent sampling checks all emitted
  corner colors, coplanar seams, all surface roles and absence of hidden faces.
- **S2: PASS for the numeric L requirement.** Test-only enumeration of all eight
  corners of each of the 33 neutral CAT_ANATOMY boxes gives minimum Z −0.65
  (tailMid/tailTip), maximum +0.52 (nose). Default CAT_MODEL_SCALE is 0.78;
  `(0.52 - (-0.65)) × 0.78 = 0.9126`. Runtime room modules do not import cat
  modules. Cell size is 0.4563; room side 3.6504; wall height 1.3689.
- **S3: PASS.** New unregistered modules and isolated tests only. A2 integration
  remains deferred. The existing cat definitions/defaults were read, not edited.

Linked S1/S2 requirements NOT satisfied by this unit: layout, actual R3F camera
and event masks, actual Drei ContactShadows depth-pass exclusion, ground wrapper,
lighting/coat approval, gestures, pause, performance and real-browser evidence.
These remain T5/T7 gates; isolated camera/ray tests do not certify integration.

## Public API and browser-probe handoff

- `room-grid.ts`: `ROOM_LENGTH`, `CELL_SIZE`, `ROOM_HALF`, `GRID_SIZE`,
  `cellCenter(i,j)`, `pointToCell({x,z})`, `orientationY(degrees)`;
  `RoomCell` and `RoomPoint` types. Invalid input returns null. X domain is
  [−ROOM_HALF,ROOM_HALF), Z domain (−ROOM_HALF,ROOM_HALF]. Direct interior-edge
  comparisons select increasing indices without epsilon-admitting exterior points.
  Orientations 0/90/180/270 map to Three Y rotations 0/π/2/π/−π/2.
- `room-ao.ts`: `aoLevel`, `AO_FACTORS`, `flipDiagonal`, `AoLevel`. Quad corner
  order is 00,10,11,01; flip when levels[0]+levels[2] > levels[1]+levels[3].
- `room-geometry.ts`: `createRoom()`, `ROOM_PALETTE`, `VOXEL_SIZE=L/20`,
  `ROOM_SOLIDS`. Solids are half-open integer min/max triples with surface keys.
  Later solids own overlapping color; their union generates exposed faces only.
  Fixed dimensions are all multiples of L/20. No general meshing engine/cache.
- `createRoom()` returns `{mesh, geometry, material, dispose}`. Add `mesh` to an
  owned Three scene; set main camera/raycaster mask 3 and keep a shadow-style
  camera mask 1. Supply lighting for the Lambert material. Floor top is Y=0.
  Factory calls never share resources. On replacement/unmount, caller removes
  mesh from its scene and invokes idempotent `dispose()`, which releases exactly
  that call's geometry/material. No temporary GPU geometries or per-frame baking.
  Color(hex) converts sRGB to Linear-sRGB under Three's default color management;
  AO multiplies linear channels. No binary assets or new dependencies.

## Test-first witnesses

Runner: existing Node Vitest 3.2.7 configuration; direct linked-dependency binary.
All commands ran synchronously in the foreground with a 30-second timeout.

Focused command, from `frontend` (used for RED and GREEN):

```sh
./node_modules/.bin/vitest run test/features/pet-home/room-grid.test.ts test/features/pet-home/room-ao.test.ts test/features/pet-home/room-geometry.test.ts --maxWorkers=2 --reporter=dot --bail=1
```

1. **RED — exit 1**, 04:19:51, duration 1.08s. Stdout: `RUN v3.2.7`,
   `Test Files 3 failed (3)`, `Tests no tests`. Failure diagnostics identified
   all three intentionally missing imports, with exact primary messages:
   `Cannot find module '@/features/pet-home/room-ao'`,
   `Cannot find module '@/features/pet-home/room-geometry'`, and
   `Cannot find module '@/features/pet-home/room-grid'`, each imported from its
   corresponding new test file. These were module-resolution failures, not
   behavior passes. No modules had been implemented yet.
2. First implementation run — exit 1, 04:20:31, duration 11.03s:
   `Test Files 1 failed | 2 passed (3)`, `Tests 1 failed | 6 passed (9)`.
   Diagnostic: `Test timed out in 5000ms.` on the ownership test. Correction:
   local 20s geometry-test budgets and aggregate whole-geometry error counters
   instead of per-vertex assertion overhead (no cases or checks removed).
3. Next run — exit 1, 04:21:05, duration 11.43s:
   `Test Files 1 failed | 2 passed (3)`, `Tests 1 failed | 8 passed (9)`.
   Ray normal diagnostic: `expected [ -0, 1, +0 ] to deeply equal [ +0, 1, +0 ]`.
   Correction: numeric component tolerance for Three's equivalent signed zero.
4. **GREEN — exit 0**, 04:21:30, duration 12.60s. Stdout:
   `Test Files 3 passed (3)`, `Tests 9 passed (9)`;
   transform 298ms, collect 552ms, tests 11.79s, prepare 327ms.
   No failure diagnostics or stderr errors.

PRESERVE: no existing commands/helpers changed; no differential required. Tests
also assert immutable neutral fixture/default scale, ownership isolation,
idempotent disposal, excluded mask1/included mask3 and actual floor ray-hit to
cell(4,4). No application stdout/stderr or stored counters exist for these pure APIs.

## Validation identity and limitations

Base HEAD: `3850d351114e4c3c46cfa561883a2d7e79e9dbc8`.
Git blob identities: package-lock `0f90349e09cba7a46af6413aa4cc4c7b93d57bdb`,
Vitest config `d5c60c2ce8fd9da35c1583ef3895612d31ab3f90`,
tsconfig `c3dccf314f0ea169f476171cb6cb0ee6a5d7b8ba`.

- From frontend: `./node_modules/.bin/tsc --noEmit --incremental false` — exit 0,
  stdout/stderr empty.
- From worktree: `git diff --check` — recorded in the worker handoff after this
  evidence write. New files remain untracked, so this command alone does not
  assess their whitespace; no staging was performed.
- Lint unavailable: no certified frontend lint command was supplied.
- Six code/test files: 364 added lines before this evidence document. No scratch
  directories or tool caches were created. Parent owns final source fingerprint,
  isolated real-WebGL probe and wider delivery checks.

**Risk: none** — only new unregistered modules/tests; no existing shared helpers
or contracts change. Actual home integration is not part of this unit.


## Parent acceptance — isolated unit only

- Parent read all three production modules and matching tests. The nine protected
  plan/source/config/lock hashes in the baseline record remain unchanged.
- Full frontend suite: **60 files / 488 tests passed**, exit 0. Heavy queue
  12.073912s; execution 40.005042s. One non-failing React warning in the existing
  admin navigation test: `Received `true` for a non-boolean attribute `scroll`.`
  Raw stdout/stderr: main `.git/agent-evidence/pet-room-shell-isolated/full-suite.log`.
- Native read-only assessment: medium, RDD off, reviewDue false; writer
  self-verification stands, no independent verifier required. No native review ran.
- First browser attempt FAILED: probe admission timed out after 30s. Its standalone
  HTML placed the mounting script in the head before body creation. Corrected the
  test harness HTML to create body first, removed the unnecessary asynchronous
  admission wait, and retained page-error diagnostics. No room code was changed.
  Failed script, log, failure and cleanup remain in `webgl-eQ7tzx` below.
- Corrected Chromium/SwiftShader proof **PASS**, exit 0; queue 30.521036s,
  execution 3.274476s. Mobile 360×450 and desktop 480×600 each render exactly one
  room draw, 48,352 triangles, one geometry; room mesh mask 2, camera mask 3.
  Layer-0-only camera renders zero draws/triangles and a uniform background.
  Main images have 646/714 unique pixel colors respectively; WebGL stays valid.
- Actual browser Raycaster: default mask ignores room; mask 3 hits Y=0 at
  (0.22815000000000007, 0, -0.22815000000000007), resolving to cell (4,4).
  Resource disposal returns renderer geometry count to zero. No page/console
  errors. Owned browser and ephemeral HTTP server were closed.
- Matching source/config/lock SHA256 identities, JSON report, mobile/desktop PNGs,
  runner and cleanup: main `.git/agent-evidence/pet-room-shell-isolated/webgl-zQ6KaM/`.
  This Git-private evidence is local to this VPS, not published or binary assets
  loaded by the application. Inspect the retained runner for the exact probe.
- The proof was already exiting when the A2 session's request to serialize future
  checks with `exclusive petsapp-heavy-a2 -- heavy -- ...` arrived. Attempting to
  cancel our queued job returned already-exited0. No duplicate run was launched.

No Next production build, route bundle measurement or frontend lint was run:
these modules are not imported by the application, the whole frontend typecheck
passed, and the frontend defines no certified lint command. No phone FPS/battery
claim is made. No new binary application assets or dependencies.

Actual R3F event masks, actual ContactShadows internal-camera/depth passes,
A2 ground/look/pause seams, gestures, lighting/coat contrast and full home layout
remain deferred until the owner-authorized A2 merge. The isolated camera proof
must not be presented as full B1 integration acceptance.
