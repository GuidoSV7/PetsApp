# Review: pet-coins

## Verdict

**Allow** — Local gold-coin economy with SVG badge; earn/spend wired; tests green.

## Checklist

| Item | Status |
|------|--------|
| `STARTING_COINS` 30 + feed/pet/coat rates | OK |
| `spendCoins` / `earnCoins` pure + tested | OK |
| Gold coin SVG (`GoldCoinIcon`) | OK |
| Balance badge `Monedas: N` | OK |
| Alimentar spends 5; broke status when unaffordable | OK |
| Acariciar / tap earn 2; coat earn 5 | OK |
| Vitest pet-home 21/21; full suite green | OK |
| `tsc --noEmit` clean | OK |
| UI-only (no wallet API) | OK |

## Notes

- Balance resets on page reload (session state only).
- Feed is the only sink today; shop / cosmetics can spend later.

## Follow-ups (when you say so)

- Persist coins per account.
- Tiny shop (toys / hats) spending coins.
- Daily bonus / streak.
