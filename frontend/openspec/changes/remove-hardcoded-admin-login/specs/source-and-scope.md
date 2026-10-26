# Spec: source retirement, bootstrap and delivery boundaries

## S7 — No old credential/token literal in source

Requirement: “ningún archivo de `src/` contiene el email, la contraseña ni el token viejos.”

A recursive test SHALL inspect every regular file under frontend/src, regardless of extension, and reject occurrences of any of the three full old literals. Their values SHALL live only in test fixtures, never a replacement production denylist.

The retired module SHALL be absent with no imports/re-exports in src. Tests that currently import it SHALL use a test-only fixture or retired-module absence assertion instead, preserving existing GLB/proxy regression coverage.

## S8 — Document real bootstrap, not a new seed

Requirement: “Documentar en el README cómo se crea el primer super_admin (`npm run seed:admin` del backend, con credenciales reales que no se commitean).”

frontend/README.md SHALL link the existing backend procedure, explain running npm run seed:admin from backend after its documented database/build/migration setup, and name ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_NAME as required real environment inputs. It SHALL NOT include concrete passwords or change the backend seed.

Document that an existing user is skipped: this command does not rotate a password. Backend implementation and documentation remain unchanged.

## S9 — Human-only production rotation

Requirement: “Producción: rotar la contraseña del super_admin, si se sembró con las credenciales viejas, lo hace una persona.”

No production reads, seed execution, credential changes, database cleanup or deployment operation SHALL be performed by this change. The README SHALL tell a human to review/rotate an affected production password separately, without treating code removal as rotation.

## S10 — Planning and later proof boundaries

Requirements: “No implementes todavía.” / “Seguimos ODD + TDD + RDD.” / “Sin commits.”

The Prompt1 planning step SHALL create only proposal.md, design.md, tasks.md and these three specs under this change directory, without runtime/test/README edits, functional checks, implementation evidence or commits. That checkpoint is historical.

Prompt2 now authorizes implementation and verification of T1–T7, superseding only the planning-only restriction. Prompt3 subsequently authorizes exactly one 26-file commit only after native RDD approval, with the requested Conventional Commit subject and 2–3 body lines; no push. Update the existing PR description only if still open; stop before commit if it has merged. Prompt2 explicitly accepts this candidate's independent-verifier omission because of its HOME-isolating profile; it remains UNEXECUTED / NOT APPROVED.

Future implementation SHALL observe meaningful assertion RED, focused GREEN, preservation controls, full suite/typecheck/build and applicable real-browser checks, with exact observed results in review.md. Missing-module failures SHALL not count as functional RED.

Independent verification and native RDD are separate. The existing HOME-isolating verifier is currently incompatible; no prior candidate's omission or native approval SHALL be inherited. Follow user-owned RDD consent and stop rules for this candidate.

The Prompt3 conditional commit SHALL use `fix(auth): remove hardcoded admin login and local super_admin fallback`, with 2–3 body lines explaining Nest-only login, old-session reader rejection and public credentials removed from src, without Co-authored-by or Generated with attribution. Prompt3 explicitly corrects the browser criterion: 0 page errors in all four cases; console contains only the expected rejected-login 401. This is human correction, not literal compliance with the earlier wording.
