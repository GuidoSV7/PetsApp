# Design: playful mint UI

## Visual

- Background: soft mint `#e7f5ec` (not dark cyan).
- Surfaces: white cards, radius ~20–28px, light shadow.
- Accent green for bars / mood: `#2fbf6b`.
- Action tiles (square-ish): coral feed, teal play, amber sleep, sky bathe.
- Grey 3D cat stays on a white stage card; hint chip over the canvas.

## Stats (`pet-stats.ts`)

```ts
type PetNeeds = { hunger: number; fun: number; energy: number; hygiene: number };
// 0–100 integers
```

| Action | Effect | Coins |
|--------|--------|-------|
| Alimentar | hunger +18 | spend feed cost |
| Jugar | fun +16, energy −4 | earn pet reward |
| Dormir | energy +20 | — |
| Bañar | hygiene +18 | — |
| Tap / mimar | fun +8 + purr | earn pet reward |
| Coat capture | — | earn coat reward |

Clamp 0–100. Mood label from average: &lt;40 Bajo, &lt;70 Bien, else Feliz.

## Layout (top → bottom)

1. Header: brand · coins  
2. Mood card (speech = `PET_STATUS`)  
3. Pet card (badge mood, canvas, hint)  
4. Needs 2×2  
5. Action row (+ colores full-width secondary)
