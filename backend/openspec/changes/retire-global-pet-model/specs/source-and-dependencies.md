# Spec: remove model implementation and direct upload dependencies

## S4 — Removed model code and obsolete tests have no active references

The six delete paths in [design.md](../design.md) SHALL be absent.
No file under `backend/src/` or `backend/test/` SHALL reference:
- the global model service or its module path;
- either model controller or its module path;
- the model upsert DTO or its module path;
- `PET_MODEL_DIR`;
- `multer` or the removed upload-specific Multer types.

### Scenario: inspect the active source and test graph

Given implementation is complete,
when a case-aware identifier/module-path scan is run outside `src/` and `test/`,
then it finds no retired imports, definitions or references in those trees.
The HTTP test may contain former route URL strings, not retired implementation imports.

Historical OpenSpec documents and transitive dependency metadata are explicitly
outside this scan. Do not commit a source-scanner test containing the forbidden
identifiers inside the very trees that must be free of them.

### Scenario: obsolete test removal

Given the two model-only spec files cover exclusively deleted implementation,
when the test inventory is updated,
then those files are deleted whole, with no empty replacement file.
Do not disable no-test discovery failures.

## S5 — PetModule contains only pet functionality

PetModule SHALL retain PetController, PetService and the existing
PET_REPOSITORY → DrizzlePetRepository binding. It SHALL export PetService as before.
Model controller/service imports, registrations and model service export SHALL
be removed. Other modules SHALL remain unchanged.

### Scenario: compile and exercise the real module

Given the actual module is imported by the HTTP test,
when the app compiles and existing pet state is requested,
then dependency resolution succeeds and pet functionality remains available,
while S1's former model requests return routing 404s.

## S6 — Direct upload dependencies are removed, HTTP adapter retained

Application package declarations SHALL no longer directly depend on `multer`
or `@types/multer`. Package-lock root declarations SHALL agree with package.json.
`@nestjs/platform-express` SHALL remain, without unrelated dependency upgrades.

### Scenario: validate the dependency graph and build

Given direct upload usage was exclusive to the removed controller,
when the lockfile is regenerated and dependency graph/build are checked,
then no direct upload dependency remains and the Nest HTTP adapter still works.
A multer entry retained transitively by the adapter SHALL NOT be removed manually
or treated as a failed retirement.
