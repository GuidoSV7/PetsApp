# Spec: pet coins

- Starting balance is `STARTING_COINS` (5).
- Stage shows a coin balance labelled for assistive tech (`Monedas: …`) with a gold coin SVG.
- `spendCoins` refuses when balance &lt; cost and leaves balance unchanged.
- Alimentar spends feed cost when affordable and updates fed status; when not, status is broke and balance unchanged.
- Jugar / acariciar / pelaje no suman monedas.
