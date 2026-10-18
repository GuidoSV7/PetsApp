# Proposal: playful mint pet-home UI

## Intent

Restyle the home pet stage to a **light mint, card-based** care UI inspired by
playful pet apps: mood card, white 3D stage card, 2×2 need meters, and colorful
care actions — while keeping grey Michi, coins, purr/orbit, and coat camera.

## Scope

### In scope

- Light mint page shell (home) + PetsApp header with coins.
- Local need stats: Hambre, Diversión, Energía, Higiene (pure module + UI).
- Actions: Alimentar, Jugar, Dormir, Bañar (+ Colores de mi gato).
- Mood / speech line derived from status + stats.
- Vitest for stats rules and stage structure.

### Out of scope

- Backend persistence, real shop, streaks, leveling server-side.

## Success

Home reads as a mint care dashboard; stats move with actions; existing coin /
coat / purr behaviors still work; tests + review pass.
