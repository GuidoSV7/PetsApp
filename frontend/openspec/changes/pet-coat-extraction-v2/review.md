# Review: pet-coat-extraction-v2

## Verdict

**Allow** — Center-weighted fur extraction; camera/gallery crop; clearer hint.

## Checklist

| Item | Status |
|------|--------|
| Solid brown / grey fur still map correctly | OK |
| Center subject beats edge background | OK |
| Grass green rejected when orange fur centered | OK |
| Mid-dark grey fur accepted | OK |
| `cropCenterImageData` + camera/gallery use | OK |
| Hint asks to center the pet | OK |
| Vitest pet-home 45/45 | OK |

## Notes

- Strong sky blues / lawn greens are filtered as non-fur.
- No ML segmentation; large off-center pets can still miss — user hint covers that.

## Follow-ups

- Optional on-screen reticle over the live video preview.
