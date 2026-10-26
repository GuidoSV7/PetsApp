# Spec: identifiers, exposed faces and home visibility

Status: implemented and human-approved by Prompt5 in normal/dirty states. Counts0/12/8/4/12, hard ceiling12; no thin tabby/calico body/face-side bars. Whole-face/S3b tests and [design](../design.md) define geometry; [review](../review.md) records approval and evidence.

## S1 — Ordered identifiers and pure descriptors

The frontend MUST use exactly `['solid', 'tabby', 'tuxedo', 'calico', 'pointed']`, equal to the backend export and in that order; persisted identifiers are append-only. Known values normalize unchanged; omitted, null and unknown values such as zebra normalize to solid.

A pure descriptor function MUST produce **0/12/8/4/12** boxes respectively, valid existing anchors and unique IDs `<pattern>-<anchor>-<n>`. No ID may collide with any of the 33 base IDs. It MUST NOT mutate anatomy, inputs or registry. Ink roles remain separate from the six immutable base roles.

Acceptance: exact tuple/order and test-only parity with current backend source (no backend import in the browser bundle), known/unknown normalization, expanded counts, deterministic output, valid anchors, unique/disjoint IDs and unchanged base table.

## S2 — Anchor-local embedded boxes and classified contacts

Each box MUST use the face convention/table in design. Inner face MUST be 0.001 inside its anchor, outer face 0.003 outside, thickness 0.004. Its whole rotated tangent footprint MUST stay strictly within the anchor face. No anchor gap, outward or same-facing coplanar overlap, or patch/patch coplanar overlap is permitted.

Exact tuxedo joins at chest x=±0.20 are the only permitted base/patch coplanar contacts: two internal side-face regions with **opposing normals**, not exposed coincident faces. Positive chest-interior volume penetration remains forbidden. This explicitly clarifies the previous blanket ban: exact touching cannot honestly be described as zero coplanarity of every side face.

Acceptance: derive actual faces, including rotated M strokes; assert signed distances and footprints within 1e-6 tolerance. Classify all positive-area coplanar pairs. Require zero exposed/same-facing pairs and exactly the two stated opposing chest contacts for tuxedo, none for other patterns. Assert body-local contact area 0.001005 per panel and zero interior chest penetration. Do not silently skip those joins or accept a descriptor because its center is near its anchor.

## S3 — Whole-face exposure against every base part

For every patch in the default-design normal/worst-needs/idle fixtures defined in design, its whole outward face MUST NOT enter any of the 33 composed base volumes. Tests MUST compare against all parts, not just the anchor. Inverse-matrix polygon clipping against six local box planes is the repository oracle; four corners plus center, flat rest offsets and world AABBs are insufficient.

Acceptance: assert no positive-area inward intersection or overlapping outward coplanar face, using existing tree/pose helpers and full parent matrices. Include an oracle counterexample with a small blocker between sample points so an incomplete corner-only implementation cannot pass. All-zero and isolated zero needs are mandatory, not substitutes for each other. Preserve ear/tail extrema fixtures; the two planning rest calculations do not discharge this full test obligation.

## S3b — Essential markings visible from the actual home camera

S3b MUST run separately from S3. Use the actual current viewer camera position/fov/target, model root position and resolved default-home scale from source or captured component props, never a manually maintained copy. Compose the existing admin → needs → pose hierarchy. Check default square-frame rest pose at **yaw 0**, normal needs and all four needs zero, without bob/reaction/idle displacement. Reduced motion MUST NOT depend on yaw to reveal essential markings.

For every essential outward face, sample fixed 9×9 cell centers as specified in design. Require a positive camera-facing dot product, projection inside the perspective frustum, and no interior intersection of its finite camera segment with any of the 33 composed boxes. At least **41/81 samples per patch in each fixture** MUST pass. Report orientation, clipping and named blockers separately; do not average across patches or poses.

Require all four M strokes plus at least three non-M tabby stripes; both tuxedo bib panels and both front socks; at least three distinct calico marks; and pointed mask, both ears and both front paws. Every box in the revised table is essential and must meet the threshold. Optional/orbit-only marks, if later proposed, still consume budget but cannot satisfy this rule.

Acceptance: derive camera/root inputs anew, assert each patch's sampled fraction and semantic group coverage, and retain the original-table counterexample: no burial yet 32/42 patches at 0/81. Current repository-helper results are recorded per ID in design; they are not browser readability approval or universal visibility under independent admin sliders/all viewport shapes.

## S4 — Frontal placement and economical table

Tabby MUST use four thicker forehead M strokes, four horizontal head-front bands outside the eyes and two horizontal bands on each front leg (four leg boxes). No body-front bars. No top/side/tail ring boxes. Tuxedo MUST use two body-front panels touching chest edges exactly x=±0.20, two front-leg marks and two pad-side strips on each front paw, secondary ink; no muzzle or hind socks.

Calico MUST use four larger asymmetric front boxes representing three logical spots: a brown left-forehead patch reaching the ear base without covering the eye, a two-box cream blaze/right forehead, and a brown right-front-leg patch. The cream boxes have a 0.003 tangent gap, not an extra opposing-contact exception. No thin body-side bars or vertical face-side bar. Pointed MUST use four head-front mask pieces, two upper **front** ear caps above the inner ears, two front-leg marks and two pad-side strips on each front paw, accent ink. No ear-back, hindpaw or tailTip boxes. Do not cover/change eyes, inner ears, pads or chest geometry.

Acceptance: exact expanded anchors/faces/centers/dimensions/rotations/inks/counts from design, all-33 S3 plus S3b, exact bib joins and exclusions. Counts are 0/12/8/4/12 (maximum 12); hard ceiling is 12 (Prompt4), not an allowance for invisible decoration. Any refinement must update table, counts, costs and numeric/browser evidence before approval.
