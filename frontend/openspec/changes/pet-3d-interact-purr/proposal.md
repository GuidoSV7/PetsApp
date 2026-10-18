# Proposal: 3D cat interaction (orbit + purr)

## Intent

Let the user **rotate** Michi (drag/orbit), **tap/click** him for a reaction,
and hear/feel a **purr** when interacting (click or Acariciar). Still UI-only.

## Scope

### In scope

- Orbit / drag to spin the 3D cat (desktop + touch).
- Click/tap on the cat → bounce reaction + status + purr.
- Acariciar also triggers the purr audio.
- Visible affordance hint (rotate / tap).
- Vitest for purr helper + stage wiring (WebGL mocked).

### Out of scope

- Physics ragdoll, voice chat, recorded meow assets from third parties.
- Persisting interaction history to the API.

## Success

User can orbit Michi, tap him to make him react and purr, and tests + review pass.
