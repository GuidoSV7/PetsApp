# Plan: visible voxel coat patterns

Prompt5 approves the final tabby/calico images in normal and dirty states; tuxedo/pointed remain approved. Final counts are **0/12/8/4/12**, hard ceiling12, tabby ink `round(channel * 0.50)` after dirt once. The approved source/tests remain unchanged during closure. One local Conventional Commit and native review are authorized; no push, merge or production operations.
The baseline investigation and pure planning calculations below retain their original provenance; current closure evidence is in [review](review.md), [tasks](tasks.md) and `evidence/prompt4-final50/checks.json`. No independent-verifier approval is implied: it remains explicitly unexecuted.

## Outcome and scope

Render solid/tabby/tuxedo/calico/pointed using thin boxes directly inside their anchor meshes. Add pattern-aware presets, response normalization and omission-safe writes. Preserve the immutable 33-part table, roles, hierarchy, needs formulas, idle motion, adaptive resolution, fixed shadow, camera/orbit interactions, home layout and Diseño 3D behavior.

Read [design](design.md), then the verifiable specs: [geometry S1–S4 plus home-camera S3b](specs/pattern-geometry.md), [rendering S5–S8](specs/rendering-inheritance.md), [presets/API S9–S13](specs/presets-and-api.md), and [tasks](tasks.md).

## Baseline code evidence before implementation

Paths below are relative to `frontend/`; unqualified source paths are under `src/features/pet-home/`.

| Evidence | Consequence |
|---|---|
| `src/features/pet-home/cat-anatomy.ts:31–64`: 33 boxes facing +Z; child positions are model-world rest centers | Keep the table byte-identical; patch offsets are anchor-local, not copied world centers. |
| `cat-part-tree.ts:7–70`: base-relative tree, transform and bottom-hinge pose helpers | Reuse them. There is no exported world-matrix composer; reuse the Matrix4 test composition examples. |
| `components/Cat3DModel.tsx:178–225` and `test/features/pet-home/cat-3d-model.test.tsx:1–96` | Actual mesh recursion already exists; add patch children and extend the real-model SSR test. |
| Actual `Cat3DViewer.tsx` camera/target, model root and evaluated `defaultCatDesign`/scale | Pure calculation extracts camera [0,0.42,3.05]/fov28, target [0,0.18,0.05], root [0,-0.22,0], scale 0.78. S3b must read these inputs anew, never depend on idle yaw. |
| `pet-customize.ts:4–39`, `components/PersonalizeStrip.tsx:63–82` | Five color-only presets; selection currently checks primary only. |
| `api/pet.service.ts:9–78`, `components/PetHomeStage.tsx:79–120,243–278` | State, callbacks and responses need pattern plumbing; all state responses currently return raw data. |
| `components/CameraCoatCapture.tsx:15,89–99` | Camera already emits colors only. Preserve this; it does not need a new pattern-removal feature. |
| `test/features/pet-home/pet-api-stub.ts:23–52,128–139` | Stub lacks pattern and replaces coat wholesale; model backend omission preservation. |
| `need-visuals.ts:118–144` | Existing dirt blends primary/secondary toward brown, never accent. It can lighten very dark inputs; do not change that formula or promise universal luminance reduction. |
| Adaptive-resolution `design.md:22–43` | Existing cost model is 71 draws/802 triangles; each patch adds about two draws, not one draw per cube face. |

Vaquita is a visual technique reference; no implementation was located in the local index or inspected externally. No claim of source equivalence is made.

## Authorized implementation surfaces

- New `src/features/pet-home/coat-patterns.ts`: identifiers, normalization, descriptors, stripe color and separate state/input types.
- Existing `pet-customize.ts`, `components/PersonalizeStrip.tsx`, `api/pet.service.ts`.
- `components/PetHomeStage.tsx`: state/callback plumbing only; `Cat3DViewer.tsx`: coat prop forwarding/type only; `Cat3DModel.tsx`: child patches and materials.
- New `test/features/pet-home/coat-patterns.test.ts` and `coat-pattern-geometry.test.ts`; extend `cat-3d-model.test.tsx`, `cat-3d-viewer.test.tsx`, `pet-customize.test.ts`, `personalize-strip.test.tsx`, `pet.service.test.ts`, `pet-home.test.tsx`, `camera-coat-capture.test.tsx` and the shared API stub.

No edits to anatomy/tree/needs/idle/quality helpers, camera extraction, admin settings/resolver, CSS/layout, backend, dependencies or lockfiles. Touching home/viewer plumbing is necessary, but does not authorize changing their behavior outside this feature.

## Risks and approval boundaries

- Original-table failure is reproduced: 42 nonburied boxes, but 32 invisible from home in both rest fixtures. Burial S3 is not visibility S3b.
- Prompt4 counts0/12/8/4/12, maximum/hard ceiling12. Current72 patch/pose visibility checks pass; all32 tabby/calico checks are81/81. Whole-polygon, strict footprint and coplanarity tests remain intact. Historical0/8/8/5/12 and66-check planning results are retained as provenance only.
- Exact bib joins at x=±0.20 require two explicitly classified **internal opposing-normal contacts**. The former blanket ban cannot literally exclude every coplanar side face while demanding contact; exposed/same-facing overlaps and chest-interior penetration remain forbidden. Review this clarification rather than assuming zero coplanarity of every face.
- S3 retains all-33 whole-face and isolated-zero/idle fixtures; S3b adds actual-camera default-home yaw-0 normal/all-zero visibility, independent of idle/reduced motion. Admin inheritance remains mandatory, not universal exposure under independent sliders/all viewing angles or viewport shapes.
- Final tabby/calico WebGL captures and per-pass costs passed; Prompt5 explicitly approves human readability in both states. Floors≥3% and S3b do not prove semantic recognition or approve images. Approved tuxedo/pointed captures remain historical and unchanged.
- Cost formulas agree with fresh tabby/calico per-pass measurements; approved other-pattern measurements remain historical. Desktop/SwiftShader counts are not low-end-phone FPS or GPU-time evidence.
- Backend source merged to main is NOT proof of production deployment.

**Hard merge precondition:** the backend supporting `coat.pattern` must already be live in production. Require operator-confirmed deployed backend version/DTO support and a raw `GET /petsapp-api/pet/state` response containing a known `coat.pattern`, before frontend normalization. An old backend rejects pattern writes with 400. Do not use the frontend's solid fallback as deployment evidence or write production data during this closure.

Prompt5 satisfies the visual gate and authorizes documentation reconciliation, a full-suite rerun, native review and exactly one local commit. The final tabby has12 boxes; calico has4 boxes/three larger logical spots; no thin body/face-side bars remain. Native review must inspect the committed candidate from this main checkout per repository policy. No push or merge. Backend production support remains unverified and blocks future merge.
