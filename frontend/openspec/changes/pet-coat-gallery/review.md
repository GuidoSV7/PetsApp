# Review: pet-coat-gallery

## Verdict

**Allow** — Gallery upload beside camera; works when camera is denied.

## Checklist

| Item | Status |
|------|--------|
| «Subir de galería» in coat dialog | OK |
| `coatColorsFromFile` → `extractCoatColors` | OK |
| Gallery enabled when camera errors | OK |
| Camera capture path unchanged | OK |
| Vitest coat-from-image + dialog + suite green | OK |
| `tsc` clean | OK |

## Notes

- Uses `accept="image/*"`; mobile browsers typically open the photo library.
- Same `onColors` path as camera (including API persist from the stage).

## Follow-ups

- Optional crop / subject framing before sampling.
