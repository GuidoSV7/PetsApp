# Spec: need visuals

- Home stage does **not** render need meter labels Hambre, Diversión, Energía,
  or Higiene, nor percent bars for those needs.
- Care actions Alimentar / Jugar / Dormir / Bañar remain.
- `needVisualCues`: each need `< NEED_LOW_THRESHOLD` sets the matching `*Low`
  flag true; at/above threshold flags are false.
- When hunger is low, resolved body scale is thinner than the base anatomy.
- When fun is low, ear parts get extra droop rotation.
- When energy is low, head sits lower and idle motion amplitude is reduced.
- When hygiene is low, dirt mix is > 0 (coat darkens toward dirt).
- `PetHomeStage` sets `data-*-low` attributes reflecting the four flags.
- Cat viewer aria copy includes a need hint when any need is low.
