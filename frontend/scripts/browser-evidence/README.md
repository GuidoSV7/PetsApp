# Cat browser evidence runners

Use these shared frontend scripts for real-browser cat verification. They are test tooling, not application code. The A1 runner reproduces the frozen skeleton comparison; later visual changes should reuse its isolation/observer/capture protocol with their own approved baseline, never overwrite A1's baseline.

## Prerequisites

- Run in a Git checkout with the frontend dependencies already installed from its unchanged lockfile. The runner never installs or changes application dependencies.
- Node 24 (verified on 24.22.1), npm, `git`, `tar`, and the host `heavy` command. Keep your normal `HOME` and caches; do not isolate or replace `HOME`.
- Playwright **1.63.0** and its matching Chromium browser/system libraries. The shared VPS already provides the browsers. Do not run browser/system dependency installers there. `npm exec` below supplies the pinned Playwright package through its cache, not the application manifest.
- A working software WebGL context. Chromium is launched with `--use-angle=swiftshader` and `--enable-unsafe-swiftshader`. This is deterministic rendering evidence, not phone/real-GPU performance evidence.

## Free-care acceptance (real API and PostgreSQL)

Build the backend first (`cd backend && npm run build`). From the repository root:

```sh
heavy -- npm exec --offline --yes --package=playwright@1.63.0 --call 'NODE_PATH="$(dirname "$(dirname "$(command -v playwright)")")" node frontend/scripts/browser-evidence/free-pet-care.cjs'
```

This runner requires the host `pgtest-db` helper and the isolated test cluster on `127.0.0.1:55432`. It creates a unique disposable database, applies migrations with the real backend runner, starts the built API and an isolated frontend copy on free loopback ports, and registers an actual local fixture member. Care requests go through the real same-origin proxy, without mocked responses. Application dependencies and normal HOME are reused; no package or browser installation is performed (`--offline`).

A test-only row starts with hunger10, zero coins and a legacy `broke` status. Reading it must leave its stored row unchanged and return neutral `idle`. Three UI feeds must return hunger28/46/64 with coins0, followed by three valid renames and a reload of the same guest. Assertions cover persisted name/count/hunger/coins, absent balance/plus/insufficient-funds copy, intact brand/logout, no horizontal overflow, working nonblank WebGL and no JS/network errors. A separate real API creation checks the unchanged initial needs and coins0.

`EVIDENCE_DIRECTORY` contains `browser.json`, mobile/desktop home and canvas screenshots, owned server logs, and `cleanup.json`. The runner closes owned servers/browser/client, drops only its disposable database and removes its workspace on every outcome. It never targets production or modifies A1 evidence.

## Run A1's historical after phase

A1's whole-home zero-pixel comparison is historical: it intentionally fails after an approved header change such as hiding the coin counter. Do not regenerate its baseline or change product code to force equality. Use the free-care runner for the new home and preserve A1's geometry/world/fixture tests.

From the repository root:

```sh
PET_SKELETON_PHASE=after heavy -- npm exec --yes --package=playwright@1.63.0 --call 'NODE_PATH="$(dirname "$(dirname "$(command -v playwright)")")" node frontend/scripts/browser-evidence/pet-voxel-skeleton.cjs'
```

The runner chooses a free loopback port (never3000/3001), copies the frontend into owned Git-private scratch with dependency symlinks, and instruments only that copy. It mocks the same-origin pet API, blocks external browser requests, and never connects to production. It checks readiness against its own app and stops its own browser/server and removes its scratch on success or failure.

The printed `EVIDENCE_DIRECTORY` contains fresh screenshots, progress and `after.json`; `server.log` is beside it. Each run has a unique directory under Git's `agent-evidence` path. Outputs are not written over committed historical captures. On a pixel mismatch the run stops with exit2, before/after/difference PNGs, changed-pixel count and maximum channel delta. Do not change application code to force equality.

## Frozen input and assertions

The runner reads `frontend/test/fixtures/pet-skeleton/legacy-world.json.gz` and the baseline PNGs in `frontend/openspec/changes/pet-voxel-skeleton/evidence/` as immutable inputs. Only the after phase is supported. Any other phase exits2 with:

```text
A1 baseline is frozen; only PET_SKELETON_PHASE=after is supported.
```

It cannot create, regenerate or overwrite the T0 fixture, manifest or baseline images. Keep those historical bytes intact.

The protocol covers all five patterns at all100/all0 needs, plus two existing admin configurations: viewport390×844, DPR1, seed13, original camera/shadow256. It compares20 decoded home/canvas images with zero tolerance, checks3,444 full world matrices within absolute1e-6, direct patch parents,22unit joints/3empty anchors/6hidden boxes, and actual render calls71/95/87/79/95. All six existing idle samples are reused from the frozen fixture. JS/page/request errors fail the run.

No GitHub Actions or deployment is configured by these scripts. Record the observed run result with the relevant change's verification report.
