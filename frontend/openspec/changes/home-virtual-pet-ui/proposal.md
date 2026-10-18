# Proposal: Home virtual pet UI (cat + actions)

## Intent

Turn the public home into a virtual-pet playground UI: a cat centered on the
stage, with feed and interact actions below. UI only — no backend, no persistence.

## Scope

### In scope

- Home main stage: brand signal, centered cat illustration, short status line.
- Two action buttons: **Alimentar** and **Acariciar** (local feedback only).
- Keep header sign-in / auth modal.
- Vitest coverage for the stage contract.

### Out of scope

- Hunger/mood simulation engine, API, inventory, sounds, account wiring.
- Visual redesign of admin or auth modal.

## Success

Home shows the cat and both actions; tests green; easy to iterate on visuals next.
