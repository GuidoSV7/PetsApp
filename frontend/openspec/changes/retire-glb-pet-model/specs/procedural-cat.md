# Spec: procedural-only viewer and isolated home defaults

## S5 — Viewer always uses the procedural cat

`Cat3DViewer` SHALL NOT accept `modelUrl`, import a GLB renderer or load a
GLB asset. It SHALL render the existing procedural cat and retain its supported
design, coat, need cues, interaction and purr/react inputs, camera and controls.

### Scenario: render and interact through the viewer

Given normal viewer inputs,
when the viewer renders and its cat is interacted with,
then only the procedural cat is selected and the existing inputs/callbacks are
forwarded unchanged. Existing anatomy and camera behavior are not redesigned.

## S6 — Home never consumes a global model

The home SHALL NOT request `/pet/model`, `/pet/model/file`, or model mutation
endpoints, or subscribe to the removed model-change event. Existing pet state,
care, rename, coat, camera and purr flows SHALL remain intact.

### Scenario: home mount and existing pet actions

Given controlled pet API fixtures,
when home mounts and existing supported pet actions run,
then no model endpoint request occurs, and the existing action/state effects
remain covered by the retained home tests.

## S7 — Home explicitly ignores browser design overrides

Home SHALL pass a concrete `defaultCatDesign()` result through the viewer to
the procedural cat, not `undefined`. It SHALL NOT overwrite that design with
global metadata or browser-local admin tuning.

### Scenario: admin has tuned the same browser

Given non-default design settings were saved with existing browser helpers,
when the home mounts and those settings subsequently change,
then the cat receives the default design, including canonical default scale,
and never switches to the stored admin overrides.

## S8 — Preserve scale unless valid human evidence requires adjustment

Global-model scale SHALL no longer be a frontend input. The current cat constant
is `CAT_MODEL_SCALE = 0.78`; defaults SHALL derive from that constant.
The admin preview MAY use its existing browser-local scale override.

### Scenario: production check says procedural with different scale

Given a human has recorded a valid production response with `kind: procedural`
and a differing `modelScale`,
when implementation begins,
then the constant is updated to that procedural scale and default expectations
are updated accordingly.

### Scenario: procedural with matching scale, or GLB with any scale

Given either a matching procedural scale or `kind: glb`,
when the human check is recorded,
then the constant remains unchanged; a GLB scale is never adopted.

### Scenario: evidence is unavailable

Given no human response evidence or an invalid/failed response,
when implementation is considered,
then implementation continues with the current constant unchanged, and missing
evidence is recorded in review. Evidence is not an implementation gate.
