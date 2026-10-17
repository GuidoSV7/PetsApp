# Features — PetsApp domain map

Dependency flow: `shared (components/ui, lib, stores, types) → features/<domain> → app/`

- No cross-feature imports; compose in `app/` pages.
- New code MUST land here (OpenSpec: `frontend-feature-architecture`).
- Legacy: `app/_lib/petsapp-api.ts` — migration in progress.

| Feature | App routes | Legacy source |
|---------|------------|---------------|
| `auth` | login modal, session | `app/_components/auth` |
| `admin-dashboard` | `/admin` home | `app/admin/_components/dashboard` |
| `admin-customers` | `/admin/customers` | `app/admin/_components/customers` |
| `admin-analytics` | `/admin/analytics` | `app/admin/_components/analytics` |
| `admin-settings` | `/admin/settings` | `app/admin/_components/settings` |
| `merchant-analytics` | `/admin` (date filters) | admin dashboard support |
| `public-marketing` | `/` home | `app/_components/home` |

HTTP: new services in `features/<domain>/api/` using `@/lib/axios`.
