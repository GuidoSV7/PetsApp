# Spec: loading without a broken green window (S6, T2 first-frame half)

Task S6, verbatim:

> arreglar ese cuadro verde que aparece y tarda en cargar el gato

The defects to remove: a stage that shows an empty flat green rectangle that looks broken, and a
visual jump when the 3D field finally paints. Witnesses live in
`test/features/pet-home/field-placeholder.test.tsx`, `field-backdrop.test.ts`,
`room-integration.test.ts`, `pet-render-quality.test.ts` and `cat-3d-viewer.test.tsx`.

## R1 — The pre-3D affordance is the field, not loose text

`FieldPlaceholder` (the `dynamic(..., { ssr: false })` fallback) renders `FieldBackdrop`:

- sky + the 16 × 16 plate as a `<polygon>` and the 34 lattice lines as one `<path>`, in the authored
  4:5 frame (`viewBox="0 0 100 100"`, `preserveAspectRatio="none"`, percentages from the top-left);
- the plate polygon has ≥ 4 points and the lattice path contains real segments, so the affordance
  can never degrade to an empty rectangle;
- the whole backdrop is `aria-hidden="true"`; the `role="status"` "Cargando a {nombre}…" line is
  visually hidden (`.srOnly`) and never painted over the field;
- it imports no 3D module, so the placeholder bundle stays small and paints early.

## R2 — Same green, same framing token as the loaded field

- Green: the placeholder's `--field-ground` / `--field-line` CSS tokens equal `FIELD_PALETTE.ground`
  / `.line` — the exact sRGB the unlit 3D ground emits. There is no second green.
- Framing: the placeholder's plate and lattice come from the same `homeCameraView` +
  `catGroundY(modelScale)` tokens the viewer camera is applied with, projected by the same pinhole
  camera (`field-view.projectToFrame`, 35° FOV, 4:5 aspect). The placeholder is rendered with
  `yawDeg = FIELD_VIEW.yawDeg` and `zoom = 1`, i.e. the viewer's initial camera state, and the plate
  is clipped at the same `near = 0.05` plane, because the plate runs under the camera.
- Therefore the first WebGL frame lands on the picture that was already on screen: no jump in
  colour, no jump in framing, no empty rectangle in between.

## R3 — The backdrop is also the loaded state's floor

- `Cat3DViewer` (home variant) keeps `FieldBackdrop` mounted behind a **transparent** canvas
  (`alpha: true`, and `.canvasHostField { background: none }`, so the host never paints a second
  green under it).
- The backdrop receives the live `yawDeg` / `zoom` / `modelScale`, so rotating or zooming the field
  moves the backdrop with the camera; the head close-up zooms in over it and the opaque field grows
  over the backdrop instead of exposing it.

## R4 — Cheap first frame on the low tier

- Device tier comes from client hints (`deviceMemory`, falling back to `hardwareConcurrency`).
- Low tier (`deviceMemory ≤ 2`, or `≤ 2` cores when memory is unreported):
  **first frame at DPR 1 and `antialias: false`** — one device pixel per CSS pixel, no multisample
  buffer. Both values are chosen once on mount.
- Mid/high tier: first frame at `maxDprForDevice(hints)` (bounded by the reported DPR) with
  `antialias: true`, exactly as before this change.
- After that first frame the existing adaptive behaviour is unchanged: the `PerformanceMonitor`
  raises or lowers the numeric `dpr` between `1` and the device ceiling, and MSAA is **not**
  re-evaluated when DPR adapts (it stays off on the low tier for the mount's lifetime).
