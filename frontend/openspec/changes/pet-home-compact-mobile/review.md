# Review: pet-home-compact-mobile

## Verdict

**Allow** — Compact mobile density; mood merged into pet card; shell locks to `100dvh`.

## Checklist

| Item | Status |
|------|--------|
| `PET_LAYOUT_MODE = compact`, frame ≤ 180px | OK |
| Stage `data-layout="compact"` + CSS vars | OK |
| Separate mood card removed (speech inside pet card) | OK |
| Tighter header / main / needs / actions | OK |
| Home `100dvh` + `overflow: hidden` | OK |
| Features retained (needs, care, coins, coat, 3D) | OK |
| Vitest 49/49; `tsc` clean | OK |

## Notes

- Very short phones (&lt;640px height) may still clip slightly; density tokens can drop further if needed.
- Inline CSS vars pin the compact budget even when media queries would grow the frame.

## Follow-ups

- Optional hide “Colores” behind a small icon to reclaim one row.
