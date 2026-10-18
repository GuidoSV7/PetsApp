# Proposal: BFF for global pet model (fix Nest 404)

## Problem

`PUT/POST /petsapp-api/admin/pet-model` returns Nest `Cannot PUT|POST …` (404)
when the frontend ships before the backend image includes the new controllers.

## Solution

Handle these paths in Next (more specific than `[...path]` catch-all):

- `POST|PUT|DELETE /petsapp-api/admin/pet-model` — FS store + Nest JWT check via `/auth/profile`
- `GET /petsapp-api/pet/model` (+ `/file`) — public read from the same store

Same disk layout as the Nest service (`meta.json` + `active.glb`). Persist with
`PET_MODEL_DIR` volume on the frontend container when needed.
