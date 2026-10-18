# Spec: gallery coat

- Coat dialog exposes a control labelled for gallery upload (e.g. “Subir de galería”).
- `coatColorsFromFile` on a solid mid-color image returns a primary close to that color.
- Choosing a gallery file in the dialog invokes `onColors` with extracted colors and closes.
- Gallery control remains usable when the camera path sets an error.
