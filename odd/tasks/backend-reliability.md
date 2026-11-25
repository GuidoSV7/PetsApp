# Backend reliability and config hardening

Branch `fix/backend-reliability`, worktree `.worktrees/audit-backend-reliability`.
Source: 2026-11 audit (Engram `petsapp/audit/backend-reliability`,
`petsapp/audit/backend-security-remaining`). NO schema or migration changes here
(the account-security branch owns migrations this round).

## Specs

- S1 Pet first write is race-safe: concurrent first requests with the same
  `X-Pet-Guest-Key` never answer 500; both get the same pet row
  (`INSERT ... ON CONFLICT (guest_key) DO NOTHING RETURNING` then re-read).
  A spec fires concurrent first requests and asserts one row and no 500.
- S2 Pet mutations (care actions, coat, rename) do not lose updates: read the row
  `FOR UPDATE` inside a transaction (or equivalent atomic SQL). A spec runs N
  concurrent identical care actions and asserts the result equals N sequential ones
  (clamped by the rules).
- S3 A pet row vanishing mid-update answers 404, not a plain `Error` → 500.
- S4 Pet endpoints get a throttle: pet creation/read 60 per minute per client,
  `POST /pet/actions/:action` 30 per minute per client (429 beyond).
- S5 Creating a duplicate role under a race answers 409 (map 23505), not 500;
  the sequential duplicate keeps its current answer.
- S6 CSRF Origin allowlist fails closed: outside explicit local development, an
  empty `CORS_ORIGIN` yields an empty allowlist for `AuthOriginGuard` and
  `GlobalAuthGuard` (no `localhost:3000` fallback), matching CORS. Boot logs a warning.
- S7 Postgres TLS: when SSL is on in production, `rejectUnauthorized` defaults to
  `true`; `DATABASE_SSL_REJECT_UNAUTHORIZED=false` is the explicit opt-out.
  Production detection uses the shared `isProductionEnv` (NODE_ENV or PROD).
  `DATABASE_SSL=false` (current Dokploy internal network) keeps working unchanged.
  Document in DEPLOY.md.
- S8 Readiness: add `GET /health/ready` (public) that runs `SELECT 1` and answers
  503 when the database is unreachable; existing liveness endpoint unchanged.
- S9 `seed-admin` no longer logs the admin email (log the user id).

## Tasks

| ID | Specs | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1, S2, S3, S4 | worker | |
| T2 | S5 | worker | |
| T3 | S6, S7, S8, S9 | worker | |

## Log

- L1 (user, verbatim): "Haceme una investigación exhaustiva de nuestro software, quiero que busques errores, problemas, vulnerabilidades, y mejores el diseño la UI/UX bsucanlas mejores prácticas en internet y hagamoslo que esté software sea el mejor posible"
- L2 (user, verbatim): "Todas haceme en worktrres paralelos las que puedas hacer"
- L3 (parent): test Postgres at `TEST_DATABASE_URL=postgres://petsapp_test:petsapp_test@127.0.0.1:55491/petsapp_test`.
