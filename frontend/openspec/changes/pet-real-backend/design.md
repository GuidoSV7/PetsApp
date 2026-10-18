# Design: thin FE + real BE pet state

## Authority

| Concern | Owner |
|---------|--------|
| coins / needs / coat / status / mood | Backend `PetService` + `pet-rules` + Drizzle |
| guest key | FE `localStorage` → `X-Pet-Guest-Key` |
| labels (Hambre, Monedas:) | FE display-only |
| color extraction from photo | FE (client canvas) then `POST /pet/coat` |

## FE changes

- `HomePage` coins: `number | null` until `onCoinsChange` from API.
- `PetHomeStage`: `ready` flag; disable care until hydrate; no fake balance.
- Remove `spendCoins` / `earnCoins` / `canAfford` / `applyCareAction` from
  product code. Keep `coinsLabel`, `NEED_LABELS`, types.
- UI tests stub the HTTP module at the boundary (not a local rules engine).

## BE changes

- `DrizzlePetRepository` + `PetService` / `PetController` tests on pglite
  (real SQL migrations). In-memory pet repository removed.
- Product path: `DrizzlePetRepository` only.
