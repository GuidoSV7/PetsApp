# Review: pet-real-backend

## Verdict

**Allow** — FE is a thin client of Nest `/pet/*`; rules + `pet_states` own the economy.

## Checklist

| Item | Status |
|------|--------|
| No local `spendCoins` / `applyCareAction` in product code | OK |
| Coins hidden until API hydrate (`HomeHeader`) | OK |
| Care locked until `GET /pet/state` succeeds | OK |
| Guest key → `X-Pet-Guest-Key` | OK |
| BE PetService / Controller / Drizzle on pglite | OK |
| Removed unused `InMemoryPetRepository` | OK |
| FE vitest pet-home 37/37 | OK |
| BE vitest `src/pet` 17/17 | OK |

## Notes

- UI tests stub the HTTP module at the boundary (`pet-api-stub.ts`); they do not
  implement a second product economy.
- Supertest HTTP listen is blocked on this agent host (`EACCES`); controller +
  Drizzle cover the real persistence path instead.

## Follow-ups

- Bind pets to authenticated users when accounts land on home.
- Ensure production migrate applies `0001_pet_states` before traffic.
