# Design: pet state API

## Identity

- Header `X-Pet-Guest-Key: <uuid>`.
- Invalid/missing key → `400`.
- One row per `guest_key` (unique). Auto-create with defaults on first GET.

## Table `pet_states`

coins, hunger, fun, energy, hygiene, coat_primary/secondary/accent, status_key,
timestamps.

## Rules (`pet-rules.ts`)

Mirror frontend:

| Action | Needs | Coins |
|--------|-------|-------|
| feed | hunger +18 | −5 (refuse if broke) |
| play | fun +16, energy −4 | +2 |
| sleep | energy +20 | — |
| bathe | hygiene +18 | — |
| pet | fun +8 | +2 |
| coat | — | +5 |

## Endpoints (`@Public()`)

- `GET /pet/state`
- `POST /pet/actions/:action` (`feed|play|sleep|bathe|pet`)
- `POST /pet/coat` body `{ primary, secondary, accent }` hex colors

Response DTO includes needs, coat, coins, statusKey, mood.

## Frontend

- Persist guest UUID in `localStorage`.
- `PetHomeStage` hydrates from GET; actions/coat call API and replace state.
