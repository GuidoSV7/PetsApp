# PetsApp

Monorepo for the PetsApp product: NestJS API, Next.js UI, and a reserved
Soroban contract workspace.

| Path        | Role |
| ----------- | ---- |
| `backend/`  | NestJS 12 API (Drizzle + PostgreSQL, Vitest, oxlint) |
| `frontend/` | Next.js 16 app (same-origin `/petsapp-api` proxy) |
| `contract/` | Reserved Soroban / Stellar contract workspace |

Deployment on Dokploy (services, env, cookies, smoke checks): see [DEPLOY.md](./DEPLOY.md).
