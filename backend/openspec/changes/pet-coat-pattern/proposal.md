# Proposal: persisted pet coat pattern

Status: implemented and functionally verified; pre-native-RDD checkpoint. No commits, push or production deployment.
Baseline: `d7d0fd29c06b33cbb8ccb427940d46fbcf2a602d`, branch `feat/voxel-pet-migration`.

## Intent

Persist a coat pattern with the existing three colors so customization survives reload. Return `coat.pattern` from `GET /pet/state` and optionally accept it in `POST /pet/coat`. Rendering belongs to the later frontend change `pet-voxel-coat-patterns`.

## In scope

- Ordered, append-only `COAT_PATTERNS`: `['solid', 'tabby', 'tuxedo', 'calico', 'pointed']`; required `PetCoat.pattern`, default/read fallback `'solid'`.
- Optional write input: omission preserves the stored pattern; recognized values replace it; unknown input receives400 before state creation or persistence.
- Handwritten `0004_coat_pattern.sql` beginning with `SET LOCAL lock_timeout = '5s';`, statement breakpoint, then ADD COLUMN; additive journal entry, schema and repository mapping. No `CHECK` and no data backfill.
- One shared ValidationPipe factory used by bootstrap and HTTP tests without changing the current options.
- Domain/service/repository tests, real HTTP tests and a real PostgreSQL0000–0003→0004 upgrade test using the existing test infrastructure.
- Backend README documentation of the payload and migration→backend→frontend rollout order.

## Out of scope

Frontend code, rendering, camera behavior, pricing/shop gates, other pet endpoint behavior, auth, guards, roles, other modules, old migrations and snapshots, dependencies and test infrastructure redesign. No production access, production database changes, commits, push or deployment. Isolated PostgreSQL test migrations are authorized by Prompt2.

## Acceptance

See [domain specs](specs/coat-contract.md), [HTTP/compatibility specs](specs/http-compatibility.md), [persistence/migration specs](specs/persistence-and-rollout.md), [design](design.md) and [implementation tasks](tasks.md). In particular: calico persists across GET/reload and a later colors-only save; striped fails400 without mutation; a raw zebra row reads as solid; legacy rows acquire solid when0004 runs.

## Findings and risks

- The service method is `setCoat`; `applyCoat` is a pure rule that currently replaces the complete coat.
- `@IsOptional()` skips null as well as undefined. Only omission is preservation: an explicitly supplied nonmember, including null, is rejected by service validation. Read normalization must never turn invalid write input into a successful solid save.
- Repository updates for care and rename also write the complete coat; they must carry the pattern without changing those endpoints.
- Journal0003 has `when:1792291000000`; equal timestamps also get skipped. The sole snapshot is0000 and omits pet_states: do not run generate.
- Constant-default ADD COLUMN avoids rewriting existing rows, but still acquires a table lock. The container runs migrations before starting the API in the same backend deployment; a separate operator is not required.
- Implementation risks: stored-data/schema change, shared global validation boundary and compatibility of shared pet persistence. Implementation must record actual functional/native-review evidence; the independent verifier is explicitly UNEXECUTED / NOT APPROVED for this candidate.
