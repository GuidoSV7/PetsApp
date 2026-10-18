# Spec: auth + admin users

## Auth service

- `signInPetsAppUser(email, password)` posts trimmed email + password to `/auth/login` (no wallet).
- `registerPetsAppUser` posts `{ email, password, name, country? }` with trimmed email/name and upper-cased 2-letter country when present.
- Re-exports: `fetchAuthProfile`, `fetchCurrentUser` (not Spanish aliases).

## Session

- Persists `{ token, user: { id, name, email, role, roles, country } }`.
- Accepts roles `admin` | `super_admin` | `member` only.
- `landingPathForRole('admin'|'super_admin')` → `/admin`; `'member'` → `/account`.

## Admin users

- List/detail types use `userName`, `isBlocked`, `isVerified`.
- List calls `GET /admin/users` with optional `search`; no `role=merchant` / page/limit query deps on backend.
- Toggle uses `POST /admin/users/:id/toggle-block`.
- PATCH body only fields allowed by `UpdateUserDto` (`name`, `email`, `country`).
