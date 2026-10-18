# RDD: admin GLB model

## Checks

- [x] Spec: accept .glb / .gltf; reject other types
- [x] Spec: size limit MAX_GLB_BYTES
- [x] Spec: Vista previa + escala + Confirmar cambio
- [x] Spec: Restablecer clears custom model
- [x] Spec: Cat3DViewer modelUrl → GlbPetModel
- [x] Vitest: cat-model-asset + admin-design-3d-page

## Notes

GLB bytes live in IndexedDB (not localStorage). Tunables stay in localStorage.
Home listens for `petsapp:cat-model-changed` after confirm.
