# Spec: pet interact

- Stage shows an interaction hint mentioning girar and ronronear / tocar.
- `Cat3DViewer` accepts `onPetInteract` and invokes it when the cat is activated
  (click/tap path; tested via mock in jsdom).
- Activating the cat updates live status to the purring / petted copy.
- `Acariciar` plays a purr via `createPurrPlayer().play()` (mocked in tests).
- `createPurrPlayer` returns `{ play, stop }`; `play` starts audio graph nodes;
  `stop` ends them; missing AudioContext → no throw.
