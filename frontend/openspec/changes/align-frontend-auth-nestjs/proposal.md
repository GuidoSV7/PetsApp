# Proposal: Align frontend auth and admin with NestJS backend

## Intent

The WIP renamed auth helpers and session roles to match NestJS, but the admin UI, API client, and Vitest suite still assume the old PetsApp-era contract (`fullName`, `merchant`, `walletAddress`, `isActive`, `toggle-active`). Bring the Next.js frontend to the deployed backend contract with minimal UI change so it compiles, tests green, builds in Docker, and works behind `/petsapp-api`.

## Scope

### In scope

- Auth client: `login` / `register` / `logout` / `profile` / `users/me` shapes and names.
- Session roles: `admin` | `super_admin` | `member`; post-login routing.
- Minimal `/account` for members (name, email, logout).
- Admin users list/detail against `GET/PATCH /admin/users` and `POST .../toggle-block`.
- Display backend fields: `userName`, `isBlocked`, `isVerified` (plus email, role, country where present).
- Vitest + `tsc` green; `.env.example`, `.dockerignore`; keep Dockerfile + `output: "standalone"`.

### Out of scope

- Visual redesign, new admin features, role assignment UI beyond what PATCH allows.
- Backend changes.
- Wallet / PetsApp remnants.

## Success

`npx vitest run`, `npx tsc --noEmit`, `npm run build` green; Docker image builds; deployed frontend loads, registers, and logs in against NestJS.
