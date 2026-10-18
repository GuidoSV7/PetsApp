# RDD

## Verdict

Ship. Specific `/petsapp-api/admin/pet-model` and `/petsapp-api/pet/model`
handlers beat the catch-all proxy, so Diseño 3D no longer depends on the Nest
image having those controllers.

## Residual

- Storage is on the frontend filesystem unless `PET_MODEL_DIR` is a mounted volume.
- JWT must validate against Nest `/auth/profile`.
