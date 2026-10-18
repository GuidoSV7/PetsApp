# RDD

## Verdict

Ship. Bootstrap admin sessions no longer block on Nest for GLB confirm.

## Residual

- Hardcoded bearer is a temporary bootstrap; prefer Nest JWT in production long-term.
- Very large uploads still need the 120s client timeout and a durable `PET_MODEL_DIR`.
