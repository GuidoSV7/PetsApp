# PetsApp backend

NestJS 12 API (ESM, strict TypeScript, Vitest) providing authentication, users
and roles/permissions on PostgreSQL through Drizzle ORM.

## Modules

| Module | Responsibility |
| --- | --- |
| `src/auth` | Login/logout with a JWT delivered both in the body and in an HttpOnly session cookie, CSRF origin checks, `JwtStrategy` (Bearer header or cookie), `GlobalAuthGuard` (APP_GUARD), `JwtAuthGuard`, `RolesGuard`, `@Public()`, `@Roles()`, `@CurrentUser()`. |
| `src/users` | `UsersService`, `/users/me` (own profile) and `/admin/users` (administration). Port `UserRepository` with a Drizzle adapter and an in-memory adapter verified by the same contract spec. |
| `src/roles` | Role catalog (`admin`, `super_admin`, `member` plus custom roles) with a permission list from `permission-catalog.ts`, `user_roles` join, role rank (`role-rank.ts`). Port `RoleRepository` with Drizzle and in-memory adapters. |
| `src/database` | `DatabaseModule` (pg pool + Drizzle, global), SSL and credential resolution, Postgres error helpers. |
| `src/db` | Drizzle schema (`users`, `roles`, `user_roles`) and inferred row types. |
| `src/config` | CORS policy, trust-proxy and cookie-parser setup, env parsing helpers. |
| `src/logging` | Structured log helpers (`traceWrite`). |
| `src/testing` | Postgres column semantics for in-memory fakes and the pglite harness. |

Each feature module keeps a ports-and-adapters layout: `ports/` (interfaces
and DI tokens), `infrastructure/` (Drizzle adapters), `testing/` (in-memory
adapters, contracts, fixtures).

## HTTP surface

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/` | public liveness probe |
| `POST` | `/auth/login` | public, origin-checked, 10 req/min per IP |
| `POST` | `/auth/register` | public, origin-checked, 10 req/min per IP |
| `POST` | `/auth/logout` | public, origin-checked |
| `GET` | `/auth/profile` | authenticated |
| `POST` | `/auth/change-password` | authenticated |
| `POST` | `/auth/verify-password` | authenticated |
| `GET` `PATCH` `DELETE` | `/users/me` | authenticated |
| `GET` | `/admin/users`, `/admin/users/:id` | admin |
| `PATCH` | `/admin/users/:id` | admin |
| `POST` | `/admin/users/:id/toggle-block` | admin |
| `PUT` | `/admin/users/:id/roles` | super admin |
| `GET` | `/admin/roles` | admin |
| `POST` | `/admin/roles` | super admin |
| `PATCH` | `/admin/roles/:code` | super admin |

### Public registration

`POST /auth/register` creates a `member` account and signs it in: the answer
is exactly the login answer (`{ user: { id, name, email, role, roles,
country }, token }` plus the HttpOnly session cookie).

```json
{ "email": "ana@example.com", "password": "at-least-8", "name": "Ana", "country": "BO" }
```

- `email` is stored lower-cased and trimmed; a taken email answers `409`.
- `password` must have at least 8 characters (same rule as
  `/auth/change-password`); it is stored as a bcrypt hash.
- `country` is optional, ISO 3166-1 alpha-2, stored upper-cased.
- The role cannot be chosen: every sign-up is a `member`. Admins are promoted
  by a super admin through `PUT /admin/users/:id/roles`.

Authentication accepted by the global guard, in order: `Authorization: Bearer
<jwt>`, the session cookie (`petsapp_session`, or `__Host-petsapp_session` in
production), or `X-Client-Secret: <CLIENT_SECRET>` for server-to-server calls.
Unsafe requests carrying the cookie must send an allowed `Origin` (or
`Sec-Fetch-Site: same-origin`).

## Environment variables

See `.env.example`. Summary:

- `DATABASE_URL` (required), `DATABASE_SSL`, `DATABASE_SSL_CA`,
  `DATABASE_SSL_REJECT_UNAUTHORIZED`, `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`
- `JWT_SECRET` (required outside `NODE_ENV=development`, 32+ chars), `JWT_EXPIRES_IN`
- `CLIENT_SECRET`
- `CORS_ORIGIN`, `CORS_ENABLED`
- `NODE_ENV`, `PROD`, `PORT`, `TRUST_PROXY`

## Scripts

```bash
npm run start:dev      # watch mode
npm run build          # nest build (tsc)
npm test               # vitest unit + in-process e2e specs (no database needed)
npm run test:e2e       # boots AppModule (test/*.e2e-spec.ts)
npm run lint           # oxlint
npm run db:generate    # drizzle-kit generate (offline)
npm run db:check       # drizzle-kit check (offline)
npm run db:migrate     # drizzle-kit migrate (needs DATABASE_URL)
npm run db:migrate:prod # node dist/db/migrate.js: applies drizzle/ to DATABASE_URL (container start)
```

The Drizzle repository specs run against an in-memory PostgreSQL (pglite)
with the real migrations from `drizzle/`, so the full test suite needs no
running database.
