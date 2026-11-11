# Dependency security updates

Branch `chore/deps-security-updates`, worktree `.worktrees/audit-deps`.
Source: `npm audit --omit=dev` on 2026-11-10 (Engram `petsapp/audit/checks-baseline`).

## Specs

- S1 Frontend: upgrade `next` 16.2.0 → 16.4.6 (critical advisory) and the matching
  `eslint-config-next`/`@next/*` if present; then `npm audit fix` (no `--force`).
- S2 Backend: `npm audit fix` (no `--force`) to clear `body-parser` and `multer`
  (via `@nestjs/platform-express`).
- S3 `zod`: currently `^3.24.0`; the advisory fix is `zod@4.6.7` (major). Upgrade
  only if every zod usage compiles and all tests pass with minimal mechanical
  changes; otherwise leave it and record why in the Log.
- S4 After each package: `npx tsc --noEmit`, the full Vitest suite, backend
  `npm run lint` and `npm run build`, frontend `npx next build` all pass, and
  `npm audit --omit=dev` reports 0 critical/high (or lists exactly what remains and why).
- S5 Only `package.json`/`package-lock.json` plus code changes strictly required by
  the upgrades. No unrelated upgrades.

## Tasks

| ID | Specs | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1, S4, S5 | worker | |
| T2 | S2, S4, S5 | worker | |
| T3 | S3 | worker | |

## Log

- L1 (user, verbatim): "Haceme una investigación exhaustiva de nuestro software, quiero que busques errores, problemas, vulnerabilidades, y mejores el diseño la UI/UX bsucanlas mejores prácticas en internet y hagamoslo que esté software sea el mejor posible"
- L2 (user, verbatim): "Todas haceme en worktrres paralelos las que puedas hacer"
- L3 (parent): test Postgres at `TEST_DATABASE_URL=postgres://petsapp_test:petsapp_test@127.0.0.1:55491/petsapp_test`.
- L4 (parent): next 16.4.6 + npm audit fix in both packages; zod ^4.6.7 is safe because nothing in frontend/src imports zod. Both packages: npm audit --omit=dev 0 vulnerabilities. Backend 501/501, lint, build OK. Frontend tsc + next build OK; full vitest 1389/1567 with 178 failures confined to 9 cat-pose-* files that also fail on clean origin/main copies (pre-existing).
