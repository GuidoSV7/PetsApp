# Design: 3D cat + camera colors

## Stack

- `three` + `@react-three/fiber` + `@react-three/drei`
- `Cat3DViewer` loaded with `next/dynamic` (`ssr: false`)

## Coat model

```ts
type PetCoatColors = {
  primary: string;   // main fur
  secondary: string; // belly / inner ear
  accent: string;    // nose / paw pad
};
```

Default grey: primary `#8a8a8e`, secondary `#b4b4b8`, accent `#c9a0a8`.

## Color extraction (`extractCoatColors`)

1. Read `ImageData` (RGBA).
2. Skip near-black / near-white / low-saturation pixels (likely background).
3. Bucket remaining RGB into a coarse grid; pick top buckets by count.
4. Map: most frequent → primary; second → secondary; warmest leftover → accent
   (fallback nose pink if missing).

Deterministic and unit-tested with synthetic ImageData (no camera in CI).

## UI

- Pet frame hosts the WebGL canvas (grey cat idle turn).
- Actions row: Alimentar | Acariciar | **Colores de mi gato**.
- Camera panel: live `<video>`, Capturar / Cancelar; on capture close panel and
  update coat + status copy.
