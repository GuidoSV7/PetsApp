# Review: pet-home-reference-ui

## Verdict

**Allow** — Home care UI aligned to the PetsApp reference mock; procedural 3D Michi unchanged.

## Checklist

| Item | Status |
|------|--------|
| Header brand + coin pill (`+`) via `onCoinsChange` | OK |
| Stage card room gradient + Michi / `Nv. 1` / mood caption | OK |
| Speech bubble + orbit chevrons + interact hint | OK |
| Needs 2×2 with tone colors (NeedMeter) | OK |
| Care actions Alimentar / Jugar / Dormir / Bañar | OK |
| Personalizar strip + presets + Foto → camera/gallery | OK |
| Grey default coat (not green fur) | OK |
| Vitest pet-home 40/40 | OK |
| Compact `100dvh` shell, no footer/login chrome | OK |

## Notes

- Room furniture is CSS suggestion only (no GLTF scene).
- Coin balance lives in `HomeHeader`, not inside the stage.

## Follow-ups

- Optional GLTF room backdrop if photo-real depth is required.
- Accessory tiles beyond coat presets.
