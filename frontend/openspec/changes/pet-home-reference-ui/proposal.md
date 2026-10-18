# Proposal: reference PetsApp home UI

## Intent

Restyle the home to match the provided PetsApp mock: header coins, immersive
pet stage, colored need meters, icon care actions, and a **Personalizar** strip
(coat presets + camera/gallery). Keep the current procedural 3D Michi.

## Scope

### In scope

- Header: brand + coin pill (with + affordance).
- Pet stage card: room-like backdrop, name/Nv badge, mood line, speech bubble,
  orbit chevrons, interact hint.
- Needs 2×2 with tone-colored fills/icons (SVG, no emoji).
- Care buttons with SVG icons.
- Personalizar card: preset coats carousel + open camera/gallery.
- Vitest for new chrome labels / personalize controls.
- Keep API sync + gallery upload from prior work.

### Out of scope

- Real GLTF room/cat asset, accessory inventory backend, shop purchases.

## Success

UI closely follows the mock; Michi 3D unchanged in spirit; tests green.
