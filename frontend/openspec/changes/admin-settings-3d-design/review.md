# RDD: Admin Configuración + Diseño 3D

## Checks

- [x] Spec: nav includes Configuración + Diseño 3D (`/admin/settings`, `/admin/design-3d`)
- [x] Spec: Configuración Marca pública save/persist
- [x] Spec: Diseño 3D tunables + Guardar / Restablecer
- [x] Spec: resolveCatAnatomy keeps body/head/ears; Cat3DModel uses tunables
- [x] Vitest: `test/features/admin/*` green (8)

## Notes

Brand draft is localStorage-only until a Nest settings API exists.
Cat design tunables apply on the home stage via the same storage key.
Elena Pos POS sections (inventory, map, WhatsApp, socials) intentionally omitted.
