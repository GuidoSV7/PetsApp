# Proposal: compact mobile pet home (no scroll)

## Intent

Fit the full care UI on a typical phone viewport **without scrolling**: denser
spacing, smaller pet canvas, merged mood into the pet card, tighter header/main.

## Scope

### In scope

- `pet-layout` density tokens (`compact`).
- Stage `data-layout="compact"` + CSS that targets short viewports.
- Home shell uses remaining viewport height (`100dvh`) with minimal chrome.
- Keep all care actions, needs, coins, 3D cat, coat camera.

### Out of scope

- Removing features; landscape tablet redesign.

## Success

On ~390×844 class phones, Michi + needs + four actions + colores fit above the
fold; tests assert compact layout contract.
