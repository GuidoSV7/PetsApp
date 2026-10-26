# Spec: visual parity, F2 and phase boundaries

Status: IMPLEMENTED and verified under Prompt11/D1/D2/adjustments1/2:20exact image comparisons0changed/maxdelta0,3,444actual world matrices maxerror2.22e-16. Full proof and acknowledged native scope: [verification report](../review.md). This passive status update is not part of native approval.

## S4 — Preserve complete existing transforms and behavior

User requirements, under “Qué no cambiar”:
> Los 33 ids y roles, ni sus dimensiones.

> La posición en el mundo de cada pieza y de cada caja de patrón: idéntica
> (tolerancia 1e-6) en reposo, con necesidades en 0 y 100, en muestras del idle
> y con los 5 patrones. Las bandas del atigrado siguen ancladas a `legFL`/`legFR`.

> El idle, `need-visuals`, los ajustes de Diseño 3D, la cámara, la sombra y el DPR.

Preserve original IDs, role assignments, geometry arguments and approved pattern recipes/colors. For each original box and each patch, compare every element of its actual world matrix to an independently frozen pre-change fixture with absolute error ≤`1e-6`. Preserve direct patch→original mesh parentage, including tabby foreleg bands. Do not move patches to joints or new forearms.

Future fixtures MUST include all five patterns, rest, all100/all0 needs, isolated need effects, deterministic blink/ear/tail extrema and existing representative admin settings. Record the exact clocks/seeds before refactoring. Preserve current root/orbit/reaction/reduced-motion behavior, idle registry identity/cleanup and mesh identity across pattern changes. Changing a setting must re-resolve against current base state, not accumulate transforms. With admin/resolved needs fixed, static `Lb` binds MUST remain constant across idle samples; ear/tail rotations and separate blink scales are the only existing idle effects. No per-frame legacy-world bind calculation is allowed.

Record pre-change matrices from the actual scene before changing production code; commit fixture data for history-independent tests. Do not manufacture a new-feature RED out of an already-green preservation control or calculate expected matrices with the new production solver. Preserve legacy tree/pose helper contracts and their existing tests.

## S5 — Pixels, hidden geometry and unchanged draw cost

User requirements:
> Draw calls: siguen 2 × cajas visibles + 5 (71 en liso, 95 en atigrado).

> Captura del home igual al píxel y conteo de draw calls por la fórmula.

> Los tests existentes pasan sin debilitar aserciones.

With N pattern boxes, visible boxes MUST remain33+N, despite39+N total box meshes. Across the existing measured main/contact rendering pipeline, draws MUST remain `2 × (33+N) + 5`:

| Pattern | N | Visible boxes | Draw calls |
|---|---:|---:|---:|
| solid | 0 | 33 | 71 |
| tabby | 12 | 45 | 95 |
| tuxedo | 8 | 41 | 87 |
| calico | 4 | 37 | 79 |
| pointed | 12 | 45 | 95 |

Future real-browser before/after comparisons MUST use the same isolated local API fixture, colors, needs, clock, seed, yaw, camera, viewport, GPU buffer size, DPR, lighting, shadow256 and rendering engine. Cover all five patterns at all100/all0 needs. Compare decoded home screenshot/canvas pixels: zero changed pixels. Do not resize images, relax comparison thresholds or reuse the older pattern-vs-solid threshold as A1 parity proof. Owner adjustment2: ANY nonzero pixel difference MUST stop the task; deliver before/after/difference images, changed-pixel count and maximum channel delta. Do not adjust code to force equality.

Count every existing render invocation without including mask/debug passes or being misled by renderer-info resets. Hidden parts and empty anchors MUST add zero draws. Check console/page/request errors and clean up the local server. SwiftShader proves this controlled comparison, not mobile hardware performance.

D1 is a validation gate: existing physical mesh-parent/local-TRS and33-total-mesh assertions cannot remain literally unchanged. Proposed replacements MUST retain every applicable old observable invariant, add exact joint and hidden-box assertions, and add independent full-matrix parity. No reduced cases, skipped failures, deleted controls or relaxed precision; F3 remains deferred.

## S6 — F2: anatomy-derived eye clearance

User requirement:
> Follow-up F2 del spec 7: los límites de ojos (.14/.185) de `coat-patterns.test.ts`
> pasan a derivarse de la anatomía.

Derive both eyes' upper Y and outer X extents in head-local coordinates from the existing head/eye centers and geometry dimensions. For default anatomy these evaluate to `.14` and `.185`; these values may document current results, not serve as hardcoded expected bounds.

Retain strict inequalities: every M stroke's lower edge stays above the derived eye top; every facial band's inner edge stays outside the derived eye extent. Keep recipes, box counts, eye positions and visible geometry unchanged. This is an assertion refactor: existing clearance controls may remain GREEN throughout; do not invent a RED claim. F1's camera AST coupling and F3's excessive precision are not part of this change.

## S7 — Authorization and phase boundary

User requirements:
> En este prompt SOLO la fase ODD: leé el código y generá
> proposal, design, specs y tasks en `frontend/openspec/changes/pet-voxel-skeleton/`.
> No implementes nada. Pará y esperá mi validación.

> No tocar backend ni producción. Sin commits en esta fase.

The quoted restriction governed Prompt10. Prompt11 approved G0/D1/D2 and authorized T0–T4, coherent local commits and fresh-consent A1-only native RDD, with adjustments1/2 above. No A1 push/merge, backend or production work is authorized. Prompt12 separately authorized prerequisite merge commits; those are complete, not permission to publish A1.

Confirmed implementation baseline is main867853a after PR2 and scope PR3. Freeze actual-scene T0 evidence before production edits. Applicable functional checks and fresh native RDD must cover A1 itself; the coat-pattern approval is not inherited.
