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

## Agent VPS environment (Paseo agents)

When running on the agent VPS (`srv1976750`, full access with Docker), these tools exist. Full rules are in the agent's global instructions.
- **Test Postgres** (`127.0.0.1:55432`, full write, throwaway): one DB per run.
  - Migrated clone: `URL=$(pgtest-db clone <project> <schema-source> -- <migrate cmd>)`.
  - Empty DB: `pgtest-db create <prefix>`.
  - Always `pgtest-db drop "$URL"` when done.
- **Test Redis**: `REDIS_URL=$(redistest start <project>)`, a private instance per run; then `redistest stop "$REDIS_URL"`.
- **Production: `SELECT` and `INSERT` only, never delete or modify** (`DELETE`/`UPDATE`/`TRUNCATE`/DDL), not even through Docker or admin credentials. Never migrate or run tests against prod.
  - Postgres: `grep '^\[' ~/.pg_service.conf`, then `psql "service=<name>"`.
  - Redis: `~/.redis_services`, then `redis-cli -u …` (`SCAN`, never `KEYS *`).
  - On an auth error, run `agent-ro-refresh` once and retry.
- **Docker:** only for your own builds and test containers. Never touch Dokploy/production containers, volumes or services, and never `prune`.
- **Ports.** 3000/3001 are host services (Dokploy); use any other free port, e.g. 3002-3112. Run fixed-port E2E under `exclusive e2e-<project> -- …`, and full suites under `heavy -- …`.
