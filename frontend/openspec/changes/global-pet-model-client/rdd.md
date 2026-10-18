# RDD: global model client

## Verdict

Ship. Confirm publishes via Nest; home loads the public file URL.

## Checks

- Login prefers Nest JWT, falls back to local session for panel-only access.
- Admin confirm/reset hit `/admin/pet-model`.
- PetHomeStage passes global `modelScale` into `Cat3DViewer`.
- Multipart upload strips default JSON Content-Type.

## Residual risk

- Without a successful Nest admin login, upload returns 401 (expected).
