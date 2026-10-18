# RDD

## Verdict

Ship. Nest exposes POST (primary) + PUT alias. Frontend BFF owns the same
paths so a lagging Nest image no longer 404s the browser.

## Residual

- Admin upload still needs a real Nest JWT (`/auth/profile`); hardcoded local
  session alone → 401.
- Optional `PET_MODEL_DIR` volume on the frontend for persistence across restarts.
