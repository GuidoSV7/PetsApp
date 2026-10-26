# Spec: optional pattern writes and HTTP compatibility

Status: implemented and tested through the real shared ValidationPipe; actual results are in ../review.md.

## S4 — POST /pet/coat validates before mutation

The existing three hex colors remain required with their current rules. pattern MUST use @IsOptional() and @IsIn(COAT_PATTERNS). Omission preserves the current stored pattern; a listed value replaces it. The service setCoat MUST independently reject any explicitly provided nonmember before requireRow/create/update, even when called without the pipe.

IsOptional skips null in the validator; the service MUST still treat explicitly supplied null as invalid, not as omission or solid. No new global pipe option or different decorator policy is needed.

| Request sequence with a valid guest key | Required result |
|---|---|
| GET /pet/state for a new guest | 200; coat.pattern is solid. |
| POST /pet/coat with valid colors and pattern calico | Existing success status201; returned state contains calico. |
| GET /pet/state again | 200; persisted calico and colors returned. |
| POST /pet/coat with different valid colors, pattern omitted | 201; colors update, calico remains. |
| GET /pet/state again | 200; calico still persisted. |
| POST /pet/coat with valid colors and pattern striped | 400 through the real shared pipe; complete state and counters unchanged. |
| Direct setCoat call with invalid provided pattern | BadRequest/400; no create/update or stored-state change. |

Assertions MUST cover response status and body, the framework validation error for striped, and public read-back after success/rejection. Use deterministic time where needed to avoid unrelated status/time differences. Preserve existing invalid-color rejection and color lowercasing assertions; no custom error-message redesign.

## S5 — One source of ValidationPipe configuration

A shared function MUST construct the ValidationPipe used by main.ts and the real HTTP specs. Its options MUST remain exactly whitelist:true, forbidNonWhitelisted:true and transform:true. Tests MUST NOT copy the options or bypass DTO validation by calling the controller directly.

Both the new coat-pattern HTTP test and existing model-retirement HTTP test MUST use the factory. Existing retirement/error/preservation assertions continue to run; update complete coat expectations only for the additive solid field.

## S6 — Preserve existing clients and endpoints

The current frontend and camera send only colors; their request shape MUST stay valid and MUST never erase a saved pattern. No frontend edit is part of this change.

GET state, care actions and rename MUST retain their existing guest-key, validation, status, color, coin, need, name and counter behavior, except for the additive coat.pattern output. Their shared repository updates MUST preserve the pattern. Endpoints with existing DTO validation MUST retain their whitelist behavior; endpoints that currently ignore a body MUST not acquire pattern semantics.

Acceptance: existing endpoint controls plus a baseline/candidate HTTP differential on isolated state. Permit only the requested additive output/new coat input; preserve other response fields/status/errors and stored counters. Do not change auth, guards, roles, controller routes, pricing or shop access.

Traceability: [domain S1–S3](coat-contract.md), [storage/rollout S7–S10](persistence-and-rollout.md), [tasks](../tasks.md).
