# Review: pet-state-api

## Verdict

**Allow** — Guest-keyed pet persistence with care/coat API; frontend hydrates from it.

## Checklist

| Item | Status |
|------|--------|
| `pet_states` schema + `0001_pet_states` migration | OK |
| Pure `pet-rules` match frontend economy/needs | OK |
| `GET /pet/state`, `POST /pet/actions/:action`, `POST /pet/coat` `@Public` | OK |
| Guest UUID via `X-Pet-Guest-Key` | OK |
| In-memory + Drizzle repositories | OK |
| Frontend `pet.service` + `PetHomeStage` sync | OK |
| Backend pet unit tests 11/11; frontend 49/49 | OK |
| Pet-related `tsc` clean | OK |

## Deploy note

Run `npm run db:migrate` / `db:migrate:prod` on the API host so `pet_states` exists before traffic hits `/pet/*`.

## Notes

- Auth e2e suite still hits `listen EACCES` in this agent environment (pre-existing); pet unit tests are green.
- Guest key is localStorage-scoped (device/browser), not account-bound yet.

## Follow-ups

- Bind pet row to `user_id` when login returns.
- Decay needs over time server-side.
