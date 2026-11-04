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

## Commits and PRs

Never add `Co-authored-by` for Claude or Cursor (including
`Co-authored-by: Cursor`), and never add "Generated with Claude Code", in
commits or pull requests. See `.cursor/rules/no-coauthored-by.mdc`. Use
Conventional Commits.
