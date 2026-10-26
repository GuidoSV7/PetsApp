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
| `src/testing` | Postgres column semantics for in-memory fakes and the isolated PostgreSQL test harness. |

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

### Pet coat patterns

Pet endpoints use the existing UUID `X-Pet-Guest-Key` header. `GET /pet/state`
returns `coat` with the existing `primary`, `secondary`, `accent` colors and
a required `pattern`. New pets use `solid`.

`POST /pet/coat` still requires all three valid `#RRGGBB` colors and returns
the updated state with status201. The pattern is optional:

```json
{ "primary": "#aabbcc", "secondary": "#ddeeff", "accent": "#123456", "pattern": "calico" }
```

- Ordered persisted identifiers: `solid`, `tabby`, `tuxedo`, `calico`, `pointed`.
  Append values only; never rename, remove or reorder stored identifiers.
- Omitting `pattern` preserves the saved pattern, including colors-only
  customization/camera requests. Explicit known values replace it.
- An unknown string such as `striped` receives400 from the shared DTO pipe
  (`pattern must be one of the following values: solid, tabby, tuxedo, calico, pointed`).
  The service independently rejects invalid supplied values, including null,
  with400/`Unknown coat pattern` before creating or updating state.
- Unknown database values read as `solid` without a read-time repair write.
  No pattern price, shop restriction or change to other pet endpoints is added.
- Bootstrap and real HTTP tests use `createValidationPipe()`; whitelist,
  forbidNonWhitelisted and transform remain enabled without duplicate test options.

#### Coat-pattern migration and deployment order

The backend container runs `node dist/db/migrate.js && exec node dist/main.js`:
**0004 and the new backend ship in the same deploy; migration runs before API
startup**, and failure prevents the app from starting. There is no separate
operator migration step. During rollout, old backend inserts omit the new column
and receive its database default `solid`; old updates do not erase it.

**Deploy this backend to production before deploying the frontend that sends
pattern (`pet-voxel-coat-patterns`).** The old DTO rejects that property because
forbidNonWhitelisted is enabled. This change does not deploy either application.

`0004_coat_pattern.sql` is handwritten: `SET LOCAL lock_timeout = '5s';`,
a `--> statement-breakpoint`, then the varchar(16)/NOT NULL/DEFAULT solid
column. Installed Drizzle executes these statements in one transaction. Constant
defaults avoid a table rewrite on PostgreSQL11+, but the ALTER still needs a table
lock; acquisition times out after5s instead of waiting indefinitely at startup.

No CHECK or UPDATE backfill is needed. Do not run `drizzle-kit generate` for
this change: meta contains only the0000 snapshot and regeneration would repeat
existing schema. Append the0004 journal entry with a timestamp strictly greater
than0003 (1792291000001 >1792291000000); equal timestamps are also skipped.
Existing SQL migrations/snapshot stay unchanged. Never drop the new column or
stored values as an automatic rollback.

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
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` (only for `npm run seed:admin`)

## Scripts

```bash
npm run start:dev      # watch mode
npm run build          # nest build (tsc)
npm test               # Vitest; database specs require TEST_DATABASE_URL
npm run test:e2e       # boots AppModule (test/*.e2e-spec.ts)
npm run lint           # oxlint
npm run db:generate    # drizzle-kit generate (offline)
npm run db:check       # drizzle-kit check (offline)
npm run db:migrate     # drizzle-kit migrate (needs DATABASE_URL)
npm run db:migrate:prod # node dist/db/migrate.js: applies drizzle/ to DATABASE_URL (container start)
npm run seed:admin     # node dist/db/seed-admin.js: idempotent first super_admin (needs build + DATABASE_URL)
```

### Seed the first super_admin (no UI)

There is no public way to create a `super_admin`. After migrations, build once
and run the seed script with the three admin env vars:

```bash
npm run build
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='at-least-8' ADMIN_NAME='Your Name' \
  npm run seed:admin
```

- Uses `DrizzleUserRepository` and the same bcrypt cost as login/register.
- If `ADMIN_EMAIL` already exists, the script logs and exits `0` without changing
  the row (idempotent).
- Password must be at least 8 characters. Email is stored lower-cased.

In Dokploy, exec into the backend container (after deploy) with those three
variables set (or exported for the one-shot command) and run
`node dist/db/seed-admin.js` (or `npm run seed:admin`).

## Database tests

Database specs require `TEST_DATABASE_URL`: an explicitly disposable test-run
database on a PostgreSQL cluster whose role can CREATE DATABASE. The helper never
uses `DATABASE_URL` or loads production credentials. Without the variable, pure
unit tests still run, but requesting a database fixture fails clearly.

Vitest globalSetup migrates one fresh template using the production Drizzle
node-postgres migrator and existing `drizzle/` files. Each fixture/file clones it.
afterAll closes/drops individual clones; global teardown drops leftover run clones,
unmarks and drops the template. There is no persistent template cache. Never use
a production URL. Keep tests within a file sequential because they share TRUNCATE.

### Shared VPS

Use its existing cluster on 127.0.0.1:55432, not a Docker replacement:

```bash
(
  RUN_URL="$(pgtest-db create petsapp_tests)" || exit
  cleanup() {
    status=$?
    trap - EXIT
    pgtest-db drop "$RUN_URL"
    exit "$status"
  }
  trap cleanup EXIT
  TEST_DATABASE_URL="$RUN_URL" heavy -- npm test -- --maxWorkers=2
)
```

For a focused check, replace the test command with e.g.
`npm test -- src/testing/postgres.spec.ts --maxWorkers=2`. Keep the anchor cleanup.
The helper creates/migrates the template itself; do not add a shell-migrated cache.
The currently verified VPS server is PostgreSQL16.15; the local Docker example uses18,
matching the reported production major. Passing locally on16 is not18 coverage.

### Developer machine / Docker (not the VPS)

Start your own disposable PostgreSQL18 instance; port55432 must be free locally.
This example requires PostgreSQL client tools (`createdb`, `dropdb`):

```bash
docker run --detach --rm --name agent-petsapp-tests --label agent=1 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -p 127.0.0.1:55432:5432 postgres:18
docker exec agent-petsapp-tests pg_isready -U postgres
# Wait for readiness before creating the anchor.
(
  ADMIN_URL='postgresql://postgres:postgres@127.0.0.1:55432/postgres'
  RUN_NAME="petsapp_local_$(date +%s)_$RANDOM"
  createdb --maintenance-db="$ADMIN_URL" "$RUN_NAME" || exit
  cleanup() {
    status=$?
    trap - EXIT
    dropdb --maintenance-db="$ADMIN_URL" "$RUN_NAME"
    exit "$status"
  }
  trap cleanup EXIT
  TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/$RUN_NAME" \
    npm test -- --maxWorkers=2
)
docker stop agent-petsapp-tests
```

These are synthetic local credentials, not production values. Stop only the test
container you created, including after failures; never run this launch command
on the VPS or stop a preexisting service. GitHub Actions CI is not configured;
run the checks locally with an isolated test database before merging.

Without CREATEDB, do not silently run parallel files on one mutable database.
Alternative deployment strategy: externally provision one migrated run database
(`pgtest-db clone` on the VPS), run files with `--no-file-parallelism`, and
dispose it in an outer wrapper. That alternate helper mode is not implemented.

### Interrupted runs

Normal success and assertion failures execute global teardown. SIGKILL/host loss
can bypass it: logs identify `petsapp_test_<run-id>` namespaces and generated
clone/template names. Verify that the exact owning run is no longer active,
inspect only its names in pg_database, and remove only its known databases.
A leftover template must first be unmarked with IS_TEMPLATE false using test
administration before exact-name removal (`pgtest-db drop <owned-name>` on VPS).
Never broad-prefix delete, prune shared templates, or terminate unrelated sessions.

Pure PostgreSQL-semantic fakes remain unit-test helpers; they are not an embedded
database engine. Historical OpenSpec records and optional-peer metadata in Drizzle
may retain old dependency names without representing installed/active use.

E2E follow-up: `test/app.e2e-spec.ts` has a localhost:5432 production-named URL
fallback. It and the E2E configuration/command are intentionally unchanged here.
