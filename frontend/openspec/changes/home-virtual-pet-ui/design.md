# Design: home virtual pet UI

## Composition (first viewport)

1. Sticky header: PetsApp mark + Iniciar sesión.
2. Main stage (one composition): brand wordmark, one short line, **cat** as the
   dominant center visual, status text, action row under the cat.
3. Light footer kept for now (can shrink later).

## Cat

Inline SVG illustration (no emoji, no stock photo). Soft bob / breathe motion
via CSS. Accessible name: `Michi` (or `Tu gato`).

## Actions (UI only)

| Button | Local status copy |
| --- | --- |
| Alimentar | `¡Ñam! Michi está contento.` |
| Acariciar | `Michi ronronea contigo.` |

Initial status: `Michi te mira con curiosidad.`

No network calls. State lives in the home component.

## Visual direction

Keep existing dark shell (`--fondo`, cyan `--primario`). Pet stage uses a soft
radial glow behind the cat (atmosphere, not a card). Action buttons as primary
controls, not nested cards. Motion: cat bob, status fade-in, button press scale.
