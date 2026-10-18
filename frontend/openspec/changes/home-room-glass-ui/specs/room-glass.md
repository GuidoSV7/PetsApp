# Spec: room glass home

- `PET_ROOM_BG` points at `/imagenes/pet-room-bg.png`.
- Authenticated home root has `data-home-theme="room"`.
- Play shell uses the room background image (CSS `background-image` includes
  `pet-room-bg`).
- Stage exposes a profile region (`data-purpose="pet-profile-card"`).
- Home does not show Hambre / Diversión / Energía / Higiene meter labels.
- Care actions Alimentar / Jugar / Dormir / Bañar remain.
- Personalizar toggle remains near the profile card.
