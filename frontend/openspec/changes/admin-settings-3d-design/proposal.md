# Proposal: Admin panel — Configuración + Diseño 3D

## Problem

PetsApp admin only has Panel + Usuarios. Operators need Elena Pos–style
settings and a place to tune the procedural 3D cat without editing code.

## Solution

Extend `/admin` (same shell/nav pattern as Elena Pos `OwnerShell`) with:

1. **Configuración** (`/admin/settings`) — copy Elena Pos settings UX
   (card sections, save actions): public brand copy for PetsApp.
2. **Diseño 3D** (`/admin/design-3d`) — live Michi preview + tunables
   (scale, body depth, head height, ear size) persisted for the home stage.

Existing Panel + Usuarios stay. Sections that are POS-only (inventory, map,
WhatsApp, socials) are not ported.
