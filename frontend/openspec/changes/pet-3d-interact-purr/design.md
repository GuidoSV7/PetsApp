# Design: 3D interaction + purr

## Rotate

- `@react-three/drei` `OrbitControls`: rotate only (no pan), limited polar angle,
  damping on. Idle auto-yaw on the model pauses while the user orbits
  (`controls` listening via `onStart` / `onEnd`).

## Tap / click

- Pointer events on the cat `group` (`onClick` / `onPointerDown`).
- Visual: short scale “happy bounce” driven by a `mood` prop / local impulse.
- Callback `onPetInteract()` → parent sets status + plays purr.

## Purr audio

- Procedural Web Audio (no binary asset): low oscillator + amplitude LFO
  ≈ cat rumble (~25–40 Hz carrier feel via filtered noise/osc mix).
- Module `pet-purr.ts`: `createPurrPlayer({ context })` with `play()` / `stop()`.
- Safe no-op when `AudioContext` unavailable (SSR / denied).
- Respect `prefers-reduced-motion` for bounce intensity; audio still plays unless
  the browser blocks it (user gesture required — click/Acariciar count).

## UI copy

- Hint under/over frame: “Arrastrá para girar · Tocá para ronronear”.
- Status on interact reuses / extends `PET_STATUS.petted` (ronronea).

## Testing

- Unit: `createPurrPlayer` schedules audio nodes against a mock `AudioContext`.
- Stage: mock `Cat3DViewer` exposing interact trigger; assert status + player called.
