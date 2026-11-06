# Imported 3D skills: reference, not a migration

These complete skill directories were copied verbatim, with file modes preserved,
from `/home/agent/repos/petsapp-landing/.agents/skills/` with owner authorization.
The source project was not modified.

## Read only what applies

| Skill | When to load |
| --- | --- |
| [r3f-threejs](r3f-threejs/SKILL.md) | Load the core R3F principles first for actual scene work. |
| [assets-3d-pipeline](assets-3d-pipeline/SKILL.md) | Only for explicitly authorized imported assets and their licensing/pipeline work. |
| [motion-scroll](motion-scroll/SKILL.md) | For relevant accessibility, pointer, scroll, or motion work. |

## PetsApp compatibility takes precedence

PetsApp is **Next.js**, with existing procedural A1/A2 geometry, not an Astro
landing. Existing task-specific contracts win over every imported recommendation.
The sample versions, R3F/GLB/GSAP assumptions, and reduced-motion examples are
**reference only**, not authorization to install dependencies or change behavior.
`frontend/package.json` currently declares Next 16.2.0, React 19.2.4,
three ^0.186.1, Fiber ^9.8.2, and drei ^10.7.9; the samples target a different
stack (including three 0.187.0). GSAP, Lenis, nanostores, and asset CLI tools
are not declared there. Do not install or update packages merely to match examples.

Do not migrate the renderer or assets, freeze the simulation clock, change
calibrated geometry, IK, or support criteria, or replace approved jumps on the
strength of a skill. In particular, poster substitution, `frameloop="never"`,
and `mixer.timeScale = 0` examples are not approved A1/A2 behavior changes.

Mentions of `astro-landing` and `landing-performance-deploy` refer exclusively
to the source project; those skills were not imported and are not available
through this import. Astro islands, Vite asset paths, source-project budgets,
and deployment instructions do not define this app's architecture.

## Provenance and execution limits

No explicit license was found in the copied skills or the inspected source-root
license filenames. Owner-authorized copying does not establish a redistribution
license, third-party model rights, or independently verify the dated version,
browser-support, performance, and licensing claims in the source references.
Verify those claims and asset licenses before relying on them or redistributing.

All references and `assets-3d-pipeline/scripts/optimize-glb.sh` are included
unchanged. The script was syntax-checked only, never executed. Its `npx --yes`
command can fetch tooling and its pipeline writes assets; this import authorizes
neither execution nor model downloads, asset conversion, or dependency changes.
