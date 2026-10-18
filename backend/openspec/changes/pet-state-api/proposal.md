# Proposal: persisted pet state API

## Intent

Persist Michi’s **coins, needs, coat, and status** so care actions work against
the Nest/Postgres API (guest key, no login required on home).

## Scope

### In scope

- `pet_states` table + migration.
- Pure care/coin rules (same numbers as the frontend).
- Public API: `GET /pet/state`, `POST /pet/actions/:action`, `POST /pet/coat`.
- Guest identity via `X-Pet-Guest-Key` (UUID).
- Frontend home loads/saves through the API.
- Vitest for rules + service (in-memory repo).

### Out of scope

- Auth-bound pets, shop, streaks, realtime multiplayer.

## Success

Feeding/playing/etc. and coat capture update a DB-backed state returned by the
API; frontend reflects it; tests + review pass.
