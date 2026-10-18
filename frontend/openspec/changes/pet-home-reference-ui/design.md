# Design

## Shell

- Mint page `#e8f6ee`.
- Sticky/static header: BrandMark + PetsApp | `CoinBalance` (+ button visual).
- Coins lifted to `HomePage` via `onCoinsChange` from `PetHomeStage`.

## Stage card

- Full-width rounded card with CSS “room” gradient (floor/wall), not a photo.
- Overlay top-left: **Michi** + `Nv. 1` pill + mood caption.
- Speech bubble over canvas (status copy).
- Left/right chevrons adjust `yawBias` on `Cat3DModel`.
- Hint chip bottom-center.

## Needs / actions

- `NeedMeter` tone colors on icon well + bar (hunger red, fun green, energy
  amber, hygiene blue).
- Care buttons: column icon + label, saturated fills.

## Personalizar

- Card titled “Personalizar a Michi” / “Colores, accesorios y más”.
- Horizontal presets (DEFAULT_GREY + curated coats) applying via API.
- Extra tile opens `CameraCoatCapture` (camera + gallery).
