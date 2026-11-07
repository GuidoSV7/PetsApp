# AGENTS.md — PetsApp

Entry point for coding agents in this monorepo.

## Layout

| Path | Stack |
| --- | --- |
| `backend/` | NestJS 12 (ESM), Drizzle ORM, PostgreSQL, Vitest, oxlint — ports and adapters |
| `frontend/` | Next.js 16, Vitest — same-origin `/petsapp-api` proxy to the API |
| `contract/` | Reserved Soroban contract workspace |

Operational skills live under `.cursor/skills/`. The agent does not use `.claude/` as the skill root (it may exist for other tools).

## Routing

- Backend work: read `.cursor/rules/backend-agent.mdc` first.
- Frontend work: read `.cursor/rules/frontend-agent.mdc` first.
- Deploy / Dokploy: [DEPLOY.md](./DEPLOY.md).
- Tests: while iterating, run only the affected specs by path; run full suites only before commit or push. When a suite is slow, or to speed up tests (isolation/pools, PGlite snapshots, Postgres templates, Playwright reuse), read `.claude/skills/test-speed/SKILL.md` first. This skill is versioned under `.claude/`; a local copy may also exist under `.cursor/skills/`.

## Independent verification (permanent owner authorization)

Independent verifiers run offline against their own source and dependency copies,
never against production or shared application databases. Preserve dependency
symlinks; do not install packages or browsers. Expose installed Node/npm through
`PATH` and existing Playwright browsers through `PLAYWRIGHT_BROWSERS_PATH`,
read-only. Record commands, source identities, results and verified cleanup.

- Preferred isolation: private scratch, `HOME`, `TMPDIR` and caches, when host
  policy permits it.
- Authorized plan B: when a host rule conflicts, keep the normal `HOME` and use
  private scratch and caches. Do not write to source repositories, worktrees or
  shared databases. Record the conflicting rule; no new permission is required
  for this fallback. On this VPS, the rule **never isolate HOME** selects plan B.
- Independence requires a separate agent deriving its own probes, not a different
  `HOME`. Archive evidence before removing owned scratch, then prove its absence.

## Commits and PRs

Never add `Co-authored-by` for Claude or Cursor (including
`Co-authored-by: Cursor`), and never add "Generated with Claude Code", in
commits or pull requests. See `.cursor/rules/no-coauthored-by.mdc`. Use
Conventional Commits.
