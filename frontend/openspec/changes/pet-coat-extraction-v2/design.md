# Design: coat extraction v2

## Pipeline

1. Optional center crop (`cropCenterImageData`, ~70% width/height) for camera
   frames and large gallery images.
2. Sample with **center weight** (ellipse falloff) and adaptive step.
3. Keep **fur-like** pixels: drop strong greens/blues (vegetation/sky); allow
   mid greys and darker fur (lower luminance floor).
4. Bucket RGB (finer grid), rank by **weighted** count.
5. **Primary** = top bucket.
6. **Secondary** = next bucket with enough chroma/luma distance, else lightened
   primary.
7. **Accent** = warmest leftover (nose/pad), else soft pink fallback.

## Determinism

No randomness; same `ImageData` → same hex trio. CI uses synthetic pixels only.

## UI

Camera hint asks the user to center the pet. Capture path crops before extract;
gallery uses the same extractor (full image + center weight).
