# Spec: pet state

- Starting coins = 30; initial needs match frontend INITIAL_PET_NEEDS.
- `getOrCreate(guestKey)` returns defaults for a new guest.
- `feed` with coins &lt; 5 leaves state unchanged and signals insufficient funds.
- `feed` with enough coins deducts 5 and raises hunger.
- `play` / `pet` earn 2 coins; `coat` earns 5.
- Mood is Feliz / Bien / Bajo from needs average.
- Controller routes are public and require a valid guest key header.
