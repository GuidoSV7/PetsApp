# RDD: global pet model

## Verdict

Ship. Shared GLB is persisted on disk and served to every home client.

## Checks

- Unit tests cover default / save / scale-only / clear / size / extension.
- Public GET meta + file; admin PUT/DELETE behind `@Roles(ADMIN)`.
- No DB migration (FS + meta.json); `PET_MODEL_DIR` for deploy volume.

## Residual risk

- Multi-instance backends need a shared volume (or object storage later).
- Admin seed credentials must match `/login` bootstrap so PUT gets a real JWT.
