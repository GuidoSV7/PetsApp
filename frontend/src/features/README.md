# Features — PetsApp domain map

Dependency flow: `shared (components/ui, lib, stores, types) → features/<domain> → app/`

- No cross-feature imports; compose in `app/` pages.
- New code lands here; identifiers in English, UI copy may stay in Spanish.
- Legacy HTTP client: `app/_lib/petsapp-api.ts` (auth re-exports, `/users/me`, `/admin/users`). New services go in `features/<domain>/api/` using `@/lib/axios`.

| Feature | App routes | Source |
|---------|------------|--------|
| `auth` | sign-in / sign-up modal, session store | `features/auth/**`, `stores/auth-session.ts` |
| `public-marketing` | `/` neutral home (hero + sign-in), site config, JSON-LD organization | `features/public-marketing/**`, `app/_components/home` |
| admin shell | `/admin` placeholder dashboard, sidebar layout | `app/admin/AdminLayout.tsx`, `app/admin/page.tsx` |
| admin users | `/admin/customers`, `/admin/customers/[id]` (identity + role management) | `app/admin/_components/customers` |

Shared infrastructure: `lib/axios.ts`, `lib/errors.ts`, `lib/query-client.ts`, `lib/api-auth-policy.ts`, `lib/petsapp-api-origin.ts` and the `app/petsapp-api/[...path]` proxy.
