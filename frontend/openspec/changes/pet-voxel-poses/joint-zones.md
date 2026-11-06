# Measured articulation zones — NONBLOCKING S19 diagnostics

**S19 supersedes every zero-penetration/zone-as-gate rule below.** Original measured numbers are retained unchanged as diagnostic history. SAT overlaps, zone radii/excesses and pivot-distance metadata warn only; they do not reject an endpoint/transition, and the former frozen-D SAT counterexample is no longer a blocker. There is no pending S18 owner-scope choice.

Current acceptance is actual structural parent-child contact within .001, unchanged floor/support, and real WebGL front/three-quarter/diorama evidence for visible crossings. Different-joint structural links and same-owner decoration bookkeeping are separately labelled in the current all-link report. Immutable nose/philtrum .05 and whisker .014 decoration gaps remain explicit; latent/neutral structural gaps remain disclosed, not hidden by a broader tolerance or geometry changes. See [current C endpoint proof and limitations](lying-poses.md). D20 remains an unchanged head-support result, NOT all-joint proof.

New current C per-profile/side/breath contact and penetration values, frozen pair overlap baselines and a **NONBLOCKING +.005 warning margin** are in `odd/evidence/a2-visible-curl-s19/worker/penetration-baseline.json`. `penetration-warnings.py` compares later connectivity output and always exits zero; crossing acceptance is visual, never inferred from these values.

## Historical S18 proposal and results (NONBLOCKING, superseded)

All uses of “forbidden”, “block”, “required decision” or “not accepted” in the archived report below describe its former criterion, not S19 acceptance.

### Former proposed rule

For each mandatory profile, take the immutable A1 neutral bind geometry. For each explicitly adjacent parent/child pair, compute the actual closed intersection of its two OBBs. Its vertices include corner-inside-box and edge/face intersections.

The proposed region is a **pivot-centered sphere** with radius
`r = max(distance(neutral intersection vertex, articulation pivot))`.
This is the smallest sphere WITH THAT FIXED CENTER, not a freely centered enclosing sphere. A real touching face counts as a geometric junction; an actual gap creates no region. Regions are per profile, not the largest value borrowed from a different profile.

For a posed intersection, EVERY intersection vertex must lie inside that pair's transported sphere. Convexity then contains the whole intersection. Outside is forbidden. Nonadjacent pairs have no exception even if physically near a different articulation. The existing1e-10 numerical comparison is retained; no physical padding, radius tuning or SAT-depth allowance.

Use the real current pivot, unchanged unit joint scales and uniform root placement. Body/head uses proximal joint-neck across the empty neck bridge, not a fabricated joint. Intrinsic part attachments use their shared owner frame. Explicit part.parent plus existing structural and extension-host edges define38 pairs; no owner-group cross product, facial-sibling exemption, or ancestor collapse through a box-bearing joint. In particular body/tailMid, body/tailTip, body/shin and body/paw are not parent-child.

This is an engineering proposal for owner validation, not a claim it is the unique intended anatomical decomposition. Decorative same-owner grouping is explicitly not silently reclassified. Six hidden neutral extension binds are measured as existing latent geometry and labelled in the JSON; no hidden geometry is introduced into actual visibility.

## Measured radii (model units; rounded6 decimals)

L/R grouped rows have identical values at the shown precision. These23 rows represent all38 actual pairs /152 per-profile measurements. Full precision, pivot IDs, intersection vertex counts, neutral visibility and whole-child coverage are in neutral-zones.json.

| Parent / child | default0 | default100 | compact0 | deep100 |
|---|---:|---:|---:|---:|
| body / chest | .386359 | .473814 | .319499 | .679541 |
| head / cheekL,R | .375366 | .375366 | .375366 | .375366 |
| head / muzzle | .329090 | .329090 | .329090 | .329090 |
| head / earL,R | .097980 | .097980 | .053814 | .171219 |
| earL,R / earInnerL,R | .160312 | .160312 | .096187 | .256500 |
| head / eyeL,R | .341065 | .341065 | .341065 | .341065 |
| eyeL,R / pupilL,R | .334000 | .334000 | .334000 | .334000 |
| head / nose | none | none | none | none |
| head / philtrum | none | none | none | none |
| head / whiskerL1,L2,R1,R2 | none | none | none | none |
| tailMid / tailTip | .070711 | .070711 | .070711 | .070711 |
| pawFL,FR / padFL,FR | .140000 | .140000 | .140000 | .140000 |
| body / head | .314817 | .375366 | .321719 | none |
| body / legFL,FR | .125077 | .123693 | none | .294489 |
| forearmFL,FR / pawFL,FR | none | none | none | none |
| body / hipL,R | .222752 | .254165 | .196003 | .339116 |
| shinBL,BR / pawBL,BR | .122066 | .122066 | .122066 | .122066 |
| body / tailBase | .089519 | .130767 | none | .351192 |
| tailBase / tailMid | .070711 | .070711 | .070711 | .070711 |
| legFL,FR / forearmFL,FR | .106771 | .106771 | .106771 | .106771 |
| hipL,R / shinBL,BR | .171172 | .171172 | .171172 | .171172 |
| muzzle / jaw | .123288 | .123288 | .123288 | .123288 |
| jaw / tongue | .075000 | .075000 | .075000 | .075000 |

**Important limitations:** compact0 body/tailBase is separated in A1 neutral, so no measured region exists there. Deep100's neutral body/tailBase intersection is the WHOLE Base box: the resulting sphere contains that whole child under arbitrary rotation. This naturally broad case is disclosed, not called a small anatomical seam or extended to Mid/Tip. Some cap-touch and intrinsic face regions are broader than the visible intersection itself because a sphere is used. None means no neutral intersection, not a zero-distance target.

## Existing-pose compatibility — unchanged authoring

Counts of forbidden pairs at neutral breath1, actual prepared Core/Bind snapshots:

| Profile | S seated | Q standing | L loaf | F sphinx | D side | C curled | B bellyUp |
|---|---:|---:|---:|---:|---:|---:|---:|
| default0 | 4 | 14 | 19 | 17 | 15 | 33 | 8 |
| default100 | 3 | 11 | 21 | 19 | 14 | 31 | 17 |
| compact0 | 4 | 15 | 20 | 16 | 16 | 39 | 20 |
| deep100 | 6 | 12 | 21 | 17 | 14 | 25 | 9 |

All84 snapshots (.99/1/1.01 ×7poses ×4profiles) passed the unchanged floor check. These are newly exposed geometry failures under a proposed broader criterion, NOT application regressions caused by pose edits. Decoration adjacency interpretation affects some counts, but the following structural examples do not depend on that interpretation:

- D/deep100 body–shinBL: SAT+.211191215918; body–pawBL:+.075420097127. A box-bearing hip lies between these pieces in the actual chain; no adjacent-zone radius can exempt either pair.
- D/deep100 body–head:+.020385208749, while its neutral pair is disjoint. A per-profile neutral-derived region cannot be invented there.
- S/deep100 body–tailMid:+.094, also nonadjacent. The underlying deep A1 rest boxes already intersect; unchanged fixtures do not prove the new invariant.

D's original20/20 checks prove designated cheek/head floor support and stable contact through breathing. They do NOT assert this new all-pair penetration invariant. Their passing result and the new incompatibility are both true.

## Consequence for C transitions

D↔C are required graph transitions. D already has positive nonadjacent penetration under the new rule. Preserving D exactly therefore prevents certifying every frame of these closed transitions. Positive depth and continuous geometry also imply a failing neighborhood near the D endpoint; simply omitting the endpoint or adding intermediate waypoints does not solve it.

No full transition sweep is claimed: this concrete endpoint counterexample blocks acceptance first. It is not an impossibility proof for a new isolated C endpoint or a different rig. No new C FK construction was applied. The S17 three-attempt ledger stays closed and unchanged.

## Applied tests and exact outcomes

- New geometry/topology/neutral-region unit cases: RED9failed/exit1 → GREEN9passed/exit0.
- Original D public support gate: **20passed/exit0**,21 filtered cases, not21 passes. D production source and support assertions unchanged.
- New focused C head-hip direction / actual tip toward head on same ground-plane body side / all-joint clearance: **3failed/exit1**,85 filtered cases. Current C has not been reauthored.
- Initial unfiltered88-case C RED run exceeded30seconds. Failed timeout, no observed process exit; raw partial output and timeout record retained. No child remained; narrowed diagnostic run replaced it without claiming a complete88-case result.
- Matrix runner exit0 means measurements completed, not that poses passed. Queue351.01121s, actual execution12.393977s.
- Full suite/types/lint/build, whole-branch independent verification, all-frame/interruption sweeps, browser video and physical phone checks remain unrun. No accepted endpoint exists to justify a result-based tip/head guard. No guard or margin invented/frozen.
- No source/geometry/IDs/anchors/A1 fixture, D, Freighter, B1, coin or spec8 implementation changed. No commit/native authority/push/merge. No server, database or browser launched by this phase; jobs54/55 finished.

## Evidence and pending owner decision

Source/test evidence: odd/evidence/a2-joint-zones-rigid-curl/.
- before-policy-matrix/neutral-zones.json and compatibility.json: full152 radii and84 snapshots.
- policy-red.*, policy-green.*, matrix.*, D-preserved-20.*, C-s18-red-focused.*: genuine separate stdout/stderr/exits and exact argv.
- C-s18-red.timeout.json; original bad D pin and esbuild/label diagnostics retained, corrected without hiding failures.
- before-hashes.json, immutable-evidence-hashes.json and preservation record: source identity and old848 evidence hashes.

Production lying source remains fc525ba2dc55c215c0ce05361e5fdbfba0681db901a0309254304ef589ff4f60 on f3629abd0079a71dcc0ab9e44e0100d44e5d5d43. Only C acceptance tests, new test-only helper/tests and current-spec documentation changed.

**Owner must choose the scope:** preserve D and treat C-only static authoring as partial with D-transition compatibility explicitly deferred; authorize a separate compatibility proposal covering frozen D and other affected poses before more authoring; or explicitly reopen affected pose authoring while retaining the original20/20 support assertions. None is selected by this report. No silent D fix, forbidden-pair exemption or region inflation.
