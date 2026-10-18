# Design: global model client

## API helper `pet-model.service.ts`

- `fetchGlobalPetModel()` → meta
- `uploadGlobalPetModel({ file?, modelScale })` → FormData PUT
- `clearGlobalPetModel()` → DELETE
- Absolute `fileUrl` via `getPetsAppBaseUrl()`.

## Admin Diseño 3D

On **Confirmar cambio**: call upload API (pending file or scale-only).
On **Restablecer**: DELETE then clear local draft.
Keep local draft preview via object URL before confirm.

## Home

`PetHomeStage` fetches global meta on mount; if `glb`, set `modelUrl` to
`${base}${fileUrl}?t=${updatedAt}`.

## Login

`LoginPage` attempts `signInPetsAppUser(hardcoded)` first; on failure falls
back to local hardcoded session (panel UI only).
