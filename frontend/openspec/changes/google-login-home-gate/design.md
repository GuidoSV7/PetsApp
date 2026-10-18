# Design: Google login + home gate

## Flow

1. Home mounts → read `petsapp_session_v1`.
2. No session → gate UI with **Continuar con Google** (+ optional email modal).
3. GIS returns `credential` (JWT ID token) → `POST /auth/google` `{ idToken }`.
4. Nest verifies audience=`GOOGLE_CLIENT_ID` via `google-auth-library`.
5. Require verified email; find user by email or create `member` with random
   unusable password hash + `isVerified=true`.
6. Answer `{ user, token }` + HttpOnly session cookie (same as login).
7. FE `savePetsAppSession` → show `PetHomeStage`.

## Backend seams

- `GoogleTokenVerifier` port (test double in unit tests; real OAuth2Client in prod).
- `AuthService.loginWithGoogle(idToken)`.
- `POST /auth/google` `@Public()` + `AuthOriginGuard` + throttle.

## Frontend

- `loginWithGoogle(idToken)` in `auth.service.ts`.
- `GoogleSignInButton` loads GIS script once.
- `HomePage` branches on session; `HomeHeader` shows logout when signed in.
- Member `landingPathForRole` → `/` (play), admin → `/admin`.
