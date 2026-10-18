# Proposal: Fix Diseño 3D upload timeout

## Problem

Confirming a GLB hangs until axios times out (~30s). The BFF waits on Nest
`GET /auth/profile` with no AbortSignal; when `PETSAPP_API_INTERNAL_URL` is
missing/slow, or the session is the hardcoded bootstrap token, the call stalls.

## Solution

1. Accept the known hardcoded admin bearer without calling Nest.
2. Bound Nest profile checks with a short AbortSignal (3s).
3. Raise upload client timeout for large multipart bodies.
