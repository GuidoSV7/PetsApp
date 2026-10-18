# Spec: admin GLB model

- Diseño 3D exposes a file control that accepts `.glb` (and `.gltf`).
- `isAcceptedModelFile` returns true for `cat.glb` and false for `cat.png`.
- Oversized files above `MAX_GLB_BYTES` are rejected with an error.
- Vista previa region remains visible while drafting.
- Scale control remains available for GLB and procedural.
- **Confirmar cambio** persists the model asset and tunables.
- Restablecer clears the custom model back to procedural.
- Home viewer can render a custom `modelUrl` when provided.
