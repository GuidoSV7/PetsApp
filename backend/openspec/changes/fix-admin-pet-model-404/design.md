# Design

## Routes

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/admin/pet-model` | admin JWT | primary upsert (multipart) |
| PUT | `/admin/pet-model` | admin JWT | alias, same handler |
| DELETE | `/admin/pet-model` | admin JWT | clear |
| GET | `/pet/model` | public | unchanged |

Both POST and PUT share one private `upsert` implementation with
`FileInterceptor` + `UpsertGlobalPetModelDto`.

## Deploy note

A Nest `Cannot PUT|POST /admin/pet-model` after frontend ships means the
**backend service must be rebuilt/redeployed** from the same commit.
