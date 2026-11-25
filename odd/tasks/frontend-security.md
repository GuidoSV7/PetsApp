# Frontend security hardening

Branch `fix/frontend-security`, worktree `.worktrees/audit-frontend-security`.
Source: 2026-11 audit (Engram `petsapp/audit/frontend-security`). A parallel UI/UX
branch edits `src/app/_components/**`, `src/app/login/**`, `src/app/account/**`,
`src/features/auth/components/**`: keep every exported function/type signature of
`src/stores/auth-session.ts` and `src/app/_lib/petsapp-api.ts` call-compatible so
those call sites need NO edits.

## Specs

- S1 The JWT is no longer persisted in `localStorage`/`sessionStorage`. Persisted
  session = user only. The API's HttpOnly session cookie (`petsapp_session` /
  `__Host-petsapp_session`) is the credential: requests through `/petsapp-api`
  rely on it; an `Authorization: Bearer` header is sent only when an in-memory token
  exists for the current tab. A stored legacy `petsapp_session_v1` with a token is
  migrated on read (token dropped, user kept). Pollar/Freighter flows keep working.
- S2 Server-side gate for `/admin/**`: Next.js 16 `src/proxy.ts` (or a server
  layout) redirects to `/login` when there is no session cookie, and to `/account`
  when `GET /auth/profile` (via the internal API origin, forwarding the cookie)
  shows no `admin`/`super_admin` role. The client `AdminLayout` check stays as defense in depth.
- S3 Security headers in `next.config.ts` `headers()`: CSP (allow what the app
  really needs: self, Google Identity Services, Pollar/Freighter/Stellar endpoints,
  `blob:`/`data:` for 3D textures and camera, `wasm-unsafe-eval` only if needed),
  `Strict-Transport-Security` (production only), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'none'`,
  `Permissions-Policy` allowing `camera=(self)` only. `next build` and the app must
  still work (verify the home, login and admin pages render with no CSP violations
  in a headless browser if available).
- S4 Proxy TLS: remove the silent `rejectUnauthorized:false` for `*.traefik.me`.
  Insecure TLS is allowed only with explicit `PETSAPP_API_ALLOW_INSECURE_TLS=true`
  (logged warning). Production already sets `PETSAPP_API_INTERNAL_URL` (http, internal),
  so it is unaffected. Document in `frontend/README.md`.
- S5 Proxy headers: drop client-supplied `x-forwarded-*`, `x-real-ip`, `forwarded`,
  `cf-*` and set `x-forwarded-for`/`x-forwarded-proto`/`x-forwarded-host` from the
  real request.
- S6 Proxy path: reject (400) any path segment that decodes to `.` or `..` or
  contains `/` or `\` after decoding.
- S7 Proxy 502 answers a generic `{ message: "Upstream unavailable" }`; the detail
  is logged server-side only.
- S8 Global 401 handling: one shared handler (in `src/lib/axios.ts` and the fetch
  wrapper in `src/app/_lib/petsapp-api.ts`) clears the session and redirects to the
  right entry (`/login` for admin routes, `/` otherwise) without redirect loops;
  remove the duplicated per-component 401 code under `src/app/admin/**`.
- S9 Admin customers table: `<caption>` (visually hidden ok) and `scope="col"`;
  out-of-order responses in `customers/page.tsx` are ignored (latest request wins).

## Tasks

| ID | Specs | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1, S8 | worker | |
| T2 | S2 | worker | |
| T3 | S3 | worker | |
| T4 | S4, S5, S6, S7 | worker | |
| T5 | S9 | worker | |

## Log

- L1 (user, verbatim): "Haceme una investigación exhaustiva de nuestro software, quiero que busques errores, problemas, vulnerabilidades, y mejores el diseño la UI/UX bsucanlas mejores prácticas en internet y hagamoslo que esté software sea el mejor posible"
- L2 (user, verbatim): "Todas haceme en worktrres paralelos las que puedas hacer"
- L3 (parent): DEPLOY.md documents prod `PETSAPP_API_INTERNAL_URL=http://petsapp-backend-jaa6ki:3000`; the backend already enforces `@Roles(ADMIN)` on `/admin/*` and sets the HttpOnly cookie with SameSite=Lax.
- L4 (worker): T1–T5 implemented test-first (RED observed per S#; GREEN via focused specs). S1: user-only persisted session + in-memory token in `src/stores/auth-session.ts`; S8 shared `src/lib/session-expiry.ts` wired into axios and the fetch wrapper, per-component 401 code removed from `src/app/admin/**`; S2 `src/proxy.ts` (tests in `test/lib/proxy-gate.test.ts` — vitest `include` only covers `test/**`, so the allowed `src/proxy.test.ts` slot stays unused); S3 headers in `next.config.ts`; S4–S7 in `src/lib/petsapp-api-origin.ts` + the catch-all route; S9 caption/scope + latest-wins. Updated legacy-contract tests (`auth-session.test.ts`, `login-page.test.ts`, `petsapp-api-origin.test.ts`, `pet-model-proxy-retirement.test.ts`). Verified: full suite by chunks, `tsc --noEmit`, `next build`, live curl headers/redirects, headless chromium CSP check (0 violations). Pre-existing on base: 8 pet-home cat-pose geometry test files fail (~175 tests), and heavy 3D suites flake under parallel load.
