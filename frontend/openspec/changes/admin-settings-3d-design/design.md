# Design: Admin Configuración + Diseño 3D

## Shell (from Elena Pos)

- Keep PetsApp `AdminLayout` sidebar (already analogous to `OwnerShell`).
- Nav items (ES labels, EN paths like Elena):
  - Panel → `/admin`
  - Usuarios → `/admin/customers`
  - Configuración → `/admin/settings`
  - Diseño 3D → `/admin/design-3d`
- Dashboard cards link to the new sections.

## Configuración (Elena settings pattern)

Card sections on a scrollable main column:

1. **Marca pública** — `siteName`, `siteTagline`, `siteDescription`
   (defaults from `config/site.ts`). Persist in
   `localStorage` key `petsapp.admin.brand` via `admin-brand-settings`.
2. Read-only note: SEO/share still uses `config/site.ts` until a Nest
   settings API exists; the panel stores the operator draft.

UI mirrors Elena: `h1` + bordered white cards, primary save, alert errors.
Styled with PetsApp admin CSS modules (not Tailwind).

## Diseño 3D

- Tunables type `CatDesignTunables`:
  - `modelScale` (default `CAT_MODEL_SCALE`)
  - `bodyDepth` (multiplier on body `scale[2]`)
  - `headHeight` (added to head `position[1]`)
  - `earSize` (multiplier on ear scales)
- Persist `petsapp.admin.cat-design` via `cat-design-settings`.
- `resolveCatAnatomy(tunables)` merges tunables onto `CAT_ANATOMY`.
- `Cat3DModel` reads resolved anatomy + model scale (live on home + admin).
- Admin page: preview (`Cat3DViewer`) + range inputs + Guardar / Restablecer.

## Auth

Unchanged: only `admin` / `super_admin` via existing `AdminLayout` gate.
