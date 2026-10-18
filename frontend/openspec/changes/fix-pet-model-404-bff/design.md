# Design

## Why BFF

Dokploy runs frontend and backend as separate apps. A Nest 404 means the
backend process simply lacks the route. The browser only talks to
`/petsapp-api/*`, so a specific App Router handler can own the feature without
waiting on the Nest image.

## Auth

Admin writes call `GET {internal}/auth/profile` with the client Bearer token.
Accept `admin` / `super_admin`. Hardcoded local-only tokens fail → 401.

## Storage

`lib/global-pet-model-store.ts` — same shape as Nest `GlobalPetModelMeta`.
Directory: `PET_MODEL_DIR` or `os.tmpdir()/petsapp-pet-model`.
