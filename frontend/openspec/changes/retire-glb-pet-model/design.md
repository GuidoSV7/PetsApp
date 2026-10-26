# Design: procedural-only frontend pet rendering

## Current evidence

Paths below are repository-relative. Line references describe the current code,
not the eventual implementation.

| Evidence | Location |
| --- | --- |
| Admin metadata fetch, file preview and global save/reset | `frontend/src/app/admin/_components/design-3d/AdminDesign3DPage.tsx:75-184` |
| Home starts with defaults, then overwrites scale from metadata and listens for model changes | `frontend/src/features/pet-home/components/PetHomeStage.tsx:97-134` |
| Viewer switches between GLB and procedural | `frontend/src/features/pet-home/components/Cat3DViewer.tsx:82-101` |
| GLB path only clones/scales a scene and handles clicks | `frontend/src/features/pet-home/components/GlbPetModel.tsx:14-33` |
| Omitted procedural design loads/subscribes to browser settings | `frontend/src/features/pet-home/components/Cat3DModel.tsx:101-144` |
| Store uses `PET_MODEL_DIR` or OS tmp, with metadata and asset files | `frontend/src/lib/global-pet-model-store.ts:34-65` |
| Guard accepts the hardcoded bootstrap bearer | `frontend/src/lib/assert-admin-bearer.ts:76-79` |
| Canonical default scale is currently `CAT_MODEL_SCALE = 0.78` | `frontend/src/features/pet-home/pet-layout.ts:24-25` |
| Catch-all forwards model URLs when static routes disappear | `frontend/src/app/petsapp-api/[...path]/route.ts:27-47,75-91` |

## Source files to delete

All paths in this list are under `frontend/src/`:

- `app/petsapp-api/admin/pet-model/route.ts` — frontend POST/PUT/DELETE.
- `app/petsapp-api/pet/model/route.ts` — frontend metadata.
- `app/petsapp-api/pet/model/file/route.ts` — frontend asset bytes.
- `lib/global-pet-model-store.ts` — disk metadata/assets and shared scale.
- `lib/assert-admin-bearer.ts` — guard used only by the removed admin handler.
- `features/admin/pet-model.service.ts` — global-model client API.
- `features/admin/cat-model-asset.ts` — model file validation, events and old IndexedDB machinery.
- `features/pet-home/components/GlbPetModel.tsx` — GLB rendering.

## Files to edit

| File | Planned edit |
| --- | --- |
| `frontend/src/features/pet-home/components/Cat3DViewer.tsx` | Remove `modelUrl`, GLB import/branch and GLB-only scale resolution/copy. Always render the procedural cat, preserving its design, coat, need and interaction inputs. |
| `frontend/src/features/pet-home/components/PetHomeStage.tsx` | Remove metadata service/event imports, URL/global-scale state and refresh effect. Keep an explicit default design passed to the viewer, not an omitted/undefined design. Preserve normal pet API flows. |
| `frontend/src/app/admin/_components/design-3d/AdminDesign3DPage.tsx` | Keep four current sliders, local preview/persistence and reset. Remove file state, object URLs, model requests, global-confirm workflow, model events and related busy/errors. |
| `frontend/src/app/admin/_components/design-3d/admin-design-3d.module.css` | Remove upload rules and only those feedback/button styles orphaned by the UI change; retain layout and slider/reset styles. |
| `frontend/src/features/auth/hardcoded-admin.ts` | Remove bearer validator and revise the token comment; preserve token constant, login matcher and session builder. |
| `DEPLOY.md` | Remove only the frontend `PET_MODEL_DIR` table row. |
| `frontend/src/features/pet-home/pet-layout.ts` (conditional) | Change the constant only if the human production check permits it; otherwise no edit. |

Keep `cat-design-settings.ts`, `resolve-cat-design.ts`, and `Cat3DModel.tsx`.
The scale resolver and anatomy helpers remain consumed by the procedural renderer.
Do not “simplify” them or change geometry to accomplish this retirement.

## Explicit decision: persist sliders immediately

Each slider writes through the existing browser design helpers on every change.
This intentionally replaces the previous confirmation-time persistence. No
confirmation is required, no API is called and no other user or home is affected.
Reset remains browser-local. Storage location and slider ranges stay unchanged.

## Intended data flow

- **Home:** default design → existing viewer → existing procedural cat. No
  global-model metadata request or model-change subscription. Explicit defaults
  prevent local admin tuning from changing the home.
- **Admin:** existing browser design helpers → local sliders → procedural preview
  and local persistence. Each slider change persists through the current helpers;
  reset persists/restores defaults locally. No global publish step.
- **Copy:** say that adjustments affect the preview only in this browser, not the
  home or other users. Suggested Spanish copy:
  **“Vista previa local. Los ajustes se guardan solo en este navegador y no cambian el gato del inicio.”**
  Preserve reset and existing slider labels; remove upload/global-confirm copy.
- **Scale:** defaults derive from the cat constant; the admin scale slider remains
  a browser-local override. Removing shared scale does not remove that slider.

## Optional human production-scale evidence

Evidence supplied in Prompt 2 is blank: `kind = ____`, `modelScale = ____`,
date `____`. This does not block implementation. Keep the existing constant
unless valid human evidence requires the procedural-only adjustment below.
Never include a token or personal data.

| Observation | Action |
| --- | --- |
| `kind: procedural`, scale equals constant | Keep constant. |
| `kind: procedural`, valid scale differs | Adjust constant to the observed procedural scale and update its expected default in tests. |
| `kind: glb`, any scale | Keep constant; GLB scale is unrelated to procedural anatomy. |
| Request fails, response invalid or evidence missing | Keep the existing constant, continue implementation, and record missing evidence in review. |

No human evidence was supplied and no production check was performed by the
agent. The implementation decision is to keep `CAT_MODEL_SCALE = 0.78`.

## Test inventory

Paths are under `frontend/test/`.

| Action | Files |
| --- | --- |
| Delete, exclusively removed behavior | `lib/global-pet-model-store.test.ts`, `lib/assert-admin-bearer.test.ts`, `lib/hardcoded-admin.test.ts`, `features/admin/pet-model.service.test.ts`, `features/admin/cat-model-asset.test.ts` |
| Update | `features/admin/admin-design-3d-page.test.tsx`, `features/pet-home/pet-home.test.tsx` |
| Add | `features/pet-home/cat-3d-viewer.test.tsx` — mock Canvas/scene boundaries; assert procedural rendering and forwarding of preserved inputs without requiring WebGL in jsdom. Prompt 4 also adds `lib/retired-pet-model-contracts.test.ts` (S1/S3/S8/S12) and `lib/pet-model-proxy-retirement.test.ts` (S2), plus a dedicated S6 network assertion and keyed post-mount S7 storage event. |
| Keep and regression-check | `features/admin/cat-design-settings.test.ts`, `features/auth/hardcoded-admin.test.ts`, `features/auth/login-page.test.tsx`, `features/admin/admin-nav-sections.test.tsx`, `features/pet-home/pet-layout.test.ts` |

The two hardcoded-admin test paths are intentionally different: `lib/` covers
the removed bearer validator; `features/auth/` covers the retained login/session.
Delete any test file made empty; do not use `passWithNoTests` to hide emptiness.

Tests must observe behavior: persist slider values across remount, reset stored
values and preview, assert explicit default home design with stored non-default
admin settings, preserve pet actions/coat/needs/purr assertions, and detect any
model metadata/file/mutation request. Removing a service mock alone does not
prove that requests stopped. Use controlled network mocks/spies, never production.

## Verification plan

1. RED: new acceptance assertions in retained admin/home tests and new viewer
   test; observe failures while current code still exists. Do not replace this
   with deletion-only tests that pass immediately.
2. GREEN: implement retirement, remove obsolete tests, then run focused tests.
3. Review test quality against every spec scenario, including reset persistence,
   localStorage isolation and retained login/actions.
4. Structural checks: deleted source/test paths absent; no `src/` import of
   deleted modules; no `isHardcodedAdminBearer`, GLB renderer or `modelUrl`
   contract remains; no model endpoint request/event flow in home or admin.
5. Run retained regression tests, TypeScript, the frontend suite and build.
   Compare unchanged login and pet-action observable behavior to the baseline.
6. Browser smoke on a controlled local server: four sliders, persistence/reset,
   no upload/global confirm, no model network requests, home unaffected by local
   admin tuning; exercise existing coat/need/purr and camera/action flows.
7. For the security boundary, use independent verification. Follow the user-owned
   RDD switch and native assessment/consent routing for the approved candidate;
   native review is not a replacement for tests.

Suggested commands, from `frontend/`:

```sh
node_modules/.bin/vitest run test/features/admin/admin-design-3d-page.test.tsx test/features/pet-home/pet-home.test.tsx test/features/pet-home/cat-3d-viewer.test.tsx --maxWorkers=2 --reporter=dot --bail=1
node_modules/.bin/tsc --noEmit
heavy -- node_modules/.bin/vitest run --maxWorkers=2 --reporter=dot
heavy -- node_modules/.bin/next build
```

These are future checks, not evidence of execution. Long checks run as background
jobs; any fixed-port browser server uses an exclusive project lock, never host
ports 3000/3001, and is stopped afterward.

## Risks and differences from earlier assumptions

- **Security (item 2):** frontend bearer bypass removal is not a hardcoded-login
  fix. Preserve the login while verifying no surviving server path uses that
  removed validator.
- **Consumed contracts / shared behavior (item 3):** viewer props and static route
  resolution change. Check every caller and preserve unrelated auth/rendering.
  Removing static routes exposes Nest through the unchanged proxy, not 404s.
- **Separate stores:** the backend may return different metadata/assets to legacy
  callers after static-handler removal. An explicit external API origin can
  already bypass the frontend store. No backend endpoint is changed here.
- **Home nuance:** current code already initializes defaults but later overwrites
  scale; remove that overwrite, not the explicit defaults.
- **Persistence nuance:** the file helper still contains older IndexedDB code.
  Deleting it does not erase browser assets, existing disk files or volumes.
  Cleanup is neither authorized nor necessary for this source change.
- **Historical specs:** `admin-glb-model`, `global-pet-model-client`,
  `fix-pet-model-404-bff`, `fix-pet-model-upload-timeout` and the home/local
  design rule in `admin-settings-3d-design` describe superseded behavior.
  Keep those change records intact; this proposal replaces only the intersecting
  behavior, not their unrelated login/UI requirements.
