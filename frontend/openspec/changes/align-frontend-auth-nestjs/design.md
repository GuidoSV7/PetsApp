# Design: frontend ↔ NestJS auth/admin

## API surface (browser → same-origin proxy)

Browser base URL: `petsappPublicClientUrl()` → `/petsapp-api` or `NEXT_PUBLIC_PETSAPP_API_URL`.
Route handler `petsapp-api/[...path]` forwards to `PETSAPP_API_INTERNAL_URL`.

| Call | Body / query | Response used by UI |
|------|----------------|---------------------|
| `POST /auth/login` | `{ email, password }` | `{ user: { id, name, email, role, roles, country }, token }` + cookie |
| `POST /auth/register` | `{ email, password, name, country? }` | same as login |
| `POST /auth/logout` | — | 204 |
| `GET /auth/profile` | Bearer / cookie | session user |
| `GET /users/me` | Bearer / cookie | `{ id, email, userName, role, roles, isBlocked, isVerified, createdAt, updatedAt }` |
| `GET /admin/users` | `?search=` | `CompleteUserDto[]` |
| `GET /admin/users/:id` | — | `CompleteUserDto` |
| `PATCH /admin/users/:id` | `{ name?, email?, country?, profileImage? }` | public user row |
| `POST /admin/users/:id/toggle-block` | — | public user row |

`CompleteUserDto`: `id`, `email`, `userName`, `role`, `roles`, `isBlocked`, `isVerified`, `country`, `createdAt`, `updatedAt`, `lastLogin`.

## Types

- `PetsAppUserResponse` — session/auth user (`name`, not `userName`).
- `AdminUserResponse` — admin complete DTO (`userName`, `isBlocked`, `isVerified`).
- Roles: `admin` | `super_admin` | `member`. Admin area: `admin` + `super_admin`.

## UI mapping (no redesign)

- List/detail show `userName`; estado from `isBlocked` (Bloqueado / Activo); badge `isVerified`.
- Remove `fullName`, `merchant`, `isActive`, `toggle-active`, `verify` admin action.
- Customers page: fetch `GET /admin/users` (optional search), client filter to `member`, client pagination.
- After PATCH/toggle: reload detail from GET (toggle returns public shape with `name`).

## Routing

- `landingPathForRole`: admin/super_admin → `/admin`; member → `/account`.
- `/account`: name, email, logout.

## Env

`.env.example`: only `NEXT_PUBLIC_PETSAPP_API_URL`, `NEXT_PUBLIC_SITE_URL`, `PETSAPP_API_INTERNAL_URL`.
