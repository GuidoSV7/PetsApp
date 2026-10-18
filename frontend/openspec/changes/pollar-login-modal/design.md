# Design: Pollar gate (copy Tinkazo)

## Pattern (from Tinkazo `wallet-pollar` / `wallet-ui`)

1. Publishable key → Pollar client (testnet/mainnet from key).
2. Google: `login({ provider: 'google' })` — fire-and-forget; wait on auth state.
3. Freighter: `login({ provider: WalletType.FREIGHTER })`.
4. UI never awaits `login()`; drive off `isAuthenticated` / `onAuthStateChange`.

## PetsApp wiring

- `PollarAppProvider` wraps the app when the key is set.
- `LoginGateModal` opens when home mounts and Pollar is not authenticated.
- Buttons call `login` with Google / Freighter.
- `PetHomeStage` only mounts when `isAuthenticated`.
- Logout: `logout()` from `usePollar` (+ clear legacy Nest session if any).

## Fallback

No Pollar key → previous Nest Google / email gate (no Freighter).
