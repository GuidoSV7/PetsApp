# Voxel coat patterns implementation
Approved OpenSpec: frontend/openspec/changes/pet-voxel-coat-patterns/. Branch: feat/pet-voxel-coat-patterns; baseline 13253e9312237966ef35e9d74a585586da745f59.
Delivery: Prompt5 approves all final visuals and authorizes ONE local Conventional Commit plus native RDD; no push/merge/production. Earlier no-commit/visual-stop instructions below are historical and superseded by S8. Runner: frontend/node_modules/.bin/vitest, max 2 aggregate workers; full/e2e/build under heavy; HOME unchanged.

## Specs

### S1

# Prompt 3 — `pet-voxel-coat-patterns` · Implementación (TDD: RED → GREEN) + capturas

El plan revisado de `frontend/openspec/changes/pet-voxel-coat-patterns/` está validado: tabla de 0/8/8/5/12 cajas, visibilidad S3b con 41/81 por mancha y pose, y babero desde ±0.20.

### S2

- **S2:** apruebo la aclaración. Los contactos internos con normales opuestas entre el babero y el pecho están permitidos; no se permiten caras coplanares expuestas.
- **S8:** el 3% de píxeles del gato es un piso. Informá el porcentaje medido de cada patrón contra `solid`.

### S3

- Seguí ODD + TDD + RDD y las tasks T1–T5.
- **RED primero, por aserción:**
  - descriptores y lista;
  - anidado bajo el ancla en el modelo real;
  - colores (rayas derivadas, la suciedad no toca el acento);
  - presets y selección por color y patrón;
  - respuestas normalizadas.

  La omisión del patrón en la cámara ya funciona: va como control, no como RED. Las fallas por módulos nuevos que todavía no existen no cuentan.
- **GREEN** según el plan. Los chequeos de enterramiento (S3) y de visibilidad (S3b) quedan como tests del repo, sobre la tabla real.
- Respetá lo que el plan marca como "no cambiar".

### S4

- Corré los tests enfocados, los controles existentes, la suite completa, `tsc --noEmit` y `next build`.
- **Navegador real** (mismo método de siempre, reloj fijo y giro 0):
  - capturas emparejadas `solid` y cada patrón, con necesidades normales y en 0;
  - porcentaje de píxeles del gato cambiados por patrón;
  - conteos por pasada de render;
  - órbita y toque;
  - 0 errores de JavaScript.

### S5

**Antes del RDD, pará y pasame las capturas** de los 4 patrones (normal y necesidades en 0) con su porcentaje. Si alguno no se lee como el patrón, ajustamos la tabla dentro de las reglas antes de seguir.

### S6

- `review.md` con:
  - los comandos y sus resultados;
  - una tabla escenario → test de S1 a S13 que diga si cada test falla sin el cambio o solo comprueba que nada se rompió;
  - las capturas;
  - cualquier diferencia con el plan.
- RDD declarando todos los archivos, incluidos los nuevos sin trackear.
- **Decisión para este candidato:** el verificador independiente queda sin ejecutar (su perfil aísla `HOME`). Registralo como limitación, no como aprobado.
- Si el RDD se bloquea, pará y reportá.
- Sin commits.
- El merge sigue condicionado a que el backend con `coat.pattern` esté desplegado en producción.

### S7 — Prompt4 recovered scope (reconstructed from compacted context, not raw verbatim; supersedes affected S1/S5 table and visual gate)

# Prompt 4 — `pet-voxel-coat-patterns` · Ajustar atigrado y calicó

**Decisión humana sobre las capturas:**
- **Esmoquin y siamés: aprobados** tal como están.
- **Atigrado: no se lee.** Parece gris liso con una "M" muy fina. Las rayas son delgadas y de poco contraste, y con el gato sucio desaparecen.
- **Calicó: se lee a medias.** Las manchas son barras finas. La barra blanca vertical al costado de la cara parece un error, y las barras de los costados del cuerpo no parecen manchas.

## Ajustes, dentro de las mismas reglas
(cajas embebidas 0.001/0.003, sin enterrar, visibilidad S3b con 41/81 por mancha y pose, giro 0; tope de 12 cajas por patrón)

**Atigrado:**
- Rayas más anchas y más numerosas en caras que miran a la cámara: bandas horizontales en el frente de las piernas delanteras, bandas a los costados de la cara (sin tapar los ojos), y una "M" más gruesa.
- Si con eso todavía no se lee, subí el oscurecido de las rayas del 35% al 50% y actualizá S6 con el valor nuevo.

**Calicó:**
- Menos piezas, más grandes y asimétricas, en caras que miran a la cámara: por ejemplo, un parche grande marrón en un lado de la frente que llegue hasta la oreja (sin tapar el ojo), un parche crema grande en el otro lado de la cara y un parche en una pierna delantera.
- Sacá las barras finas de los costados del cuerpo y la barra blanca vertical de la cara.

## Entrega
Actualizá la tabla, los costos y los tests. Corré de nuevo la visibilidad y las capturas del **atigrado y del calicó** (normal y con necesidades en 0) contra `solid`, con su porcentaje. **Pará y pasame las capturas nuevas antes del RDD.** Sin commits.

### S8 — Prompt5 closure (verbatim; supersedes prior visual-stop/no-commit restrictions)

# Prompt 5 — pet-voxel-coat-patterns: cierre

## Decisión humana
Apruebo el atigrado revisado (M, bandas de cara y patas, tinta al 50 %) y el calicó
de tres manchas grandes, en estado normal y sucio. Esmoquin y siamés siguen aprobados.

## Qué hacer
1. Escribí `review.md` del cambio con: la decisión humana de arriba, las capturas finales
   de `prompt4-final50/`, las métricas (6.89 % / 6.22 % atigrado, 11.97 % / 13.02 % calicó),
   el costo medido (lisa 71, atigrado 95, calicó 79; esmoquin 87 y siamés 95 históricos)
   y el cambio de S6 a `round(channel * 0.50)`.
2. Verificá que proposal, design, specs y tasks digan lo mismo que el código
   (tinta 0.50, 12 cajas en el atigrado, 4 en el calicó, sin barras finas). Corregí lo que no coincida.
3. Corré el RDD nativo y la suite completa. Registrá de nuevo las dos limitaciones:
   verificador independiente NO ejecutado (excepción HOME) y `coat.pattern` en producción
   NO verificado, como requisito para mergear.
4. Hacé un solo commit con Conventional Commits, por ejemplo:
   `feat(pet-home): draw tabby, tuxedo, calico and pointed coat patterns as voxel boxes`

## Qué no hacer
- No cambiar geometría, colores ni tests ya aprobados.
- No push, no merge, no tocar producción.
- Sin `Co-authored-by` ni "Generated with" en el commit.

## Entrega
Hash del commit, resultado del RDD y de la suite completa, y la lista de archivos del commit.

## Tasks

- T1 | S1–S3 | inline | done | Loadable solid-only scaffold → RED 30 assertion failures/6 passes → GREEN36/36 (2files/0skip), raw coat-pattern-t1-{red,green} JSON/stdout/stderr/exit-code under .git/agent-evidence. Repository S2/S3/S3b use actual descriptors and current source camera/root plus existing pose helpers. Commit: forbidden.
- T23 | S1–S3 | two delegated writers in parallel | done | T2 assertion RED21/14 → GREEN35/35 and own semantic typecheck0; T3 initial camera4/4 preservation, assertion RED20/35 plus Home RED1/47 → final GREEN113/113 and own semantic typecheck0. Preliminary fixture issues were separately preserved, never counted as clean RED. Both disjoint workers complete and source changes structurally read back; no interaction needed. Commit: forbidden.
- T4 | S3–S4 | inline | done | heavy job46 exit0: focused184/184 (10files), controls65/65 (6files), full403/403 (52files), all zero skips; tsc0/build0. Existing React scroll-mock and Next Edge static-generation warnings only. Differential28 observations:12 unchanged/16 requested/0 unexpected; source/service SSR mock limitations explicit, initial CJS warning and invalid fixture UUID fixed only in harness. Commit: forbidden.
- T5 | S2,S4–S5,S7–S8 | human | done | Prompt5 explicitly approves revised tabby and three calico spots normal/dirty; tuxedo/pointed remain approved. Commit: @closure.
- G1 | S5–S7 | human gate | done | Four NEW original final50 PNGs sent through direct image reads, with final percentages and copy-ready owner document. STOPPED before review.md/native RDD. T5 remains BLOCKED on human semantic judgment. No commits.

- R1 | S7 | inline | done | Geometry assertion RED7/34 → first candidate75/1 (forbidden cream side contact) → corrected76/76. Geometry35 browser job49 exit0; actual dirty PNG inspection found contrast still low, exercising authorized conditional0.50. Contrast assertion RED4/47 → GREEN76/76. Tabby12/calico4; no S2 exception added. Commit: forbidden.
- R2 | S7 | inline | done | Final focused189/controls65/full408 in52files/0skip, types/build0 (job51); final four browser pairs job50 exit0. New32/32 visibility81/81; all72≥41/81; differential28/24unchanged/4requested/0unexpected. Scope audit passed; only product-source delta coat-patterns.ts,48prior PNGs unchanged/24new hashed;16links. Preliminary audit-field/cross-run CSS-hash assumptions preserved, no product reruns. Commit: forbidden.

- C1 | S8 | inline | done | Reconcile docs/review.md, source/test SHA seal unchanged, include exact final evidence and S1–S13/S3b scenario mapping; no behavior/test edits. Commit: @closure.
- C2 | S8 | inline | done | Fresh full408/408,52files/0failures/0skips,exit0 (job52); heavy/max2workers/HOME unchanged. Raw streams preserved and portable closure-checks.json included. All182 approved source/test files byte-identical. Commit: @closure.
- C3 | S8 | native parent | in_progress | ONE explicit scoped local commit, then committed-only native review from main checkout against13253e9 per repo policy; stop on consent/block. No amend/second commit/push. Commit: @closure.

@closure means the single Prompt5 commit containing this task file, resolved by `git log -1 --format=%H -- odd/tasks/pet-voxel-coat-patterns.md`; exact SHA and native outcome are recorded after creation in Engram and Git-excluded delivery evidence, avoiding a self-referential hash or second commit.

## Log

### L1 — Original request (verbatim)

# Prompt 3 — `pet-voxel-coat-patterns` · Implementación (TDD: RED → GREEN) + capturas

El plan revisado de `frontend/openspec/changes/pet-voxel-coat-patterns/` está validado: tabla de 0/8/8/5/12 cajas, visibilidad S3b con 41/81 por mancha y pose, y babero desde ±0.20.

## Decisiones humanas
- **S2:** apruebo la aclaración. Los contactos internos con normales opuestas entre el babero y el pecho están permitidos; no se permiten caras coplanares expuestas.
- **S8:** el 3% de píxeles del gato es un piso. Informá el porcentaje medido de cada patrón contra `solid`.

## Implementación
- Seguí ODD + TDD + RDD y las tasks T1–T5.
- **RED primero, por aserción:**
  - descriptores y lista;
  - anidado bajo el ancla en el modelo real;
  - colores (rayas derivadas, la suciedad no toca el acento);
  - presets y selección por color y patrón;
  - respuestas normalizadas.

  La omisión del patrón en la cámara ya funciona: va como control, no como RED. Las fallas por módulos nuevos que todavía no existen no cuentan.
- **GREEN** según el plan. Los chequeos de enterramiento (S3) y de visibilidad (S3b) quedan como tests del repo, sobre la tabla real.
- Respetá lo que el plan marca como "no cambiar".

## Verificación
- Corré los tests enfocados, los controles existentes, la suite completa, `tsc --noEmit` y `next build`.
- **Navegador real** (mismo método de siempre, reloj fijo y giro 0):
  - capturas emparejadas `solid` y cada patrón, con necesidades normales y en 0;
  - porcentaje de píxeles del gato cambiados por patrón;
  - conteos por pasada de render;
  - órbita y toque;
  - 0 errores de JavaScript.

## Parada para decisión humana
**Antes del RDD, pará y pasame las capturas** de los 4 patrones (normal y necesidades en 0) con su porcentaje. Si alguno no se lee como el patrón, ajustamos la tabla dentro de las reglas antes de seguir.

## Después de la decisión
- `review.md` con:
  - los comandos y sus resultados;
  - una tabla escenario → test de S1 a S13 que diga si cada test falla sin el cambio o solo comprueba que nada se rompió;
  - las capturas;
  - cualquier diferencia con el plan.
- RDD declarando todos los archivos, incluidos los nuevos sin trackear.
- **Decisión para este candidato:** el verificador independiente queda sin ejecutar (su perfil aísla `HOME`). Registralo como limitación, no como aprobado.
- Si el RDD se bloquea, pará y reportá.
- Sin commits.
- El merge sigue condicionado a que el backend con `coat.pattern` esté desplegado en producción.

### L2 — Routing and preflight

Large by resume test: separate numerical/SSR, state/API and browser evidence plus an explicit human decision boundary. Forecast ~1100–1800 authored source/test lines plus evidence/docs; protect reviewer with coherent behavior units, but user explicitly forbids commits so no slicing/delivery prompt applies now. T1 parent inline; after its shared module is complete, T2 renderer and T3 plumbing are independent substantial units with disjoint writes and launch together. Worker outputs must reference actual OpenSpec S1–S13/S3b as well as this document's quoted S1–S6. Parent alone owns tracking/OpenSpec/evidence/browser gates. No independent verifier: human exception, never approved. Native review mode read-only status: on; no native review starts before G1 decision. Backend deployment gate remains unverified; no production operations. Preflight main baseline correct, clean tracked/index, six untracked plan docs and 21 old ODD artifacts preserved, HOME=/home/agent, Node24.22.1, relevant3002–3112portsfree. .cursor/skills directory unavailable; use injected applicable skill paths and repo rules without inventing a skill.


### L3 — Prompt4 recovered scope (reconstructed from compacted context; original raw prompt unavailable, no verbatim claim)

# Prompt 4 — `pet-voxel-coat-patterns` · Ajustar atigrado y calicó

**Decisión humana sobre las capturas:**
- **Esmoquin y siamés: aprobados** tal como están.
- **Atigrado: no se lee.** Parece gris liso con una "M" muy fina. Las rayas son delgadas y de poco contraste, y con el gato sucio desaparecen.
- **Calicó: se lee a medias.** Las manchas son barras finas. La barra blanca vertical al costado de la cara parece un error, y las barras de los costados del cuerpo no parecen manchas.

## Ajustes, dentro de las mismas reglas
(cajas embebidas 0.001/0.003, sin enterrar, visibilidad S3b con 41/81 por mancha y pose, giro 0; tope de 12 cajas por patrón)

**Atigrado:**
- Rayas más anchas y más numerosas en caras que miran a la cámara: bandas horizontales en el frente de las piernas delanteras, bandas a los costados de la cara (sin tapar los ojos), y una "M" más gruesa.
- Si con eso todavía no se lee, subí el oscurecido de las rayas del 35% al 50% y actualizá S6 con el valor nuevo.

**Calicó:**
- Menos piezas, más grandes y asimétricas, en caras que miran a la cámara: por ejemplo, un parche grande marrón en un lado de la frente que llegue hasta la oreja (sin tapar el ojo), un parche crema grande en el otro lado de la cara y un parche en una pierna delantera.
- Sacá las barras finas de los costados del cuerpo y la barra blanca vertical de la cara.

## Entrega
Actualizá la tabla, los costos y los tests. Corré de nuevo la visibilidad y las capturas del **atigrado y del calicó** (normal y con necesidades en 0) contra `solid`, con su porcentaje. **Pará y pasame las capturas nuevas antes del RDD.** Sin commits.

### L4 — Routing and constrained geometry

Inline: one shared recipe module; neither descriptor-only edit justifies a separate writer. Existing large feature tracking retained for human gate. Archive current source/approved descriptors and old captures before changes. Candidate tabby12 = 4 thick M strokes + 4 lateral face bands + 4 horizontal foreleg bands; no body bars. Candidate calico4 = brown left forehead + connected two-piece cream blaze/right forehead (one asymmetric logical patch) + one right foreleg patch: three logical spots, four chunky boxes, no thin face/body bars. Keep initially0.65 stripe factor and existing dirt/accent semantics; conditional0.50 requires actual revised dirty-image inspection. Approved tuxedo8/pointed12, base anatomy, API/presets/renderer/helpers untouched. No new product choice blocks this authorized iteration.


### L5 — Prompt4 technical closure and visual handoff

R1/R2 verified: table0/12/8/4/12; cap12; tabby50% after geometry35 dirty inspection; calico4 chunky boxes/three spots, cream gap0.003. Geometry assertion RED7 and conditional contrast RED4; final focused189/controls65/full408,52files/0skip,types/build0. New32/32 visibility81/81; approved descriptors/SSR unchanged and only product source delta coat-patterns.ts. Differential28/0unexpected. Final browser job50 four pairs, floors6.8854/6.2203% and11.9686/13.0198%, JS0, resources cleaned; costs95/1090 and79/898. Advisory hashes/actual buffers verified; five calico CSS pixels differ by≤1 cross-run, actual buffers identical; initial rootYaw audit-field typo recorded and corrected. No false assertion RED. Current copy-ready owner handoff is evidence/visual-decision.md, data under evidence/prompt4-final50. Independent verifier UNEXECUTED, backend production support UNVERIFIED. Stop on exact user instruction: “Pará y pasame las capturas nuevas antes del RDD. Sin commits.” No review.md/native RDD/commits/staging/push/production operations.


### L6 — Four-image delivery and stop

Direct image attachments sent: evidence/prompt4-final50/{tabby-normal,tabby-zero,calico-normal,calico-zero}.png. G1 delivery complete, T5 blocked on human approval; no background work remains. As requested, no further RDD/commit action. Provenance clarification: after compaction the original raw Prompt4 text is not present; the recovered S7/L3 scope was reconstructed from the provided summary, so its earlier verbatim heading is corrected. Requirements and evidence remain as recovered; no invented raw quote is authoritative.


### L7 — Prompt5 (verbatim)

# Prompt 5 — pet-voxel-coat-patterns: cierre

## Decisión humana
Apruebo el atigrado revisado (M, bandas de cara y patas, tinta al 50 %) y el calicó
de tres manchas grandes, en estado normal y sucio. Esmoquin y siamés siguen aprobados.

## Qué hacer
1. Escribí `review.md` del cambio con: la decisión humana de arriba, las capturas finales
   de `prompt4-final50/`, las métricas (6.89 % / 6.22 % atigrado, 11.97 % / 13.02 % calicó),
   el costo medido (lisa 71, atigrado 95, calicó 79; esmoquin 87 y siamés 95 históricos)
   y el cambio de S6 a `round(channel * 0.50)`.
2. Verificá que proposal, design, specs y tasks digan lo mismo que el código
   (tinta 0.50, 12 cajas en el atigrado, 4 en el calicó, sin barras finas). Corregí lo que no coincida.
3. Corré el RDD nativo y la suite completa. Registrá de nuevo las dos limitaciones:
   verificador independiente NO ejecutado (excepción HOME) y `coat.pattern` en producción
   NO verificado, como requisito para mergear.
4. Hacé un solo commit con Conventional Commits, por ejemplo:
   `feat(pet-home): draw tabby, tuxedo, calico and pointed coat patterns as voxel boxes`

## Qué no hacer
- No cambiar geometría, colores ni tests ya aprobados.
- No push, no merge, no tocar producción.
- Sin `Co-authored-by` ni "Generated with" en el commit.

## Entrega
Hash del commit, resultado del RDD y de la suite completa, y la lista de archivos del commit.

### L8 — Closure routing

Visual gate satisfied by explicit human approval. Documentation-only continuation inline; no writer/independent verifier (explicit HOME exception). Preserve every approved frontend source/test byte. User explicitly selects ONE feature commit, overriding normal work-unit slicing for this existing feature; report actual authored line workload, do not code-golf/split. Main-checkout repository policy requires commit first, then committed-only native review from branch base13253e9 (no prior branch approval ref), so immutable reviewed commit can be delivered without amending. Final native closure is outside the reviewed tree and in Engram; review.md truthfully records pending at commit freeze, not fabricated future approval. No production/publishing. If native blocks, retain exact commit and report blocker; do not recover/retry consent automatically.


### L9 — Fresh Prompt5 suite and precommit freeze

Full suite job52 exit0:408/408,52files,0failures,0skips; max2workers, HOME=/home/agent, Node24.22.1; all182 source/tests byte-identical before/after. Closure docs now current; review.md includes exact human decision, final images/percentages/costs and scenario mapping. Capture-time JSON statuses/history remain unchanged, not mistaken for current approval. One scoped local commit then native committed-only review; no future native result is fabricated in committed documentation. Explicitly no push/merge/production.
