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

## Commits and PRs

Never add `Co-authored-by` for Claude or Cursor, and never add
"Generated with Claude Code", in commits or pull requests. Use Conventional
Commits.
