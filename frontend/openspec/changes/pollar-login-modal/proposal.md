# Proposal: Pollar login modal (Google + Freighter)

## Problem

Home already gates play behind a session, but Google GIS + Nest is separate from
Stellar. Product wants the Tinkazo pattern: on entry, a modal to sign in with
**Google** or **Freighter** via **Pollar**.

## Goal

- Unauthenticated visit → blocking login modal.
- Options: Continuar con Google | Freighter (Pollar).
- Authenticated Pollar session unlocks the pet stage.
- Without `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY`, fall back to the previous gate.

## Scope

- `@pollar/core` + `@pollar/react` provider.
- `LoginGateModal` (Tinkazo-style picker).
- Home wired to `usePollar()`.
- Env example + openspec.

## Out of scope

- Nest `/auth/google` removal (kept as fallback).
- Binding `pet_states` to Pollar wallet address.
