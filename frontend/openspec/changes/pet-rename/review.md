# RDD: pet rename

## Checks

- [x] First rename free; later renames cost 5 coins
- [x] Broke paid rename leaves name/coins unchanged
- [x] Invalid / blank / unchanged names rejected
- [x] Nest persists `name` + `renameCount` (migration `0002_pet_name`)
- [x] Home stage editable name + Gratis / 5 monedas cue
- [x] Backend pet tests green (22)
- [x] Frontend pet-home tests green (46)

## Deploy note

Run DB migrate so `pet_states.name` / `rename_count` exist before shipping the API.
