# Spec: joints, attachments and hidden anatomy

Status: IMPLEMENTED and verified. D1/D2 and adjustments1/2 are retained. [Verification report](../review.md) records the exact executed acceptance, native approval/acknowledgement and nonblocking follow-ups; this passive status update is outside native approval.

## S1 — Rigid joints and surface-following positions

User requirement:
> Cada caja cuelga de una articulación (nodo sin malla) que solo lleva posición y
> rotación; la escala vive solo en la caja. Ninguna articulación con escala ≠ 1.

Every skeletal joint MUST be a non-mesh node with local scale exactly `[1,1,1]`. No joint may descend from a box mesh. Box-local offsets are permitted; box meshes carry all nonuniform scale. The existing uniform model/interaction wrapper is external, not a scaled joint.

User requirement:
> Articulaciones que nacen en la superficie de una caja escalada (cuello, hombros,
> caderas) se corren con esa escala, para que nada se despegue con hambre 0–100.

Attachment positions MUST be derived from the resolved surface: resolved center plus resolved diagonal scale times the bind surface offset. Do not add inverse-scale ancestors. D2 proposes compensating descendant rest offsets so this movement does not alter formerly independent visible head/limb transforms.

Future acceptance: inspect actual joint ancestry/local scale, surface equations and default-admin contact over hunger0–100. Contact includes overlap. Preserve pre-existing geometry/admin effects; do not silently create a broader all-admin contact guarantee. D2 is approved as an A1-only compatibility device; A2 decides whether limbs follow the body. Compile box bind offsets only from admin/resolved needs; fixed-configuration binds MUST remain identical between idle samples. Do not recompute them per frame from legacy worlds.

## S2 — Chains and the existing rest pose

User requirement:
> Cadenas: hombro, codo y muñeca en las patas delanteras; cadera, rodilla y tobillo en
> las traseras; cuello, cabeza y mandíbula; los tres segmentos de cola; orejas.

User requirement:
> Una sola pose: la de reposo, que reproduce exactamente la actual.

The graph MUST provide both front chains, both rear chains, neck/head/jaw, all three tail joints and both ear joints. Proposed IDs, parents, default local/model-space positions and box ownership are the 22-row table in [design](../design.md#3-joint-table-default-rest-pose).

Existing idle remains the only existing motion applied to the rest pose; it is not a new pose library. Preserve the old ear/tail lower-face pivots, relative tip angle and absolute-per-frame updates. No new bend, walk, wash, voice or animation system is added in A1.

Future acceptance: exact joint topology, unique ownership of all33 legacy boxes, acyclic graph, unchanged root wrapper and independent pre-change full-matrix fixtures. Do not substitute center-only checks for matrix parity.

## S3 — Append-only hidden pieces and empty anchors

User requirement:
> Piezas nuevas con ids nuevos (append-only): antebrazos, canillas, mandíbula, lengua.
> En A1 quedan con `visible=false`; A2 las enciende. Así los draw calls no cambian.

Keep the legacy anatomy table and its33 entries intact. The extended manifest MUST begin with those entries in order, followed by `forearmFL`, `forearmFR`, `shinBL`, `shinBR`, `jaw`, `tongue`, without reused IDs. Positions, dimensions, ownership and inherited roles are proposed in the design.

All six actual box meshes MUST have `visible=false` for every A1 input, including need/admin changes and pattern reconciliation. Their volumes MUST remain inside the existing containing volumes. They MUST NOT receive pattern patches. No A2 visibility switch or UI is introduced.

User requirement:
> Anclajes vacíos para accesorios futuros: cuello, cabeza y lomo.

Provide `accessory-neck`, `accessory-head` and `accessory-back` as empty, unit-scale, non-mesh nodes with the design's surface-following positions. No asset or accessory geometry is included.

Future acceptance: original33 manifest prefix unchanged; six additional unique hidden meshes; containment in the actual containing-box frame; exactly three empty named anchors; unchanged visible-box and actual render-pass counts. This requires D1's explicit migration of obsolete total-scene-mesh assertions, not removal of the legacy33 checks.
