# Proposal: retire the backend global pet-model API

Status: resumed and authorized by Prompt 4, without commits/push.
Prerequisite test-db-postgres committed as ae77894; G1–G3 resolved.
Scope: backend model endpoints, filesystem-model code, direct upload dependencies and obsolete example configuration.

## Outcome

Remove the backend-owned global model feature. The pet module retains its pet
controller, service and repository wiring. The existing frontend catch-all is
unchanged: once Nest has no matching model route, requests receive Nest's normal
routing 404 rather than reaching an upload handler.

This supersedes the model API behavior in historical `global-pet-model` and
`fix-admin-pet-model-404` changes; preserve those records.

## Why

The frontend procedural-only retirement removed its consumers and static Next
handlers. Those model URLs now fall through to Nest. The backend still exposes
filesystem-backed metadata, file download and authenticated admin mutations.
Removing the unused upload surface is preferable to leaving dormant disk writes.

Repository inspection found no current consumer in `frontend/src/`. That supports
the requested retirement but does not prove that no external client exists.

## Planned changes

- Delete the service, two controllers, DTO and two obsolete model test files.
- Remove their imports, registrations and service export from `pet.module.ts`.
- Remove direct `multer` and `@types/multer` dependencies and update the lockfile.
  Keep `@nestjs/platform-express` and its legitimate transitive dependencies.
- Remove the model-directory block and obsolete frontend-login/admin-seed coupling
  comment from `backend/.env.example`; retain the real-values warning and unrelated
  seed settings.
- First add a normal-suite HTTP regression test proving route-level 404s, then
  remove implementation. Preserve pet behavior and its existing tests.

Exact inventories and test design: [design.md](design.md).
Acceptance: [routing specs](specs/model-routing.md),
[source/dependency specs](specs/source-and-dependencies.md) and
[preservation specs](specs/configuration-and-preservation.md).
Sequence: [tasks.md](tasks.md).

## Findings that refine the prompt

| Finding | Consequence |
| --- | --- |
| Three URLs have five method/path combinations: GET, GET, POST, PUT, DELETE. | Test every supported method, not just three GETs. |
| Missing stored file already produces a domain-level 404. | Require `Cannot METHOD /path` and the routing error body; status alone is insufficient. |
| Upload limit is 12 × 1024 × 1024 bytes; both GLB and GLTF are accepted. | Retire the entire implementation, not only the GLB extension branch. |
| Nest's Express adapter depends on multer itself. | Remove direct declarations; do not demand that multer vanish from the lockfile. |
| Pet tests now use src/testing/postgres.ts. | Reuse its private migrated PostgreSQL clone for the HTTP spec. |

## Resolved implementation gates

G1: use createTestDb from src/testing/postgres.ts. Import actual AppModule;
override PG_POOL and DRIZZLE before compilation so no application-configured pool
is created. Keep the real auth/throttling guards; close app then fixture.

G2: human authorized the exact two obsolete login-coupling comments and final
model-directory block only. After initial policy denial, explicit permission was
given to read/edit only backend/.env.example via bash. Never read real .env files;
retain the seed settings, warning and all unrelated template bytes.

G3: Prompt 4 authorizes ODD → RED/GREEN → verification → applicable RDD, no commits.

## Non-goals

Do not change pet endpoints, pet rules, auth, guards, roles, other modules,
database schema or migrations. Do not remove the root `backend/uploads/` ignore
entry or delete stored files, uploads, directories or volumes. Production cleanup
belongs to a human, never the agent. Do not change the frontend or historical specs.

## Delivery

Implement only the inventoried retirement and normal-suite HTTP proof. Record
actual commands/results and S1–S10 coverage in review.md. Use pgtest-db anchors
with status-preserving cleanup, heavy and at most two workers on this VPS.
No stored file/directory/volume cleanup and no production operations.

No commits now. Any later authorized commits use Conventional Commits without
`Co-authored-by` or "Generated with…" trailers. No push or deployment is authorized.
