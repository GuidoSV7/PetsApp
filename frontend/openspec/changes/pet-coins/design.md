# Design: pet coins

## Rules (`pet-coins.ts`)

```ts
STARTING_COINS = 30
COIN_COSTS.feed = 5
COIN_REWARDS.pet = 2
COIN_REWARDS.coat = 5
```

- `canAfford(balance, cost)` → boolean
- `spendCoins(balance, cost)` → `{ ok, balance }` (no-op if cannot afford)
- `earnCoins(balance, amount)` → new balance (non-negative ints only)

Deterministic; no I/O — easy unit tests.

## UI

- `GoldCoinIcon` — inline SVG (disc + shine + “P” mint mark), decorative `aria-hidden`
  when paired with a labelled balance.
- `CoinBalance` — `[icon] N` with `aria-label="Monedas: N"`.
- Placed under the tagline / above the pet frame (one composition, not a dashboard card).

## Stage wiring

| Action | Coins | Notes |
|--------|-------|--------|
| Alimentar | −5 | Blocked if balance &lt; 5; status `broke` |
| Acariciar / tap | +2 | With existing purr |
| Coat capture | +5 | After colors applied |

## Status

- New key `broke`: “Necesitás más monedas para alimentar a Michi.”
