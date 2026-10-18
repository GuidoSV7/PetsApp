# Review: pet-3d-interact-purr

## Verdict

**Allow** — Orbit, tap reaction, and procedural purr wired; tests green.

## Checklist

| Item | Status |
|------|--------|
| OrbitControls (rotate, no pan/zoom) | OK |
| Idle yaw pauses while orbiting | OK |
| Click/tap cat → bounce + status + purr | OK |
| Acariciar triggers purr | OK |
| Affordance hint (girar / ronronear) | OK |
| `createPurrPlayer` safe without AudioContext | OK |
| Vitest pet-home 14/14; full suite green | OK |
| `tsc --noEmit` clean | OK |
| UI-only (no API) | OK |

## Notes

- Purr is synthesized (triangle + LFO), not a recorded sample — browsers may mute until a user gesture (click/Acariciar satisfy that).
- Orbit vs click: short drags rotate; a click without drag still fires `onClick` on the cat group.

## Follow-ups (when you say so)

- Optional mute toggle / volume.
- Meow variant on feed.
- Keyboard rotate affordance for a11y beyond aria-label.
