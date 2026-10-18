# Design: global pet model

## Storage

Directory `PET_MODEL_DIR` (default `uploads/pet-model`):

- `active.glb` — binary when kind is `glb`
- `meta.json` — `{ kind, fileName, mimeType, modelScale, updatedAt }`

## HTTP

| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/pet/model` | public | → meta + `fileUrl` |
| GET | `/pet/model/file` | public | → GLB bytes (404 if procedural) |
| PUT | `/admin/pet-model` | admin+ | multipart `file?` + `modelScale` |
| DELETE | `/admin/pet-model` | admin+ | → back to procedural |

Max upload 12 MiB. Accept `.glb` / `.gltf`.

## Service

`GlobalPetModelService` — pure FS helpers tested without Nest HTTP.
Controllers thin.
