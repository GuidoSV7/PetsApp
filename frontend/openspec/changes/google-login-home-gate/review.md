# Review: google-login-home-gate

## Verdict

**Allow** — Google ID-token login + home play gate; email login kept as secondary.

## Checklist

| Item | Status |
|------|--------|
| `POST /auth/google` + `AuthService.loginWithGoogle` | OK |
| `GoogleTokenVerifier` seam (library + test double) | OK |
| Create/find member, verified email required | OK |
| FE `signInWithGoogle` + GIS button | OK |
| Home gate hides pet stage without session | OK |
| Member landing `/`; admin `/admin` | OK |
| Header logout when signed in | OK |
| Env examples for Google client id | OK |
| FE auth tests 11/11; AuthService specs green | OK |
| `next build` typecheck | OK |

## Notes

- Set `GOOGLE_CLIENT_ID` (API) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (FE) to the
  same OAuth Web client ID; authorize the deployed origin in Google Cloud.
- Pet rows still use guest key while logged in (follow-up: bind to `user_id`).

## Follow-ups

- Link `pet_states` to authenticated user.
- Optional Google One Tap on the gate.
