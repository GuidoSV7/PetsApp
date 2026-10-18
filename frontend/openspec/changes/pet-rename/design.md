# Design: pet rename

## Rules (backend authority)

- Default name: `Michi`, `renameCount: 0`.
- `POST /pet/name` with `{ name }`.
- Trim; length 1–16; reject empty / unchanged.
- If `renameCount === 0`: free. Else require ≥ 5 coins; on broke set `statusKey: broke` and do not rename.
- On success: set name, `renameCount += 1`, `statusKey: renamed`, deduct coins when paid.

## Frontend

- Clickable name (pencil) opens inline edit.
- Hint: “Gratis” when `renameCount === 0`, else “5 monedas”.
- Speech / personalize copy use the live name from API state.
