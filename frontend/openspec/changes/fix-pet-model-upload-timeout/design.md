# Design

`assertAdminBearer`:

1. Missing/invalid Authorization → 401 immediately.
2. Token equals `HARDCODED_ADMIN_TOKEN` → ok (bootstrap panel).
3. Else `GET {internal}/auth/profile` with `AbortSignal.timeout(3000)`.
4. Abort/network → 502 with a short message (no hang).

`uploadGlobalPetModel` uses `timeout: 120_000`.
