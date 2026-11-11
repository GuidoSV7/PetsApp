# Account security hardening (backend)

Branch `fix/account-security`, worktree `.worktrees/audit-accounts`. Source: the
2026-11 audit (Engram `petsapp/audit/backend-auth-security`, `petsapp/audit/backend-security-remaining`).
This worktree is the ONLY owner of database migrations in this audit round.

## Specs

- S1 Google sign-in must not take over a pre-registered unverified local account.
  `POST /auth/google` for an email that belongs to an existing account with
  `isVerified=false` must not keep the pre-existing password usable: replace the
  password hash with a fresh random unusable hash (and revoke existing sessions, S6)
  before marking it verified. Verified accounts keep linking as today.
- S2 Admin endpoints must respect rank. `PATCH /admin/users/:id` and
  `POST /admin/users/:id/toggle-block` by an `admin` targeting a user whose roles
  include `super_admin` (or an equal/higher rank than the caller) answer 403 and
  change nothing. A caller cannot block themselves (400). `super_admin` keeps full access.
- S3 Email is stored normalized everywhere. `PATCH /users/me` and
  `PATCH /admin/users/:id` lowercase+trim the email (reuse `normalizeEmail`).
  A new migration adds a unique index on `lower(email)`; it must FAIL LOUDLY
  (not silently merge) if case-insensitive duplicates exist, and the migration
  spec must prove: existing distinct rows preserved, duplicates rejected.
- S4 A taken email on any update answers 409 `Email already registered`, never 500
  (use the existing `asConflict`/23505 handling in `src/database/conflict-error.ts`).
- S5 Changing email through `PATCH /users/me` requires `currentPassword` in the body
  (401 `Incorrect password` when wrong, 400 when missing) and resets `isVerified=false`.
  Name-only updates do not require it (the frontend only sends `{ name }`).
- S6 Session revocation: add `tokenVersion` (int, default 0) to users; the JWT
  carries it (`tv` claim); `JwtStrategy.validate` rejects a token whose `tv` differs
  from the stored value (401). `change-password` increments it and re-issues the
  session cookie for the caller. Tokens without `tv` from before deploy are treated
  as version 0 (no forced logout of everyone).
- S7 Stricter throttles: `POST /auth/change-password`, `POST /auth/verify-password`
  and `DELETE /users/me` limited to 5 per minute per client.
- S8 Login timing: when the email is unknown, still run one `bcrypt.compare`
  against a fixed dummy hash before rejecting.
- S9 Password inputs (`LoginDto`, `RegisterDto`, `ChangePasswordDto.newPassword`)
  reject more than 72 bytes (bcrypt limit) with 400.
- S10 `UpdateUserDto.profileImage` accepts only `https:` URLs (or null).
- S11 Admin user list: `GET /admin/users?search=&limit=&offset=` uses
  case-insensitive `ilike`, escapes `%` `_` `\` in `search`, `limit` default 100,
  max 200, `offset` default 0; response stays a JSON array (no contract break).
- S12 `toggleBlock` is a single atomic `UPDATE ... SET is_blocked = NOT is_blocked RETURNING`.
- S13 Migration adds an index on `user_roles.role_id`.

## Tasks

| ID | Specs | Route | Commit |
| --- | --- | --- | --- |
| T1 | S3, S4, S13 (migration + normalization + 409) | worker | |
| T2 | S1, S5, S6 (tokenVersion migration in the same or next migration) | worker | |
| T3 | S2, S11, S12 | worker | |
| T4 | S7, S8, S9, S10 | worker | |

## Log

- L1 (user, verbatim): "Haceme una investigación exhaustiva de nuestro software, quiero que busques errores, problemas, vulnerabilidades, y mejores el diseño la UI/UX bsucanlas mejores prácticas en internet y hagamoslo que esté software sea el mejor posible"
- L2 (user, verbatim): "Todas haceme en worktrres paralelos las que puedas hacer"
- L3 (parent): test Postgres at `TEST_DATABASE_URL=postgres://petsapp_test:petsapp_test@127.0.0.1:55491/petsapp_test` (throwaway docker container `petsapp-test-pg`, tmpfs).
- L4 (parent): independent verifier found S11 default limit missing (blocker) and an admin email change demanding the target password; fixed with tests (users 88/88, full suite 546/546, build OK).
