# Proposal: remove stage hero copy above the cat

## Intent

The app header already shows **PetsApp**. Drop the duplicate hero brand and
tagline above Michi so the first viewport is header → coins → cat.

## Scope

### In scope

- Remove stage `brand` / `tagline` from `PetHomeStage`.
- Vitest asserts those strings are absent from the stage.
- Keep coins, cat, hint, status, actions.

### Out of scope

- Changing the site header / nav branding.

## Success

Stage no longer renders “PetsApp” or “Cuidá a Michi…”; header unchanged; tests green.
