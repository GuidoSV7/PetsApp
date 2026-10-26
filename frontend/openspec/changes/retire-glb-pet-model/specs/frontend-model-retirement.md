# Spec: remove the frontend-owned global model path

## S1 — No frontend GLB server/storage/client implementation

The eight source files listed for deletion in [design.md](../design.md) SHALL
be absent. No file under `frontend/src/` SHALL import or re-export their modules.
No `isHardcodedAdminBearer` definition, call, or import SHALL remain in `src/`.

### Scenario: verify the production source graph

Given the implementation is complete,
when deleted paths, source imports and TypeScript resolution are checked,
then none of the removed modules exists or is referenced and the frontend
typecheck/build succeeds. The hardcoded login matcher, token used by its local
session, and session builder remain available. Prompt 4 explicitly accepts the
four pre-existing standalone TypeScript diagnostics in the untouched robots/share
metadata tests as a separate change; they are reported, not counted as a new
regression. The production build succeeds.

## S2 — Preserve backend and catch-all boundaries

The backend and `frontend/src/app/petsapp-api/[...path]/route.ts` SHALL remain
unchanged by this implementation.

### Scenario: legacy caller requests a model URL

Given the static Next model handlers have been removed,
when a legacy request matches the unchanged catch-all,
then the existing proxy behavior applies to Nest; this change SHALL NOT assert
a 404, a disabled backend API, or removal of backend storage.

### Scenario: no data cleanup

Given old frontend assets or browser data exist,
when this source change is applied,
then it performs no disk, volume, localStorage or IndexedDB cleanup operation.

## S3 — Deployment documentation matches frontend ownership

The frontend environment table in `DEPLOY.md` SHALL NOT contain `PET_MODEL_DIR`.
Other deployment rows and backend configuration SHALL be unchanged.

## S4 — Retained login behavior

Removing the bearer helper SHALL NOT change accepted login credentials,
the local admin session, or the existing login fallback behavior.

### Scenario: retained login/session tests

Given the existing auth fixtures,
when the retained `test/features/auth/hardcoded-admin.test.ts` and login-page
tests run, then their existing login/session expectations still pass.
The bearer-only `test/lib/hardcoded-admin.test.ts` is deleted instead.
