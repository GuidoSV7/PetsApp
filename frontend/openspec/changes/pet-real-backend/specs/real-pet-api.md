# Spec: real pet API client

- Home does not show a coin balance until the API reports one.
- Care actions and coat updates go through `/pet/actions/*` and `/pet/coat`
  (no local coin/need mutation in the stage).
- Until `GET /pet/state` succeeds, care controls are disabled (or stage shows
  load error).
- Backend persists feed/coat across subsequent `GET /pet/state` for the same
  guest key (Drizzle/`pet_states`).
- `GET /pet/state` without a valid `X-Pet-Guest-Key` returns 400.
