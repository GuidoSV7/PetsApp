# Proposal: real pet backend (no local mock economy)

## Problem

The home UI still seeds coins/needs from local constants and keeps a parallel
coin/need mutation layer (`spendCoins`, `applyCareAction`) that looks like a
client-side mock economy. Persistence already exists on Nest (`/pet/*` +
`pet_states`), but the FE does not treat the API as the only authority.

## Goal

Frontend is a thin client of the real pet API. Backend rules + Drizzle
`pet_states` are the source of truth. No local care/coin transitions in prod UI.

## Scope

- FE: hydrate from `GET /pet/state`; actions/coat only via API; hide coins until
  loaded; drop local economy helpers from the product path.
- BE: HTTP + Drizzle (pglite) tests for `/pet/*` (not in-memory-only).
- Keep guest `X-Pet-Guest-Key` + `/petsapp-api` proxy.

## Out of scope

- Auth-bound pets (still anonymous guest key).
- Shared npm package for rules (constants stay mirrored for UI labels only).
