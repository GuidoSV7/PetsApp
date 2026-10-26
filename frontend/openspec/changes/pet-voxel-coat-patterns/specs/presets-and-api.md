# Spec: presets, state and omission-safe writes

Status: implemented; final visuals approved by Prompt5. Color semantics: [S6](rendering-inheritance.md).

## S9 — Presets preserve colors and gain pattern

CoatPreset MUST gain top-level pattern. Existing IDs/labels/colors remain unchanged; add only the two requested presets.

| ID / label | Primary | Secondary | Accent | Pattern |
|---|---|---|---|---|
| grey / Gris | existing DEFAULT_GREY_COAT.primary | existing DEFAULT_GREY_COAT.secondary | existing DEFAULT_GREY_COAT.accent | solid |
| white / Blanco | #e8e6e1 | #f5f3ef | #c9a0a8 | solid |
| orange / Naranja | #e8a05a | #f0c48a | #c97b6a | solid |
| calico / Calicó | #c4a574 | #f0ebe3 | #8b5a2b | calico |
| tabby / Atigrado | #6b7280 | #9ca3af | #c9a0a8 | tabby |
| tuxedo / Esmoquin | #1f1f22 | #f2f0ec | #c9a0a8 | tuxedo |
| pointed / Siamés | #efe3cf | #f7efe2 | #5a4032 | pointed |

Acceptance: assert all seven entries, unchanged five existing color triples/IDs/labels and the two exact new triples/patterns. No price, shop or other preset behavior is introduced.

## S10 — Selection uses primary AND pattern

Personalizar MUST select a preset only when primary matches case-insensitively as today AND normalized current pattern equals preset.pattern. Secondary/accent differences alone MUST NOT change this rule.

Acceptance: same primary with a different pattern is not selected; same primary/pattern with different secondary/accent is selected; preserve existing case-insensitive primary matching. Clicking a preset submits its three colors and its own pattern.

## S11 — Complete normalized read state, optional write input

PetStateResponse.coat MUST contain required normalized pattern. Every API operation returning pet state MUST normalize known/missing/unknown pattern while preserving the other response fields. Keep colors-only camera data separate from complete state and optional-pattern write input. Existing colors-only model/viewer/admin callers remain compatible, falling back to solid.

Acceptance: GET, preset-save, colors-only save, care and rename responses retain known patterns; missing/null/unknown normalize to solid. Public request interception verifies endpoint, guest header and unchanged payload fields. Never add a browser runtime import of backend code.

## S12 — Camera omission preserves saved pattern

The camera MUST still emit and send exactly primary/secondary/accent, with no pattern key. The shared write serializer MUST include pattern only when explicitly supplied; it MUST NOT spread the current complete coat or insert a default solid. Presets send all four fields. A saved backend pattern MUST remain after a camera colors-only save and later reload.

Acceptance: begin with calico, intercept camera output and POST body and assert absence of the key, then assert returned state, rendered patches and subsequent GET keep calico with new colors. Recalculate selection from the new primary AND preserved pattern; a new primary may match no preset. Fix the shared stub to merge omitted pattern rather than replace the whole coat. Camera omission already works today: label its initial passing test as preservation, not a new RED. Photo-based pattern inference remains out of scope.

## S13 — Backend-first merge and delivery

This frontend MUST NOT merge until the backend with optional pattern writes and required pattern responses is live in production. A main commit or a frontend-normalized solid response is not sufficient evidence.

Acceptance: record operator-confirmed deployed backend/DTO support and a raw production GET containing a known coat.pattern before merging this frontend. Do not access production during this closure. An old backend's 400 rejection is a rollout risk, not a reason to alter backend validation. Prompt5 authorizes one local Conventional Commit and native review after the completed assertion RED/GREEN work. No push, merge or production operations. Independent verifier remains NOT EXECUTED (HOME exception); do not present native review as that proof. Commit messages must have no prohibited attribution.
