# Design: starting coins = 5

- `STARTING_COINS = 5` in Nest `pet-rules` (source of truth).
- Drizzle `pet_states.coins` default → 5 + migration.
- Frontend API test stub mirrors `API_STARTING_COINS = 5`.
- Existing guest balances are unchanged; only new creates use 5.
