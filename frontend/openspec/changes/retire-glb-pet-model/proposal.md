# Proposal: retire the frontend GLB pet-model path

Status: implementation, review and Chromium validated; Prompt 4 authorizes coverage completion and one commit, without push.
Scope: frontend runtime retirement plus the frontend environment row in `DEPLOY.md`.

## Outcome

The home always renders the current procedural cat with an explicit default design.
Admin **Diseño 3D** remains a browser-local procedural preview with its existing
sliders and reset. It cannot upload, publish, fetch, or delete a global model.

This removes the frontend disk-backed model handlers and their hardcoded-bearer
authorization bypass. It does **not** fix the separate hardcoded admin login or
retire the backend model API.

## Why

- The admin model route accepts a fixed login token without an environment gate.
  A client-imported module contains that token; it is not a secret.
- The GLB renderer receives URL, scale, and click interaction, but not the
  procedural coat, need cues, or purr bounce.
- Static Next model routes shadow the catch-all proxy and store assets in the
  frontend container, independently of Nest.

## Planned changes

| Area | Plan |
| --- | --- |
| Next handlers, store, guard | Delete all three model handlers, disk store, and route-only admin guard. |
| Client model path | Delete global-model service, model-file/event/IndexedDB helper, and GLB renderer. |
| Viewer and home | Remove model URL support and global metadata/event flow; pass explicit `defaultCatDesign()` to the home cat. |
| Scale | Remove global metadata as an input. Retain browser-local admin scale tuning; use the canonical cat scale for defaults. |
| Diseño 3D | Explicit decision: persist each slider in this browser as it moves, replacing confirmation-time persistence; keep local reset and remove upload, global confirmation, and model API calls. |
| Login helper | Remove only `isHardcodedAdminBearer` and its obsolete comment; keep the token/session/login behavior. |
| Tests and deploy docs | Delete obsolete-only tests, adapt admin/home tests, add viewer coverage, remove frontend `PET_MODEL_DIR` row. |

See [design.md](design.md) for the exact file inventory and risks,
[specs/](specs/) for acceptance criteria, and [tasks.md](tasks.md) for sequencing.

## Preconditions and boundaries

Human production evidence is optional and does not block implementation:
`kind = ____`, `modelScale = ____`, date `____` (not supplied).
Only valid procedural evidence with a different scale changes the constant.
Otherwise keep `CAT_MODEL_SCALE` unchanged and record missing evidence in review.
Never adopt a GLB scale. No production request has been made by the agent.

Deleting static routes leaves the preserved catch-all forwarding those URLs to
Nest. Do not promise 404s or total endpoint shutdown. The follow-up
`retire-global-pet-model` owns backend retirement.

## Non-goals

Do not change backend files/endpoints, the hardcoded admin login credentials or
local session, the catch-all proxy, cat anatomy, need cues, coat, camera, pet
actions, or the browser storage location for design settings. Do not delete
existing container files, volumes, localStorage, or IndexedDB data. Do not remove
shared Three/Fiber/Drei dependencies used by the procedural renderer.

## Delivery

Prompt 2 authorizes plan amendments followed by implementation: RED → GREEN →
test review → applicable independent verification and RDD. Human scale evidence
is not a blocker. Prompt 4 accepts the four pre-existing standalone TypeScript
errors for a separate change and authorizes one commit with the exact message
`fix(pet-model): retire frontend GLB path and hardcoded bearer bypass`.
No push, publishing or deployment is authorized. No coauthor/generated trailers.
