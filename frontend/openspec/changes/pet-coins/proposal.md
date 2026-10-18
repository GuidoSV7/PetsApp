# Proposal: gold coin economy (UI-only)

## Intent

Add a **local coin balance** on the pet home stage, shown with a custom **gold
coin SVG**. Players spend coins to feed Michi and earn coins by petting /
sampling coat colors. No backend yet.

## Scope

### In scope

- Pure coin rules module (start balance, earn, spend, afford check).
- Gold coin SVG + balance badge in the stage UI.
- Wire Alimentar (spend), Acariciar / tap (earn), coat capture (earn).
- Status copy when the player cannot afford food.
- Vitest for rules + stage wiring.

### Out of scope

- Server wallet, Stellar/payments, shop inventory, persistence across reloads.

## Success

Balance visible with gold SVG; feed spends; pet/coat earn; insufficient funds
blocked with clear status; tests + review pass.
