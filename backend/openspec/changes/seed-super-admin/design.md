# Design: seed super_admin

## Pure logic (`seedSuperAdmin`)

Inputs: `{ email, password, name }` + `UserRepository` + `hashPassword(plain)`.

1. Trim/validate: email non-empty after `normalizeEmail`, name 1–120 chars,
   password ≥ `MIN_PASSWORD_LENGTH` (8).
2. `findByEmail(normalized)` → if row exists, return `{ status: 'already_exists', ... }`
   (no password or role mutation).
3. Else `create({ email, password: await hashPassword(password), name, role: super_admin })`
   → `{ status: 'created', ... }`.

## CLI (`seed-admin.ts`)

- Fail fast if any of `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` is missing.
- Open `pg.Pool` via `resolveDrizzleCredentials(process.env)`, wrap with
  `drizzle(pool, { schema })`, `new DrizzleUserRepository(db)`.
- `hashPassword` = `bcrypt.hash(plain, 10)` (same rounds as `AuthService`).
- Log created vs already_exists; exit `0` on success, `1` on validation/DB errors.
- Close the pool in `finally`.

## npm

`"seed:admin": "node dist/db/seed-admin.js"` (requires prior `npm run build`).
