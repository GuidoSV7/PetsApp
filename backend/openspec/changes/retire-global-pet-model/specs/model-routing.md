# Spec: absent model routes, preserved guards and pet behavior

## S1 — All former model handlers are absent

After retirement, each request below SHALL return HTTP 404 with the standard
routing body, without credentials:

| Method | Path | JSON message |
| --- | --- | --- |
| GET | /pet/model | Cannot GET /pet/model |
| GET | /pet/model/file | Cannot GET /pet/model/file |
| POST | /admin/pet-model | Cannot POST /admin/pet-model |
| PUT | /admin/pet-model | Cannot PUT /admin/pet-model |
| DELETE | /admin/pet-model | Cannot DELETE /admin/pet-model |

For each response, `statusCode` SHALL equal 404 and `error` SHALL equal
`Not Found`. The exact message SHALL match the table. A missing-file domain
error, authorization rejection, upload validation error or synthetic 404 handler
does not satisfy this rule.

### Scenario: normal-suite deletion proof

Given the real application module registration and an approved isolated fixture,
when the five requests run through HTTP in `model-retirement.http.spec.ts`,
then every routing contract above is asserted. Before implementation removal,
this test SHALL demonstrably fail against the existing handlers.

### Scenario: no model upload prerequisite

Given no test asset is uploaded and no production model directory is used,
when the file URL is checked,
then the assertion distinguishes route absence from a missing stored model.
No test may accept an arbitrary 404 as retirement proof.

## S2 — Unmatched routes remain 404 with global guards enabled

The test SHALL retain the actual global auth and throttler guards.

### Scenario: prove guards are present without intercepting absent routes

Given the same application instance,
when an unrelated nonexistent URL is requested without credentials,
then it returns the standard routing 404.
When an existing protected route is requested without credentials,
then it returns its existing 401 response.
No guard, role, auth implementation or route metadata is changed to obtain these results.

## S3 — Existing pet endpoints remain behaviorally unchanged

The state, actions, coat and name endpoints and their registration SHALL remain
unchanged. Existing pet controller, service, rules and repository tests SHALL remain.

### Scenario: retained pet regression coverage

Given the same isolated migrations, real repository/service and controlled input,
when baseline and candidate state/action/coat/name tests run,
then existing response/state effects remain equal, including coins, needs,
persisted coat, rename count and rejection behavior.
Rejected inputs SHALL not acquire new effects on stored state or counters.

The new application wiring SHALL also retain a working pet-state HTTP request,
using the existing guest-header contract, rather than satisfying S1 by omitting
the entire pet module.
