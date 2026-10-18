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
| `DATABASE_SSL`     | yes\*    | `false` | Use `false` on the internal Dokploy network. |
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

## Frontend environment

`NEXT_PUBLIC_*` values are inlined at build time. Set them as Dokploy
**build arguments** (and keep the same values as runtime env when the platform
asks for both). Changing them requires a rebuild.

| Variable                       | When            | Example |
| ------------------------------ | --------------- | ------- |
| `NEXT_PUBLIC_PETSAPP_API_URL`  | build           | `https://<frontend-host>/petsapp-api` |
| `NEXT_PUBLIC_SITE_URL`         | build           | `https://<frontend-host>` |
| `PETSAPP_API_INTERNAL_URL`     | runtime         | `http://petsapp-backend-jaa6ki:3000` |
| `PET_MODEL_DIR`                | runtime         | `/data/pet-model` | Optional volume for the shared admin GLB (BFF routes under `/petsapp-api/pet/model`). |

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
2. Open the public frontend URL — home loads over HTTPS.
3. Register a member (`POST /auth/register` via the UI) — receives session
   cookie + lands on `/account` (or `/`).
4. Log out and log in again — cookie refreshed; member still blocked from
   `/admin/users` (403).
5. Seed a `super_admin` once (`node dist/db/seed-admin.js` with `ADMIN_*`),
   then log in — lands on `/admin` and can open `/admin/users`.
6. From the browser network panel, API calls go to `/petsapp-api/...` on the
   frontend host (not a cross-origin Traefik URL with a bad cert).
