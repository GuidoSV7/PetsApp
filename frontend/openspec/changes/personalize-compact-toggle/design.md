# Design: Personalizar compact toggle

## Placement

- Move `PersonalizeStrip` into `stageMeta` (top of the pet card), beside
  name/mood — not below care actions.
- Default: collapsed. Only a compact toggle button labeled **Personalizar**.

## Interaction

- Toggle sets `aria-expanded` and shows/hides a panel (`aria-controls`).
- Open panel: horizontal preset swatches + Foto (same APIs as today).
- Panel is absolutely positioned under the toggle (`z-index` above canvas)
  so expanding does not push the care grid down much.
- Clicking Foto still opens `CameraCoatCapture`.
- Selecting a preset / capturing closes optional — leave open so users can
  try multiple coats (no forced close).

## CSS

- Smaller tiles (~40px), tight panel padding, max-width ~min(100%, 280px).
- Drop the big header card (“Colores, accesorios y más”).
