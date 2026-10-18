# Review: seed-super-admin

## Verdict

**Allow**

## Checklist

| Item | Status |
|------|--------|
| Pure logic + in-memory Vitest (4 tests) | OK |
| CLI uses DrizzleUserRepository + bcrypt 10 | OK |
| Idempotent on existing email | OK |
| `npm run seed:admin` → `node dist/db/seed-admin.js` | OK |
| README + `.env.example` | OK |
| `npm run build` / `npm run lint` | OK |
| Full `npx vitest run` on this agent host | Blocked: `listen EACCES` for any bind (pre-existing env); seed + non-HTTP suites green (84+) |

## Notes

- Existing email is never upgraded to `super_admin` (create-only idempotency).
- Dokploy one-shot run is operational follow-up after deploy of this commit.
