# Design: realistic procedural cat

## Why still procedural

Coat colors (`primary` / `secondary` / `accent`) must tint live from the camera
flow. A rigid textured GLTF fights that; a part list with material roles stays
simple and testable.

## Anatomy module (`cat-anatomy.ts`)

Export a frozen list of parts:

| Field | Meaning |
|-------|---------|
| `id` | Unique part name |
| `kind` | `sphere` \| `cone` \| `capsule` \| `box` \| `cylinder` |
| `role` | `primary` \| `secondary` \| `accent` \| `eye` \| `pupil` \| `whisker` |
| `position` / `rotation` / `scale` | Local transform |
| `args` | Geometry constructor args |

Required ids (spec): `body`, `chest`, `head`, `muzzle`, `earL`, `earR`,
`eyeL`, `eyeR`, `pupilL`, `pupilR`, `nose`, `tail*`, `paw*`, `whisker*`.

## Model

`Cat3DModel` maps roles → `meshStandardMaterial` (fur: high roughness, low
metalness; eyes: darker sclera + vertical pupil via thin box/capsule).

Idle motion unchanged (yaw bob + bounce on `reactPulse`).

## Viewer

Slightly warmer key light + fill; camera framed on head/chest.
