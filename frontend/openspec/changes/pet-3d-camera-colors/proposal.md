# Proposal: 3D grey cat + camera coat colors

## Intent

Replace the SVG cat with a default **grey 3D** cat. Let the user capture a photo
of their real cat (device camera), sample coat colors, and tint the 3D cat to
match. Still UI-only (no backend persistence).

## Scope

### In scope

- Procedural 3D cat (R3F / Three.js), grey coat by default.
- Camera capture flow (getUserMedia → snapshot).
- Pure color extraction from image pixels → primary / secondary / accent.
- Apply sampled colors to the 3D materials.
- Vitest for extraction + stage wiring (3D viewer mocked in jsdom).

### Out of scope

- Photoreal GLTF asset, ML segmentation, saving coat to the account API.
- AR / WebXR.

## Success

Home shows a grey 3D Michi; after a photo, the coat updates to sampled colors;
tests green.
