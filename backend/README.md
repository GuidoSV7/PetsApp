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
| `src/db` | Drizzle schema (users, roles, pets and Stellar identity/auth metadata) and inferred row types. |
| `src/account-pet` | Explicit user-JWT private pet/bootstrap API, current-only commands, pending/confirmed claim status, transactional repository port. |
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
| `POST` | `/auth/stellar/challenge`, `/auth/stellar/verify` | public, origin-checked; Stellar flag off by default |
| `GET` | `/account/stellar` | explicit user JWT; own identity only |
| `POST` | `/account/stellar/challenge`, `/account/stellar/verify` | explicit recent member JWT, origin-checked; link only |
| `GET` `PATCH` `DELETE` | `/users/me` | authenticated |
| `GET` | `/admin/users`, `/admin/users/:id` | admin |
| `PATCH` | `/admin/users/:id` | admin |
| `POST` | `/admin/users/:id/toggle-block` | admin |
| `PUT` | `/admin/users/:id/roles` | super admin |
| `GET` | `/admin/roles` | admin |
| `POST` | `/admin/roles` | super admin |
| `PATCH` | `/admin/roles/:code` | super admin |

### Private account pet API (default OFF; T5 integration contract)

`ACCOUNT_PET_ENABLED` is an independent backend flag: **only the literal string
`true` enables private reads, bootstrap, claim status and mutations**. Missing,
false, uppercase, numeric or padded values fail closed with503
`ACCOUNT_PET_DISABLED`. It has no dependency on SEP-10 signer, Horizon, Pollar
or `STELLAR_AUTH_ENABLED`; email/Google users can use the same private API when
separately enabled. This change does not authorize activation in any environment.

Every `/account/pet/*` route requires an actual user JWT (existing HttpOnly
session cookie or Bearer). An internal `X-Client-Secret` or development-open
mode is never a user credential. Existing global cookie Origin/CSRF checks and
Bearer precedence remain unchanged. T5 must clear old Bearer credentials before
using the wallet cookie. Ownership comes only from the authenticated `users.id`.

| Method | Path | Successful result |
| --- | --- | --- |
| POST | `/account/pet/claim-guest` | 200 confirmed result; see body rules below |
| GET | `/account/pet/claims/:operationId` | 200 own minimal pending/confirmed status |
| GET | `/account/pet/state` | 200 current gameplay DTO; never initializes |
| POST | `/account/pet/actions/:action` | 201 current gameplay DTO, existing free care rules |
| POST | `/account/pet/coat` | 201 current gameplay DTO, existing coat/pattern validation |
| POST | `/account/pet/name` | 201 current gameplay DTO, existing free rename validation |

Bootstrap accepts `{}` or `{ "guestKey": "<existing local UUID>" }`. Do not
create a local key just to bootstrap. A nonexistent key is a lookup, not guest
creation. With no current pet, the existing guest is adopted without changing
its UUID or gameplay row; with neither, a new private zero-balance pet is created.
With current/no existing guest, the current pet is reused without writes.
The internal guest key of a private pet is never returned.

A conflict returns409 with this exact shape (IDs are server-found):

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "PET_CONFLICT",
  "operationId": "<operation UUID>",
  "options": {
    "keep_account": { "petId": "<current UUID>" },
    "keep_guest": { "petId": "<device UUID>" }
  }
}
```

Preparation stores only durable pending metadata: no adoption, archive, gameplay,
balance or ledger changes. Repeating bootstrap for that pair returns the same
operation. The options label the two server-found pets; they do not expose guest
keys, owners, archive data, credentials, timestamps or arbitrary snapshots.

Resolve only with the pair `{ "operationId": "<UUID>", "choice": "keep_account" }`
or `keep_guest`. Do not include `guestKey` in a resolution request. Missing one
member of the pair or mixing bootstrap and resolution yields400
`INVALID_PET_CLAIM`. Invalid UUIDs/choices and extra fields are rejected by the
shared strict validation pipe. No owner, pet ID, snapshot or balance input is
accepted. Both choices retain both full pet rows and one current pet; the other
is archived invisibly. Both incorporate the fresh guest's legacy balance once:
37 + 5 = 42. Care/coat/rename never modify historical coins or canonical money.

Confirmed responses are `{ status: "confirmed", petId, coins, operationId? }`.
`operationId` is present for a confirmed adoption/resolution, absent for simple
current reuse or creation without an existing guest. Retrying a resolution with
the same operation and exact choice returns its stored result, including the
original coins, without further writes. A different decision yields409
`PET_OPERATION_DECISION_MISMATCH`; a changed pair yields409 `PET_CONFLICT_STALE`.
T5 must keep the guest key until confirmation, reuse operation/choice after a lost
response, or query status; a network error is not proof of rollback.

Claim status returns only `{ status: "pending", operationId }` while pending,
or the confirmed response above. It does not list options or archives. Foreign
or nonexistent operations return403 `PET_OPERATION_UNAVAILABLE`; a foreign
adopted key returns403 `PET_UNAVAILABLE`, with no owner disclosure. Before
bootstrap, current state/mutations return404 `PET_NOT_INITIALIZED`.
Other semantic errors use the existing Nest envelope `{ statusCode, error,
message }`. No auth/session cookie is issued by these endpoints.

Private state and successful mutations have exactly the guest gameplay shape:
`{ coins, needs, coat, statusKey, name, renameCount, mood }`, without IDs, keys,
owner metadata or timestamps. `coins` comes from the canonical user balance,
not the historical pet row. Legacy `broke` is rendered as `idle`, without a
read-time write. Coat and name reuse the existing DTOs; omitted pattern is
preserved, explicit null receives400 `Unknown coat pattern`, and unchanged or
invalid names receive400 `Invalid pet name`.

**Adopted guest-key revocation is unconditional, even with both flags OFF.**
GET and every valid care/coat/name request on `/pet/*` for a current or archived
adopted key return403 `GUEST_PET_UNAVAILABLE`, never missing/recreate/fallback.
Unadopted guest routes retain their existing status, DTO, validation and free
care contracts. There are no archive/list/activation/restore routes. The internal
support recovery port remains separate and is not wired to HTTP.

### Stellar testnet authentication (default OFF)

T2 adds SEP-10 login and linking, independently of Pollar. It does **not**
activate the feature, publish a transaction, fund a wallet, enable mainnet, or
add private pet/bootstrap endpoints. Production flags remain off. Future testnet
activation still needs separate owner authorization and the rollout conditions
below; do not enable this unit while the remaining feature units are incomplete.

#### HTTP contracts

All new POSTs return200 on success. Public POSTs use the existing
`AuthOriginGuard`; private routes also require `JwtAuthGuard`, not merely the
global guard's internal `X-Client-Secret` alternative. Cookie writes use the
existing origin/CSRF policy, including Bearer precedence when both credentials
are present. Remove an old Bearer on the frontend before using a wallet cookie.

1. `POST /auth/stellar/challenge` accepts only `{ "address": "G..." }`.
   It returns `{ challengeId, transaction, network_passphrase, expiresAt }`
   and a five-minute HttpOnly browser-flow cookie. `expiresAt` is an ISO server
   timestamp; `transaction` is a server-signed, sequence-zero SEP-10 envelope.
2. Freighter signs that envelope inside the extension. Send
   `{ challengeId, signedTxXdr, signerAddress }` to `POST /auth/stellar/verify`
   with the same browser-flow cookie. `signerAddress` must identify the challenged
   account; it does not authorize an owner or replace threshold verification.
3. Verification returns only `{ user }`, using the existing session-user shape
   (`id, name, email, role, roles, country`). There is **no JWT in the wallet
   response body**. Only after the outer database commit does the backend issue
   the existing HttpOnly session cookie, referring to `users.id`, not an address.
   Wallet-only users have NULL credentials, member role and balance0; login
   does not create a pet. A later login resolves the same identity/user.

The login flow cookie is `petsapp_stellar_login`; linking uses the separate
`petsapp_stellar_link`. Production uses their `__Host-` variants. Like the
existing session cookie they are host-only, Path=/, HttpOnly and SameSite=Lax,
with Secure in production. Their 256-bit random values never enter storage;
only purpose-scoped keyed hashes do. A successful issuance refreshes the
five-minute cookie; failed requests do not set or clear cookies.

`GET /account/stellar` returns `{ identity: null }` or
`{ identity: { network: "testnet", address: "G..." } }` for the authenticated
user only. To link, POST `{ address, password }` to
`/account/stellar/challenge`, then the same verification fields above to
`/account/stellar/verify`. The latter returns the identity shape and does not
replace the current session. Email users must pass the **existing** password
checker before issuance; wallet-only users need no password for an idempotent
proof of their already-bound identity.

Linking requires a valid member session with signed JWT `iat` strictly less
than five minutes old (future/missing timestamps fail closed). Password checking
does not refresh this timestamp. Confirmation rechecks user, active/blocked
state, current roles, session/browser/purpose and recency. Both the challenge's
five-minute expiry and the session's five-minute recency window must still hold;
the latter may end earlier. A fresh proof of the same link is idempotent. Another
owner or a second address yields409 without replacing, transferring or merging.
There are no unlink, replacement, credential-conversion or archive routes.

Stellar login/link rejects admin and super_admin. A signed `method: "stellar"`
claim is checked against reloaded current roles on every authenticated request,
so a later promotion cannot turn a wallet cookie into an administrative session.
Legacy email/Google JWTs, their response tokens, logout and profiles keep their
existing contracts. Public profiles never include password or session metadata.

#### Verification, shared limits and transient retention

The direct, lockfile-pinned official `@stellar/stellar-sdk` dependency builds
and verifies SEP-10. The backend compares the **complete** transaction-body hash,
server signature, account, domains, network and strict server time bounds, then
verifies client signatures against the existing account's high threshold.
Server signatures and zero-weight signers cannot contribute client authority;
a zero-weight master cannot authenticate alone, even at threshold0. Only an
HTTP404 from the fixed testnet Horizon account endpoint selects the nonexistent
account master-key path. Other HTTP failures, malformed account data, timeout
or transport failures return503, never fake absence or spend crypto attempts.
No challenge is submitted to Stellar and no user private key is requested.

| Control | Shared PostgreSQL policy |
| --- | --- |
| Challenge issuance per address | 5 per five-minute window, across login/link and instances |
| Challenge issuance per IP | 30 per five-minute window; use configured trusted `req.ip`, never parse forwarded headers here |
| Pending proofs | Replacement invalidates only the same flow/address/purpose |
| Bad legitimate proofs | 3 per challenge; wrong browser/session/purpose does not spend them |
| Consumption | Exactly one outer commit with signup/link; concurrent replay returns409 and no new cookie |

The T2 repository composes the unchanged T3 transaction-local helpers below;
it never calls standalone wallet `create()` during consumption. Late errors
roll back the challenge, user, identity, member assignment and zero balance
as one unit, preserving the shared five-second lock timeout.

Identifiers in counters and browser/session bindings use domain-separated
HMAC-SHA256, with a shared dedicated backend key across instances. IPs are not
stored. Stored auth metadata contains no cookie, JWT, signed XDR, private key,
service secret or request body. Logs contain event/purpose and successful user
ID only, not credentials or proofs. Every accepted challenge issuance lazily
cleans **at most100 expired counters and100 challenges** using locked,
skip-locked batches. Counter windows expire after five minutes; challenge rows
become cleanup-eligible ten minutes after their expiry (roughly15minutes from
issuance). With no traffic, cleanup resumes at the next accepted issuance; no
new scheduler or Redis is added. Cleanup touches only transient auth tables,
never users, identities, pets, balances or ledger history.

| Error | Contract |
| --- | --- |
| 400 | Unsupported address/XDR, invalid DTO or extra fields; no crypto attempt spent on malformed XDR |
| 401 | Invalid/expired proof, browser/session binding or recent authentication; no new session |
| 403 | Foreign origin or wallet administrative access |
| 409 | Consumed challenge or incompatible identity link |
| 429 | Shared issuance limit, with integer `Retry-After` seconds; rejected issuance does not change stored counters |
| 503 | Feature disabled/misconfigured or external verification unavailable |

A lost verification response needs a new challenge; never replay a consumed
proof to obtain another cookie. Identity uniqueness prevents duplicate signup.
The general existing throttler remains in place in addition to these limits.

#### Backend configuration (no activation in this change)

| Variable | Policy |
| --- | --- |
| `STELLAR_AUTH_ENABLED` | Absent/false by default; only literal `true` permits the feature |
| `STELLAR_NETWORK_PASSPHRASE` | Defaults to `Test SDF Network ; September 2015`; any other value fails closed |
| `STELLAR_HORIZON_URL` | Defaults to and only accepts `https://horizon-testnet.stellar.org` |
| `STELLAR_HOME_DOMAIN` | Required canonical bare domain; not the client-supplied Host |
| `STELLAR_WEB_AUTH_DOMAIN` | Required canonical bare domain for WebAuth |
| `STELLAR_AUTH_SIGNING_SECRET` | Required dedicated SEP-10 service signer, backend secret only, separate per environment and from any payment account |
| `STELLAR_AUTH_HMAC_SECRET` | Required dedicated shared backend key, at least32characters, identical across instances in an environment |

Provision secrets only through backend secret configuration. Never commit/log
them or expose them through `NEXT_PUBLIC`. The public service signing key may
be configured for client verification. Invalid settings return a generic503
without echoing values. Test keys are ephemeral synthetic fixtures only.

### Nullable-user / Stellar schema foundation (0006)

`0006_stellar_user_identity.sql` permits NULL in `users.email` and
`users.password`, retaining the ordinary UNIQUE constraint on non-null emails.
It creates `user_stellar_identities` (one identity per user and one owner per
network/address), `stellar_auth_challenges` and `stellar_auth_attempts`.
No existing users, credentials, role assignments or pet rows are updated or
backfilled. The migration uses a transaction-local five-second lock timeout;
historical migrations0000–0005 remain unchanged.

0006 alone is **schema and compatibility only**, not wallet login or signup.
No Stellar routes or enable flags are introduced by this persistence work.
0008 and the transaction helpers below now provide complete wallet signup
persistence: user + identity + member role + zero coin balance in one commit.
They do not verify a wallet or issue a session. Do not expose a partial signup
using the nullable user repository. Email/Google input contracts and
roles, blocking and activation behavior remain unchanged; JWT identity stays
`sub = users.id`. Public profiles may carry `email: null`, never a placeholder
email or password hash.

For a stored user without a password:

- Email login returns the existing generic `401 Invalid credentials`, without
  invoking bcrypt or revealing the alternative login method.
- Authenticated change-password, verify-password and password-gated account
  deactivation return `409 PASSWORD_NOT_CONFIGURED`, without bcrypt or mutation.
- Profile updates omit an unchanged email. Explicit NULL or empty/whitespace
  email is rejected with400 (`Email cannot be removed`); a nonempty email PATCH
  on an email-less account is rejected with409
  (`Credential conversion is not supported`). Name/country edits remain allowed.

There are no credential triggers or cross-table CHECK constraints. Ordinary SQL
can insert multiple NULL-email users; that schema fact is not an application
credential guarantee. There is no unlink, password-delete or account-conversion
flow. Any future feature adding credential removal must bring its own database
guarantee. The SEP-10 runtime described above owns validation, browser/session
binding, atomic challenge consumption, limits and retention; these tables alone
implement none of those policies and store no signed XDR, cookies or JWTs.

Migration tests use isolated PostgreSQL databases, compare complete legacy
users/pets/roles (including0/5/37 pet balances and timestamps), and prove safe
reapplication. Historical free-care coverage stops at0005; the0006 upgrade proof
stops at0006. Do not roll back to a backend that assumes non-null credentials
after wallet users exist. This change does not authorize production migrations
or activation; the mixed-version exception for free care below does not apply
to future wallet/ownership rollout.

### Transactional account-pet persistence (0007/0008; no public routes)

0007 adds `pet_claim_operations` and `user_pet_ownership`; 0008 adds
`user_coin_balances` and `user_coin_entries`. Both use transaction-local
`lock_timeout = '5s'`, with no data backfill or updates to old rows.
0000–0006 and the historical migration tests remain unchanged. Isolated
PostgreSQL tests apply each new prefix, reapply it and apply the full journal,
comparing every legacy column and checking rollback on lock timeout.

The database enforces one current pet per user, one owner per pet, integer
nonnegative balances/credits and one legacy credit per pet. Composite foreign
keys tie credits and archive operations to the same owner. No credential
triggers, cross-table CHECKs or cascading deletes of pets/history are installed.

#### Integration boundaries for the auth and private-API units

The domain `WalletUserRepository` exposes:

```typescript
create(data: WalletSignup): Promise<UserRow>;
findByIdentity(identity: WalletIdentity): Promise<UserRow | null>;
// WalletIdentity = { network: 'testnet'; address: string }
// WalletSignup = WalletIdentity & { name: string }
```

`create()` owns a transaction when used standalone. The SEP-10 infrastructure
adapter must instead compose challenge consumption and signup/link in **one**
outer transaction using the exported infrastructure helpers:

```typescript
withUserTransaction<T>(
  db: DrizzleDb,
  work: (tx: UserTransaction) => Promise<T>,
): Promise<T>;
createWalletUser(tx: UserTransaction, data: WalletSignup): Promise<UserRow>;
linkWalletIdentity(tx: UserTransaction, userId: string, identity: WalletIdentity): Promise<UserRow>;
findWalletUser(db: Pick<DrizzleDb, 'select' | 'insert' | 'delete'>, identity: WalletIdentity): Promise<UserRow | null>;
```

`UserTransaction` and Drizzle stay inside infrastructure. Never call an
independently committing repository `create()` from that callback. Challenge
consumption, identity uniqueness, the normal user/role creation invariants and
zero balance must either all commit or all roll back. Real late-constraint
failure tests include an outer challenge change/counter and prove no orphan
user, identity, member assignment or balance. Verification, active/blocked and
role checks, session/purpose binding and wallet-admin denial belong to the auth
unit; these helpers alone confer no authentication authority. Identity linking
is idempotent for the exact same owner/address and cannot replace or transfer
an identity.

`AccountPetRepository` exposes `bootstrap(userId, existingGuestKey?)`,
`resolve(userId, operationId, choice)`, `operationStatus(userId, operationId)`,
`readCurrent(userId)` and `mutateCurrent(userId, mutation)`. The authenticated
server supplies `userId`; no client-selected owner, pet snapshot or balance is
accepted. Private state omits the internal guest key. Mutations are typed care,
coat or rename commands and reuse `applyCare`, `applyCoat` and `applyRename`.
Reads do not initialize pets; bootstrap uses `initialSnapshot` only when there
is neither a current pet nor an existing guest. A missing supplied guest key
never generates a guest as a lookup side effect.

A conflict returns pending metadata with the operation and the two server-found
pet IDs. Repeated preparation reuses the same pending operation. It changes no
pet, ownership, archive, balance or credit. Only explicit `keep_account` or
`keep_guest` resolves it. Both choices retain both complete pet rows/UUIDs;
the incoming guest is in the user's custody even when archived. Archive
metadata is separate from gameplay status. The server imports coins from the
fresh locked guest row only: 37 + 5 becomes 42 with either choice, once.
Retries return the stored confirmed result; another decision is rejected.
Returning users and support recovery never re-credit legacy coins.

Transactions lock the user, an existing operation when resolving, and sorted
pet UUIDs before ownership changes. This also serializes empty/current-user
state across devices. Every guest read/update and duplicate initialization
locks the same pet row and checks fresh ownership: both current and archived
keys explicitly reject with `GUEST_PET_UNAVAILABLE`, never missing/recreate.
Unadopted guest contracts, including duplicate-create uniqueness errors, stay
unchanged. Private mutations lock and select current only; they write neither
canonical balance/ledger nor historical legacy coins. Archives are not normal
mutation targets.

Semantic errors are domain errors here, not HTTP exceptions. The private-API
unit must map pending conflict to `409 PET_CONFLICT`, stale pairs to
`409 PET_CONFLICT_STALE`, a different replayed decision to409 and adopted guest
access to `403 GUEST_PET_UNAVAILABLE`. No controller, archive-list, activation,
restore or new authentication endpoint is introduced here.

#### Future specifically authorized support recovery — NOT a production runbook authorization

There is no self-service recovery. A future support action needs explicit
owner authorization for the exact user, archived pet, operator/ticket identity
and reason before touching real data. This change has executed recovery only
on disposable test databases; never run it on production as part of deployment.

1. Obtain the authorized user's ID and archived pet UUID from trusted internal
   records. Verify the ticket and operator identity; do not accept identifiers
   from a public recovery endpoint. Record the prior claim/archive operation.
2. Allocate one audit operation UUID for that authorized action. Invoke the
   infrastructure adapter's internal `AccountPetRecovery.restoreArchived` with
   `{ userId, petId, operationId, actor, reason }`. The normal account-pet port
   deliberately excludes this method. Do not implement recovery with manual
   UPDATEs or calls to bootstrap/adoption.
3. The helper locks the user and both pets in stable order, verifies archived
   ownership, records a `restore` operation with actor/reason and both pet IDs,
   archives the former current pet and restores the target by changing only
   ownership metadata. Its original archive provenance/timestamps remain on
   the restored ownership row; every earlier operation remains retained.
4. Confirm the returned operation/result and exactly one current pet. The pet
   UUID and complete gameplay row must be unchanged; balance and ledger must
   be unchanged. The isolated PostgreSQL regression proves those comparisons.
5. If a response is lost, reuse the exact operation UUID, owner, target, actor
   and reason. A replay returns the original result; changing its audit identity
   is rejected. Never delete, recreate, credit, erase archived pets or remove
   ledger/history to recover a pet.

Activation still requires a separately authorized testnet rollout. Before any
adoption, **every** backend must understand ownership and reject adopted guest
keys; the earlier free-care mixed-version exception does not apply. Flags stay
off. No production migrations, mainnet operations, credential removal, wallet
verification or UI flows are authorized by this persistence unit.

### Free pet care

New guest pets start with **0 coins**. Feeding, playing, sleeping, bathing,
petting and every valid rename are free; existing balances remain unchanged.
The `coins` field remains in the guest API response. Existing name validation,
needs, mood, action effects and rename counters are unchanged. A stored legacy
`broke` status is returned as `idle` by the DTO mapper without a read-time write.
No account or authentication endpoint changes are introduced.

`0005_free_pet_care.sql` changes only the `coins` column default to 0, after
`SET LOCAL lock_timeout = '5s';` and a statement breakpoint. It has no UPDATE
or backfill, and preserves every existing row. Its journal timestamp is strictly
after 0004. Migration runs at backend startup as usual. The short mixed rollout
window is accepted: an old instance may still create a pet with 5 coins or charge
for feeding. No write drain or separate migration release is required.

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
