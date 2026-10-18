# Review: align-frontend-auth-nestjs

## Verdict

**Allow** — minimal contract alignment; no redesign.

## Checklist

| Item | Status |
|------|--------|
| Auth login/register match NestJS bodies | OK |
| Roles `admin` / `super_admin` / `member` | OK |
| Admin list/detail use `userName`, `isBlocked`, `isVerified` | OK |
| Toggle uses `POST .../toggle-block` | OK |
| PATCH admin only `name` / `email` / `country` | OK |
| Member landing `/account` (name, email, logout) | OK |
| `.env.example` three vars only | OK |
| `.dockerignore` present | OK |
| `vitest` + `tsc` + `npm run build` | OK |
| Docker build on this host | Blocked (no docker.sock access for `agent`) |

## Risks / follow-ups

- Local `next build` hit SIGBUS once on a dirty `node_modules`; clean `npm ci` fixed it. Dokploy image uses Node 22 (Dockerfile) — preferred.
- Admin customers page filters `member` client-side; backend has no `role` query.
- After PATCH/toggle, detail reloads from GET because write endpoints return the public user row (`name`), not `CompleteUserDto`.
- Stale `traefik.me` fallback remains in `internalApiOrigin` for Netlify; production Dokploy should set `PETSAPP_API_INTERNAL_URL`.

## Diff focus

- `src/app/_lib/petsapp-api.ts` — client + admin API
- `src/features/auth/types/auth.types.ts` — `AdminUserResponse`
- Admin customers components + `/account`
- Auth Vitest suites
