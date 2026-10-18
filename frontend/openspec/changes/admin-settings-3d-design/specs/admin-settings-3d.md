# Spec: admin settings + 3D design

## Navigation

- Admin sidebar includes links labeled **Configuración** and **Diseño 3D**.
- Paths are `/admin/settings` and `/admin/design-3d`.
- Dashboard exposes cards that navigate to both sections.

## Configuración

- Page title **Configuración**.
- Section **Marca pública** with fields for nombre, tagline, descripción.
- Saving persists brand draft and shows success (or clears error).
- Defaults match `siteName` / `siteTagline` / `siteDescription` when empty store.

## Diseño 3D

- Page title **Diseño 3D**.
- Live preview region labeled for Michi.
- Controls for escala, profundidad del cuerpo, altura de cabeza, tamaño de orejas.
- Guardar persists tunables; Restablecer returns to code defaults.
- Resolved anatomy keeps required part ids (`body`, `head`, both ears).
- Home `Cat3DModel` uses the same resolved tunables when present.
