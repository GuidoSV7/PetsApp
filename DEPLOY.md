# Deploying on Dokploy

Three services in one Dokploy project, all on the internal Dokploy network.

| Service  | Type                | Source                                                                 | Port |
| -------- | ------------------- | ---------------------------------------------------------------------- | ---- |
| Postgres | Dokploy database    | PostgreSQL image (`petsapp-db-3vi3tp`)                                 | 5432 |
| Backend  | Application, Docker | `Dockerfile` = `backend/Dockerfile`, build context `backend`, path `/` | 3000 |
| Frontend | Application, Docker | `Dockerfile` = `frontend/Dockerfile`, build context `frontend`, path `/` | 3000 |

Backend image: `node:24-alpine`. Frontend image: `node:22` (see `frontend/Dockerfile`).

## Backend start sequence

The container runs `node dist/db/migrate.js && exec node dist/main.js`:

1. Pending SQL migrations from `backend/drizzle/` are applied.
2. If migrations fail, the process exits 1 and the app does not start.
3. The NestJS app listens on `PORT` (default 3000).

A fresh, empty database needs nothing else. Bootstrap the first `super_admin`
with `npm run seed:admin` (or `node dist/db/seed-admin.js`) after the first
successful start — see `backend/README.md`.

## Backend environment

Set these in the backend application's Environment tab (runtime).

| Variable           | Required | Example / default | Notes |
| ------------------ | -------- | ----------------- | ----- |
| `DATABASE_URL`     | yes      | `postgresql://…@petsapp-db-3vi3tp:5432/petsapp` | Internal Dokploy Postgres host. |
| `DATABASE_SSL`     | yes\*    | `false` | Use `false` on the internal Dokploy network. SSL also turns on by default in production (`NODE_ENV=production` or `PROD=production`) unless this is `false`. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | no | `true` (when SSL is on) | Verifies the server certificate against system CAs (or `DATABASE_SSL_CA`). Set to `false` only for networks where the certificate cannot be verified — prefer `DATABASE_SSL_CA` first. |
| `JWT_SECRET`       | yes      | `openssl rand -base64 48` | At least 32 characters outside development. |
| `CLIENT_SECRET`    | yes\*    | long random string | `X-Client-Secret` for server-to-server calls. |
| `CORS_ORIGIN`      | yes      | public frontend origin | e.g. `https://petsapp-frontend-….sslip.io` — also the CSRF Origin allowlist. |
| `TRUST_PROXY`      | yes\*    | `1` | One hop (Traefik → app). Integer only. |
| `PORT`             | yes\*    | `3000` | Must match the Dokploy domain port. |
| `NODE_ENV`         | yes\*    | `production` | Never `development` in a deployment. |
| `JWT_EXPIRES_IN`   | no       | `12h` | Token and session cookie lifetime. |

\*Required for a correct production deploy even when the process can boot without it.

Optional seed-only vars (not needed at boot): `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`ADMIN_NAME` — see `backend/README.md` (`npm run seed:admin`).

### Postgres TLS

When SSL is on (explicit `DATABASE_SSL=true`, or production with no
`DATABASE_SSL=false`), the connection verifies the server certificate
(`rejectUnauthorized: true` by default). Set
`DATABASE_SSL_REJECT_UNAUTHORIZED=false` to opt out (for example, a provider
with an unverifiable internal certificate), or point `DATABASE_SSL_CA` at a CA
bundle to verify a private CA. `DATABASE_SSL=false` (the current Dokploy
internal-network setup) keeps working unchanged.

### Health checks

- `GET /` — liveness: the process is up (no database contact).
- `GET /health/ready` — readiness: runs `SELECT 1`; answers 503 while the
  database is unreachable. Public (no auth), safe for the platform probe.

## Frontend environment

`NEXT_PUBLIC_*` values are inlined at build time. Set them as Dokploy
**build arguments** (and keep the same values as runtime env when the platform
asks for both). Changing them requires a rebuild.

| Variable                       | When            | Example |
| ------------------------------ | --------------- | ------- |
| `NEXT_PUBLIC_PETSAPP_API_URL`  | build           | `https://<frontend-host>/petsapp-api` |
| `NEXT_PUBLIC_SITE_URL`         | build           | `https://<frontend-host>` |
| `PETSAPP_API_INTERNAL_URL`     | runtime         | `http://petsapp-backend-jaa6ki:3000` |

The browser talks only to the same-origin proxy
`/petsapp-api/*` (`frontend/src/app/petsapp-api/[...path]/route.ts`), which
forwards to `PETSAPP_API_INTERNAL_URL`. Prefer the public
`NEXT_PUBLIC_PETSAPP_API_URL` ending in `/petsapp-api` so the client stays on
the frontend host.

The runtime image sets `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`
and runs `node server.js` (Next.js `output: "standalone"`).

## Session cookies and Origin / CSRF

Session cookie names:

- Development / non-Secure: `petsapp_session`
- Production (`NODE_ENV=production` or `PROD=production`): `__Host-petsapp_session`
  (Secure, `Path=/`, no `Domain`, HttpOnly, `SameSite=Lax`)

Unsafe cookie requests (`POST /auth/login`, `POST /auth/logout`, and other
cookie-authenticated mutations) must send an allowed `Origin` (or
`Sec-Fetch-Site: same-origin`). `CORS_ORIGIN` is that allowlist — set it to the
public frontend origin only.

## Post-deploy smoke checklist

1. `GET` backend `/` → `{ "status": "ok" }` (or equivalent liveness body).
2. `GET` backend `/health/ready` → `{ "status": "ok" }` (database reachable).
3. Open the public frontend URL — home loads over HTTPS.
4. Register a member (`POST /auth/register` via the UI) — receives session
   cookie + lands on `/account` (or `/`).
5. Log out and log in again — cookie refreshed; member still blocked from
   `/admin/users` (403).
6. Seed a `super_admin` once (`node dist/db/seed-admin.js` with `ADMIN_*`),
   then log in — lands on `/admin` and can open `/admin/users`.
7. From the browser network panel, API calls go to `/petsapp-api/...` on the
   frontend host (not a cross-origin Traefik URL with a bad cert).
