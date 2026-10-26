# Prompt4 — revised tabby and calico: visual decision

Status: **Human-approved by Prompt5.** Tabby and calico are approved in normal/dirty states; tuxedo and pointed remain approved unchanged. The former visual stop is satisfied. Closure now authorizes one local commit and native review; no push/merge/production.

## Changes

- Tabby:12 boxes — four thicker M strokes, four horizontal lateral face bands clear of the eyes, and two horizontal bands on each front leg. Removed the thin body bars.
- Inspected the actual geometry-only dirty screenshot first. Bands still had low contrast, so applied the human-authorized50% darkening and updated S6: `round(channel * 0.50)` after existing dirt exactly once. Clean stripe#363940; dirty stripe#292727; accent and dirt formulas unchanged.
- Calico:4 larger asymmetric boxes/three logical spots — brown left forehead up to the ear base, cream blaze/right forehead, and one brown front-leg patch. Removed thin body-side bars and the vertical face-side bar. The cream boxes have0.003 tangent separation; no additional internal-contact exception.
- All patterns respect cap12, thickness0.004, inner0.001/outer0.003 and strict anchor footprints. Whole-face/all33-part burial and coplanarity checks remain intact. Default-home yaw0 S3b: all32 tabby/calico patch/pose checks are **81/81**, required≥41/81.

## Four NEW original captures versus same-palette solid

Images under `prompt4-final50/` are unretouched. Normal means all needs100; zero means all needs0.

| Pattern | Normal | Changed cat pixels | All zero | Changed cat pixels |
|---|---|---:|---|---:|
| Tabby | [Capture](prompt4-final50/tabby-normal.png) | 1,299/18,866 = **6.8854%** | [Capture](prompt4-final50/tabby-zero.png) | 1,074/17,266 = **6.2203%** |
| Calico | [Capture](prompt4-final50/calico-normal.png) | 2,258/18,866 = **11.9686%** | [Capture](prompt4-final50/calico-zero.png) | 2,248/17,266 = **13.0198%** |

Each reference is `<pattern>-<pose>-solid.png` in the same directory. Fixed clock0/yaw0, actual camera/default scale, viewport390×844, DPR1 and shadow256. Metric: maximum8-bit RGB delta≥8 inside the union of both cat-only masks, excluding background/floor/contact shadow. Exact280×280 main-frame buffers and mattes are aligned1:1; original CSS screenshots may be280×281. No resizing, shifting or retouching. Percentages exceed3%, but do not approve recognizability. Stronger ink changed the actual tabby pixels without changing the already-over-threshold area.

## Measured cost, both poses

Six real passes; matte instrumentation excluded. Values are calls/triangles.

| Pattern | Extra boxes | Contact depth | Four blur passes | Main | Total |
|---|---:|---:|---:|---:|---:|
| Solid | 0 | 33/396 | 4/8 | 34/398 | **71/802** |
| Tabby | 12 | 45/540 | 4/8 | 46/542 | **95/1090** |
| Calico | 4 | 37/444 | 4/8 | 38/446 | **79/898** |

Approved tuxedo8/87/994 and pointed12/95/1090 remain unchanged; those are historical measurements, not newly repeated runs.

## Verification and limits

- Geometry assertion RED7; first candidate caught a forbidden cream side contact, corrected without weakening S2. Conditional-contrast assertion RED4. Final focused189, preservation controls65, **full408/408 in52files, zero skips**; TypeScript/build exit0.
- Previous-candidate differential:28 observations,24 unchanged/4 requested/0 unexpected; all33 base markup unchanged, approved descriptors and public model output identical. Frontend API stub/SSR evidence, not real backend HTTP proof.
- Four final real-WebGL pairs passed orbit/raycast tap, same33 base instances/matrices, camera omission/calico reload and zero page/console/request errors. Owned browser/server/scratch cleaned; HOME unchanged. Chromium SwiftShader is not phone/GPU timing proof.
- Preserved intermediate failures and geometry35 images. Extra cross-run CSS-hash assumption was false: calico had five CSS pixels differing by at most1 RGB channel value, while its actual GPU buffers were identical; originals were not changed. This advisory is recorded, not a product-test failure.
- A preliminary advisory scope script used nonexistent `view.yaw`; corrected it to the report's actual `view.rootYaw` and verified0. This was a harness-field error, not feature RED or a product rerun. Final advisory audit passed: only coat-patterns.ts changed in product source since the prior candidate,48 prior PNGs identical,24 final PNGs hashed,16 links valid, index empty/HEAD unchanged.
- Existing warnings remain: React scroll mock, Next Edge static-generation limitation, THREE.Clock deprecation.
- Exact commands/results: [checks](prompt4-final50/checks.json), [browser](prompt4-final50/browser.json), [visibility/differential](prompt4-final50/visibility-and-differential.json). Raw streams: `.git/agent-evidence/coat-prompt4-*`.
- Independent verifier: **UNEXECUTED**, prior explicit HOME-profile exception, never approved. Backend production `coat.pattern` deployment: **UNVERIFIED**, future hard merge prerequisite. No production operations, native RDD or commits.

## Human decision received

Verbatim Prompt5 decision:

> Apruebo el atigrado revisado (M, bandas de cara y patas, tinta al 50 %) y el calicó
> de tres manchas grandes, en estado normal y sucio. Esmoquin y siamés siguen aprobados.

See [closure review](../review.md) for the final evidence and native review procedure. Numeric floors remain separate from this explicit human approval.
