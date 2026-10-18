# Proposal: coat colors from gallery

## Intent

In the “Colores de mi gato” flow, let the user **pick a photo from the gallery**
(or files) in addition to the live camera capture.

## Scope

### In scope

- File picker (`accept="image/*"`) in `CameraCoatCapture`.
- Decode image → `extractCoatColors` → same `onColors` path as camera.
- Gallery available even when the camera fails / is denied.
- Vitest for file→ImageData / coat path + dialog control.

### Out of scope

- Multi-photo upload, cropping UI, server-side image storage.

## Success

User can apply coat colors from a gallery image; camera path still works; tests green.
