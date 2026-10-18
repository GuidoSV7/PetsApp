# Design: GLB model in Diseño 3D

## Asset store (`cat-model-asset.ts`)

- IndexedDB `petsapp-cat-model` / store `assets` / key `active`.
- Shape: `{ kind: "procedural" | "glb", fileName?, dataUrl?, mimeType? }`.
- Max size `MAX_GLB_BYTES` (12 MiB). Reject oversized files in the UI.
- `isAcceptedModelFile(file)` — `.glb` or `.gltf` by name/MIME.
- `readFileAsDataUrl(file)` for persistence after confirm.

## Viewer

- `Cat3DViewer` accepts optional `modelUrl`.
- When `modelUrl` is set → `GlbPetModel` via `useGLTF` + `modelScale`.
- When unset → existing procedural `Cat3DModel` (+ need visuals).

## Admin UI

1. File picker: “Elegir modelo (.glb)”.
2. Scale slider (shared `CatDesignTunables.modelScale`).
3. Preview updates from draft URL (object URL while pending, data URL when saved).
4. Primary CTA: **Confirmar cambio** (persist asset + tunables).
5. Secondary: Restablecer (clear asset + defaults).
6. When a GLB draft is active, hide procedural-only sliders (body/head/ears).

## Home

- `PetHomeStage` loads the confirmed asset on mount and passes `modelUrl`.
