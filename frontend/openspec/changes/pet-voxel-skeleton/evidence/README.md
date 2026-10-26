# A1 frozen browser oracle

Captured BEFORE any production-source change, from main `867853a291b907d32c453f962c17d9db137f9f8a`.

## Reproduce the protocol

The local, untracked harness is `odd/evidence/pet-voxel-skeleton-browser.cjs`.

```sh
heavy -- npm exec --yes --package=playwright@1.63.0 --call 'NODE_PATH="$(dirname "$(dirname "$(command -v playwright)")")" node odd/evidence/pet-voxel-skeleton-browser.cjs'
```

It copies the actual frontend with preserved dependency symlinks, instruments only the temporary viewer, simulates the same-origin API locally and stops its own browser/server afterward. No production API, camera change, rescaling of captures or product instrumentation is used. The test observer freezes clock/seed, measures all six renderer invocations and allows deterministic existing idle samples. Dev-tool chrome is hidden identically in both phases.

## Frozen contents

- Ten baseline home screenshots and ten actual canvas-buffer PNGs: five patterns × all100/all0 needs, viewport390×844, DPR1, seed13, rest clock0, reduced motion, original camera/shadow256.
- Twelve matrix scenarios: those ten plus tabby/all0 and pointed/all0 with existing admin tunables modelScale.9/bodyDepth1.4/headHeight.1/earSize1.6. Each records rest plus six existing idle times, including blink and ear tic.
- `frontend/test/fixtures/pet-skeleton/legacy-world.json.gz`: independent actual-scene matrix data, gzip-compressed to avoid expanding repetitive generated numeric data in review. This is data, not a production solver or executable fixture.
- `baseline-manifest.json`: base SHA, source hashes, dataset SHA, exact sampled times and measured costs. Runtime tests read fixture data, never git history.
- Baseline draws: solid71, tabby95, tuxedo87, calico79, pointed95. Baseline browser JS/page/request errors:0. SwiftShader is not mobile/GPU performance evidence.

T0 fixture validation:13/13 preservation controls, not new-feature RED. A later comparison runs the same harness with `PET_SKELETON_PHASE=after`; ANY nonzero pixel difference stops with before/after/difference images, pixel count and maximum channel delta. Do not edit production code to force a match after such a failure. No post-change pixel result is claimed by this baseline note.
