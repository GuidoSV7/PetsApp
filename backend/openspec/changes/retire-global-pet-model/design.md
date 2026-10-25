# Design: remove backend model ownership, preserve the pet

## Review map

Read the routing contract first, then the deletion inventory, then the test plan.
All evidence below describes the pre-retirement backend at planning baseline
`d7a936dbe64aef8d4d032d5d1e355ee8d9c48c23`; it is not execution evidence.

## Current source evidence

| Location | Observation |
| --- | --- |
| `backend/src/pet/pet-model.controller.ts:5–22` | Public metadata GET and streamed file GET, including download/cache headers. |
| `backend/src/pet/admin-pet-model.controller.ts:30–64` | File interceptor, JWT/role guards, POST/PUT/DELETE; POST explicitly returns 200. |
| `backend/src/pet/global-pet-model.service.ts:17,40–41,69–96,189–197` | 12 MiB limit, filesystem `active.glb`/`meta.json`, directory creation/configuration, GLB/GLTF validation, domain-level missing-file 404. |
| `backend/src/pet/dto/upsert-global-pet-model.dto.ts:4–10` | Numeric scale conversion/range 0.2–2.5. |
| `backend/src/pet/pet.module.ts:2–17` | Registers both model controllers and service; exports model and pet services. |
| `backend/src/app.module.ts:14–30` | Actual PetModule plus global auth and throttling guards via APP_GUARD. |
| `backend/src/testing/postgres.ts` | Committed isolated PostgreSQL clone fixture; real migrated schema and explicit disposal. |
| `backend/src/pet/pet.controller.spec.ts:17–42` | Fixture lifecycle, DRIZZLE injection and real pet repository/service wiring. |
| `backend/vitest.config.ts`, `vitest.config.e2e.ts` | Normal discovery is `**/*.spec.ts`; separate E2E discovery is `**/*.e2e-spec.ts`. |

## Delete inventory

| File | Reason |
| --- | --- |
| `backend/src/pet/global-pet-model.service.ts` | Filesystem model metadata/assets and mutations. |
| `backend/src/pet/pet-model.controller.ts` | Public model metadata/file routes. |
| `backend/src/pet/admin-pet-model.controller.ts` | Admin upload, replace and delete routes. |
| `backend/src/pet/dto/upsert-global-pet-model.dto.ts` | Retired model scale DTO. |
| `backend/src/pet/global-pet-model.service.spec.ts` | Exclusively tests removed filesystem-model behavior. |
| `backend/src/pet/admin-pet-model.controller.spec.ts` | Exclusively tests removed controller metadata/delegation. |

No separate public model-controller spec was found. Delete whole obsolete test
files, not their assertions while leaving empty modules.

Retain unchanged:
- `backend/src/pet/pet.controller.spec.ts`
- `backend/src/pet/pet.service.spec.ts`
- `backend/src/pet/pet-rules.spec.ts`
- `backend/src/pet/infrastructure/drizzle-pet.repository.spec.ts`
- Existing auth/global-guard and other-module tests.

## Edit and add inventory

| Action | Path | Bounded change |
| --- | --- | --- |
| Edit | `backend/src/pet/pet.module.ts` | Remove three model imports, two model controller registrations, model provider and export. Keep only PetController in controllers; PetService and PET_REPOSITORY → DrizzlePetRepository in providers; PetService in exports. |
| Edit | `backend/package.json` | Remove direct `multer` and development `@types/multer`; retain Nest HTTP adapter and unrelated dependencies/scripts. |
| Edit | `backend/package-lock.json` | Regenerate consistently with direct-dependency removal, without unrelated upgrades. |
| Edit, after approved template inspection | `backend/.env.example` | Remove model-directory block and obsolete frontend-login coupling comment only; preserve seed settings, unrelated configuration and real-values warning. |
| Add | `backend/src/pet/model-retirement.http.spec.ts` | Normal-suite HTTP proof using real module registration, real guards and an approved isolated fixture. No deleted-symbol imports or structural-scanner literals. |

No active model documentation edit was indicated in `backend/README.md` or root
`DEPLOY.md`. Do not change them without new evidence. Historical OpenSpec records
retain old directory/route references intentionally.

## Direct versus transitive upload dependencies

Only the removed admin controller was found to import/use application-level multer
and its file-interceptor types. Remove the direct declarations and regenerate the
lockfile through npm after implementation is authorized.

The current lockfile records `@nestjs/platform-express@12.1.3` depending on
`multer@2.4.0` (`backend/package-lock.json:1781–1789`). Keep the adapter; a
transitive multer package is expected and does not violate retirement. The source
absence criterion applies to application `src/` and `test/`, not node_modules,
the lockfile or historical documents.

## Routing proof: five contracts, not three assertions

| Method | Path | Required final response message |
| --- | --- | --- |
| GET | `/pet/model` | `Cannot GET /pet/model` |
| GET | `/pet/model/file` | `Cannot GET /pet/model/file` |
| POST | `/admin/pet-model` | `Cannot POST /admin/pet-model` |
| PUT | `/admin/pet-model` | `Cannot PUT /admin/pet-model` |
| DELETE | `/admin/pet-model` | `Cannot DELETE /admin/pet-model` |

Assert HTTP 404 and exact standard JSON fields `statusCode: 404`,
`error: "Not Found"` and the corresponding message. Run without credentials.
Do not upload files merely to prove retirement.

The current file handler can return 404 with `No hay modelo 3D global`.
That response must fail the new route-deletion test. Before deletion, metadata
and unauthorized admin requests also expose the old handlers rather than the
required routing response. Observe actual RED; do not invent baseline outputs.

## Why global guards do not force 401 on absent routes

Official Nest docs describe global guards as applying to controllers and route
handlers, and distinguish middleware from guard execution:
- [Guards](https://docs.nestjs.com/guards)
- [Request lifecycle](https://docs.nestjs.com/faq/request-lifecycle)

Those general lifecycle descriptions alone are not proof of unmatched routing.
The installed implementation provides the decisive distinction:
`@nestjs/core/router/routes-resolver.js` registers a NotFoundException callback
through RouterProxy and exception filters, without RouterExecutionContext;
`router-execution-context.js:create()` builds/invokes guards for matched handlers.

The future HTTP test must confirm this with the real global auth/throttler setup:
an unrelated unknown URL returns a routing 404 while an existing protected route
returns 401 without credentials. Do not change guards, add Public metadata to an
absent route, or install a synthetic catch-all returning 404.

## Resolved test application and fixture

Use actual AppModule and createTestDb from src/testing/postgres.ts. Before
compiling, override both PG_POOL and DRIZZLE: the fixture owns the real pool;
the application receives a shutdown-only no-op pool facade and real fixture.db.
This prevents the app pool factory and duplicate end() calls. Close app then fixture.

Before dynamically importing AppModule, intercept ConfigModule.forRoot only to
force ignoreEnvFile:true, so no real .env is read. Supply explicit test ConfigService
values; any legacy directory setting resolves to an owned mkdtemp directory.
This lets RED initialize legacy handlers without touching existing uploads.
Restore test config mocks and dispose only newly created scratch resources.

Apply configureHttpApp/ValidationPipe as in bootstrap; do not override real guards.
Use unknown-route404 and /users/me401 controls plus real pet-state/action/coat/name
checks. Optional test-only RETIREMENT_HTTP_TRACE writes synthetic public-response
JSON to an explicitly supplied evidence path. Record baseline/candidate HTTP
responses and compare unchanged pet behavior; tests never read Git history.
No migration, helper, production config or separate E2E rewrite is needed.

## Preservation and verification

Keep pet controller/service/rules/repository, schema `petStates`/`pet_states`,
existing pet tests, auth/guards/roles, main/bootstrap and other modules unchanged.
Retain the root `backend/uploads/` ignore entry and all existing filesystem data.

Retain current pet assertions for state/actions/coat/name, invalid guest input,
coins/needs, persistence and rename counters. Compare baseline and candidate
observable results, allowing only existing time-dependent fields to be controlled
by the same deterministic fixture. Where meaningful, check rejected requests
leave state/counters unchanged through public pet interfaces.

Authorized sequence:
1. Add normal-suite HTTP tests; observe RED before deleting production code.
2. Delete/edit only inventory paths, then observe GREEN and retained regressions.
3. Verify source/test absence outside those trees, so the verifier does not add
   forbidden identifiers back into committed test files.
4. Verify normal discovery, direct dependency graph, lint/build and full suite on
   isolated PostgreSQL. Cap workers at two; wrap full suites in heavy on
   this VPS.
5. Run applicable independent security/dependency verification and native RDD;
   neither replaces functional tests. Record actual commands/results later.

## Risks and boundaries

- Item 2: authenticated upload-surface removal; prove real routing rather than
  weakening guards or accidentally exposing another path.
- Item 5: direct-dependency/lock changes; preserve the adapter and its transitive
  requirements and avoid unrelated version churn.
- Shared pet registration: protect unrelated behavior with unchanged implementation
  plus retained and HTTP regression tests; no contract change beyond requested routes.
- G1–G3 are resolved by the new helper, explicit target-only template authorization
  and Prompt 4. Configuration comments are passive, not runtime RED evidence.
- Never clean model files or volumes. No schema change is required: model storage
  is on disk, not a model database table.
