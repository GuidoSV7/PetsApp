# Spec: browser-local Diseño 3D preview

## S9 — No global model controls or requests

The admin page SHALL keep its current four sliders and procedural preview.
It SHALL have no file input, upload/drop area, global-confirm action, model URL,
object-URL lifecycle, or model API fetch/upload/delete operation.

### Scenario: render and use the page

Given a controlled model-request detector,
when the page mounts, all four sliders change and reset is used,
then no model endpoint is requested, no file input is present, no “confirm for
everyone” control is present, and the procedural preview remains available.
Do not reinterpret unrelated application-shell authentication as a model request.

## S10 — Sliders persist locally and reset locally

Explicit decision: each slider SHALL save through the existing browser design
storage helpers as it moves, replacing the previous confirmation-time save.
No confirmation step or API call is required and other users are unaffected.
The storage location and slider ranges SHALL NOT change.

### Scenario: edit and remount

Given current defaults,
when each slider is changed without any confirmation action,
then the preview reflects its value and that change is immediately saved locally.
After unmount/remount, preview and sliders retain the saved values.

### Scenario: reset and remount

Given non-default saved values,
when reset is selected,
then sliders, preview and saved design return to `defaultCatDesign()`.
After remount they remain at defaults, with no model DELETE or global event.

## S11 — Copy describes preview-only persistence

The page SHALL explicitly state that adjustments are stored only in this browser
and do not change the home cat. It SHALL NOT promise publication to all users.

### Scenario: inspect visible instructions

Given the page is rendered,
when its explanatory copy is read,
then browser-only persistence and no home publication are explicit.
Suggested text: “Vista previa local. Los ajustes se guardan solo en este navegador y no cambian el gato del inicio.”

## S12 — Test files remain executable

Tests exclusively covering deleted modules SHALL be deleted as whole files.
Retained tests SHALL cover S5–S11 and preserve their unrelated existing behavior.
No empty test file SHALL remain, and Vitest's no-tests failure behavior SHALL NOT
be disabled to mask an empty file.

### Scenario: run the retained frontend suite

Given obsolete-only test files have been deleted and retained tests updated,
when Vitest discovers and executes the suite,
then no file fails because it is empty or imports a retired module.
Existing browser design helpers and login/session tests still run.
