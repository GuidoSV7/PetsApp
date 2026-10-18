# Design: gallery coat source

## Flow

1. Dialog opens (camera starts if possible).
2. Actions: **Capturar colores** | **Subir de galería** | Cancelar.
3. Gallery: hidden `<input type="file" accept="image/*">` triggered by button.
4. `coatColorsFromFile(file)` → bitmap/canvas → `extractCoatColors` → `onColors` → close.

## Module `coat-from-image.ts`

- `loadImageDataFromFile(file: File): Promise<ImageData>`
- `coatColorsFromFile(file: File): Promise<PetCoatColors>`

Uses `createImageBitmap` when available, else `HTMLImageElement` + canvas.
Rejects non-image / empty decode with a Spanish error string for the dialog.

## UX

- Keep showing the file button when camera errors (do not disable gallery).
- Hint copy mentions cámara o galería.
