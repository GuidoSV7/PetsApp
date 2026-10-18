# Review: pet-3d-camera-colors

## Verdict

**Allow** — SVG replaced by procedural grey 3D cat; camera coat sampling works client-side.

## Checklist

| Item | Status |
|------|--------|
| Default coat `DEFAULT_GREY_COAT` grey | OK |
| R3F `Cat3DModel` / `Cat3DViewer` (dynamic, no SSR) | OK |
| `extractCoatColors` ignores near-white / near-black | OK |
| Button «Colores de mi gato» opens camera dialog | OK |
| Captured palette applied to 3D materials + coated status | OK |
| SVG `CatIllustration` removed | OK |
| Vitest pet-home 8/8; full suite 25/25 | OK |
| `tsc --noEmit` clean | OK |
| Still UI-only (no API persistence) | OK |

## Notes

- Color extraction is histogram buckets on mid-tones (not ML segmentation); busy backgrounds can skew the palette.
- WebGL requires a capable browser; camera needs HTTPS (or localhost) + user permission.
- Coat is session-local until a later persistence story.

## Follow-ups (when you say so)

- Persist coat per account.
- Optional GLTF breed variants.
- Soft-segment subject before sampling (better outdoor photos).
