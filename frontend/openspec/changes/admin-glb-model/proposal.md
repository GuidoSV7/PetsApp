# Proposal: Admin Diseño 3D — custom .glb model

## Problem

Diseño 3D only tunes the procedural Michi. Operators need to upload a real
3D asset (`.glb`), preview size, and confirm it for the home stage.

## Solution

1. Accept `.glb` (and `.gltf`) uploads in `/admin/design-3d`.
2. Live preview in the existing WebGL stage (procedural fallback if none).
3. Scale control applies to the custom model (and still to procedural).
4. **Confirmar cambio** persists the model (IndexedDB) + scale so the home
   `Cat3DViewer` renders the GLB.
5. Restablecer returns to the procedural cat.
