# Proposal: Idempotent super_admin seed script

## Intent

Bootstrap the first `super_admin` without UI: an npm script that reads
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` from the environment, creates
the user when missing, and no-ops when the email already exists.

## Scope

### In scope

- Pure seed logic over `UserRepository` (unit-tested with the in-memory adapter).
- CLI `src/db/seed-admin.ts` → `node dist/db/seed-admin.js` / `npm run seed:admin`.
- Reuse Drizzle user repository + bcrypt rounds used by auth.
- Document in `backend/README.md` and list env vars in `.env.example`.

### Out of scope

- Promoting an existing member to super_admin.
- UI, HTTP endpoint, or Dokploy panel automation beyond a one-shot container run.

## Success

`npm run build`, `npm run lint`, `npx vitest run` green; script is idempotent;
running it once in the Dokploy backend container allows login into `/admin/users`.
