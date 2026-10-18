# Spec: pet coins

- Starting balance is `STARTING_COINS` (5).
- Stage shows a coin balance labelled for assistive tech (`Monedas: …`) with a gold coin SVG.
- `spendCoins` refuses when balance &lt; cost and leaves balance unchanged.
- `earnCoins` adds a non-negative amount.
- Alimentar spends feed cost when affordable and updates fed status; when not, status is broke and balance unchanged.
- Acariciar / cat tap earns pet reward.
- Successful coat capture earns coat reward.
