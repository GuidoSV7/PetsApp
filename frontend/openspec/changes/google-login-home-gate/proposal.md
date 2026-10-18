# Proposal: Google login + home play gate

## Problem

Anyone can open the home and play Michi anonymously. Product wants a real
account gate, with **Sign in with Google** as the primary entry.

## Goal

- Unauthenticated visitors see a login gate (no pet stage).
- Google ID token → Nest `POST /auth/google` → same JWT/session as email login.
- Authenticated members land on `/` and can play; admins still go to `/admin`.

## Scope

- BE: verify Google ID token, find-or-create `member`, issue session cookie + token.
- FE: Google Identity Services button, home auth gate, logout in header.
- Env: `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## Out of scope

- Binding `pet_states` to `user_id` (still guest key while logged in).
- Removing email/password login (kept as secondary).
