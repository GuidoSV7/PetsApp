# Design: room + glass UI

## Asset

- Source image → `frontend/public/imagenes/pet-room-bg.png`
- Constant `PET_ROOM_BG = "/imagenes/pet-room-bg.png"`

## Shell

- Authenticated Nest / Pollar home root uses `contenedorPlay` +
  `data-home-theme="room"`.
- Background: `cover` center, soft green fallback color.
- Login gate keeps the existing flat green shell (no room bg).

## Chrome (from mock, without meters)

1. **Header** — transparent over the room; brand left; coin pill + circular
   logout/gear control right.
2. **Profile glass card** — frosted white card with coat-color avatar circle,
   name editor, mood line, compact Personalizar (green pill).
3. **Pet stage** — no green gradient card; transparent so the room shows;
   speech bubble stays; cat canvas centered over the rug area.
4. **Care row** — four pastel tiles (feed/play/sleep/bathe) with tinted icons
   and dark labels (mock style).

## Explicitly out

- Need meter card / bars (already removed; must not return).
