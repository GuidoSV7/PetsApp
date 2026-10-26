# Design: additive coat-pattern persistence

Status: implemented; functional evidence is in review.md. This baseline-design map and the complete26-path declaration were written before source changes. Pre-native-RDD checkpoint; no commits.

## 1. Baseline behavior and evidence

| Location | Observed behavior / consequence |
|---|---|
| `backend/src/pet/pet-rules.ts:20–37,95–103,186–195` | Three-color PetCoat/default; initialSnapshot copies the default; applyCoat replaces coat and sets statusKey to coated. |
| `backend/src/pet/pet.service.ts:62–81,98–118` | Public setCoat validates hex before requireRow, lowercases colors; get/create uses initialSnapshot. Preserve that ordering and behavior. |
| `backend/src/pet/pet.controller.ts:9–40` | Public guest-key routes: GET state, POST actions/:action, POST coat, POST name. No controller or guard edit needed. |
| `backend/src/pet/ports/pet-repository.port.ts:5–30` | Row/write shapes use PetCoat; the new field propagates without changing repository-port signatures. |
| `backend/src/pet/infrastructure/drizzle-pet.repository.ts:14–94` | toRow maps colors; create and update enumerate fields. All updates, including actions/name, must carry pattern. |
| `backend/src/db/schema.ts:87–116` | pet_states has three color columns but no pattern column. |
| `backend/src/main.ts:35–41` | Global pipe options are exactly whitelist:true, forbidNonWhitelisted:true, transform:true. |
| `backend/src/pet/model-retirement.http.spec.ts:44–88` | Existing real HTTP app copies those pipe options; controller.spec calls methods directly and is not HTTP validation proof. |
| `backend/src/testing/postgres.ts:1–13` | createTestDb() takes no options and clones an already-migrated per-run template. |
| `backend/src/testing/postgres-lifecycle.ts:144–233` | startTestRun accepts a migration folder; allocateFixture clones its template; existing lifecycle cleanup owns run/fixture disposal. |
| `backend/drizzle/meta/_journal.json:1–34` | Entries0000–0003; last when1792291000000. Only0000_snapshot.json exists, without pet_states. |
| Installed `drizzle-orm/migrator.js:10–23`, `pg-core/dialect.js:55–69` | when becomes folderMillis; migration runs only when latest created_at is strictly less. Equal or older timestamps are skipped. |

No pet in-memory repository fake was found: existing service/controller database specs use PostgreSQL. The routed `.cursor/skills/` directory is absent; the plan follows existing backend ports/adapters, DTO and Vitest conventions instead.

## 2. Domain and write boundary

- In pet-rules.ts, export the readonly ordered COAT_PATTERNS tuple, its derived CoatPattern union, a membership guard and a read normalizer accepting unknown values.
- PetCoat gains required pattern; DEFAULT_COAT uses solid. The normalizer retains recognized values and maps unknown stored values to solid without writing repairs.
- Use a separate write-input shape: the same three required color fields plus optional pattern. Do not make the stored/output field optional, and do not force old colors-only callers to supply it.
- applyCoat merges the previous pattern only when input.pattern is undefined; otherwise uses the already-validated supplied pattern. Preserve colors and existing coated status behavior.
- setCoat checks provided pattern membership before requireRow/save, alongside existing hex validation. Do not use the read normalizer here. Preserve color lowercasing and all guest-key/business rules.
- IsOptional/IsIn validate the DTO as requested. IsOptional allows null through the pipe, but null is not a member or an omitted field: the service still rejects it400, including direct calls.

## 3. Shared HTTP validation

Add `backend/src/config/validation-pipe.ts` exporting `createValidationPipe()`. It constructs a new ValidationPipe with only the existing three options, unchanged: whitelist:true, forbidNonWhitelisted:true, transform:true.

Use the factory in main.ts, the new coat-pattern.http.spec.ts and the existing model-retirement.http.spec.ts. Remove the copied options from that existing test. Keep configureHttpApp, auth, guards, module wiring and all other bootstrap behavior unchanged. Use ESM `.js` import specifiers.

The new HTTP spec uses the existing real-AppModule/config/PG override pattern, configureHttpApp and this shared factory. A direct controller call is supplementary coverage, never proof of the global pipe. Use the regular Vitest config (`*.spec.ts`, PostgreSQL globalSetup), not the separate e2e config.

## 4. Schema and handwritten migration

New file `backend/drizzle/0004_coat_pattern.sql`, written manually:

```sql
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "pet_states" ADD COLUMN "coat_pattern" varchar(16) NOT NULL DEFAULT 'solid';
```

Append exactly one journal entry; keep existing entries unchanged:

```json
{
  "idx": 4,
  "version": "7",
  "when": 1792291000001,
  "tag": "0004_coat_pattern",
  "breakpoints": true
}
```

The journal retains version7/dialect postgresql. At implementation time, confirm0003 is still the last entry; if the baseline has changed, reconcile before choosing the next index/timestamp. No drizzle-kit generate, old-SQL edits, snapshot regeneration, CHECK, UPDATE backfill or DROP/down migration.

Mirror the column in schema.ts as varchar length16, not-null, default solid. In the repository, normalize row.coatPattern when assembling PetCoat; write coat.pattern in both create and update. Database varchar deliberately admits future/unknown values; API writes remain strict.

PostgreSQL11+ supplies a constant ADD COLUMN default for existing rows without rewriting the table. This is not lock-free: ALTER TABLE defaults to ACCESS EXCLUSIVE. The backend container performs migration then API startup in one deployment, not a separate operator step. `backend/Dockerfile:39` runs `node dist/db/migrate.js && exec node dist/main.js`; migrate.ts exits1 on failure. Installed Drizzle `pg-core/dialect.js:55–69` executes statements inside session.transaction; `node-postgres/session.js:180–194` issues BEGIN/COMMIT/ROLLBACK on the same client. Therefore SET LOCAL applies to ADD COLUMN and limits lock acquisition to5s. Test the SQL prefix/breakpoint structurally; do not invent an executed contention benchmark.

During rollout, old backend inserts omit the new column and receive its solid default; old updates do not erase it. Deploy the pattern-sending frontend only after this backend is in production. No production deployment/migration is authorized in this development session; rollback must not drop pattern data.

## 5. Prospective implementation edit surfaces

Implementation edit surfaces (Prompt2-authorized):

| Path under backend/ | Planned edit |
|---|---|
| `src/pet/pet-rules.ts`, `src/pet/pet-rules.spec.ts` | Ordered tuple/types/read normalization/default; omission-aware applyCoat and rule assertions. |
| `src/pet/pet.service.ts`, `src/pet/pet.service.spec.ts` | Strict pre-write validation, optional input, persistence/nonmutation tests. |
| `src/pet/dto/set-coat.dto.ts` | Optional pattern with IsOptional and IsIn(COAT_PATTERNS). |
| `src/db/schema.ts` | coatPattern column mapping. |
| `src/pet/infrastructure/drizzle-pet.repository.ts`, `src/pet/infrastructure/drizzle-pet.repository.spec.ts` | Read normalization, create/update mapping, raw zebra and preservation tests. |
| `src/config/validation-pipe.ts` (new), `src/main.ts` | Shared factory and bootstrap call, unchanged options. |
| `src/pet/model-retirement.http.spec.ts` | Use factory; include solid in exact coat expectations; retain rejection/preservation assertions. |
| `src/pet/pet.controller.spec.ts` | Adapt required coat expectations/fixtures if necessary; preserve existing direct-call coverage. |
| `src/pet/coat-pattern.http.spec.ts` (new) | Real pipe, POST/GET/calico/colors-only/striped nonmutation. |
| `src/db/coat-pattern-migration.spec.ts` (new) | Real0000–0003→0004 upgrade using existing lifecycle. |
| `drizzle/0004_coat_pattern.sql` (new), `drizzle/meta/_journal.json` | One additive SQL migration and one appended entry. |
| `README.md` | API field/default/omission/errors, manual migration restriction and backend-before-frontend rollout. |

Controller implementation, repository port, HTTP setup, lifecycle/helper/configs, auth/guards/roles, other modules, frontend, package/lock files, old SQL and snapshots stay untouched. Test expectation updates are not permission to change other endpoint behavior.

## 6. Verification design

- Follow [specs](specs/coat-contract.md) and [tasks](tasks.md): assertion RED before each requested behavior, then focused GREEN; missing new imports are not RED.
- Preserve existing colors-only/lowercasing behavior and actions/name/state contracts. Rejected writes leave the complete observable state and counters unchanged; direct service rejection must happen before any create/update.
- For upgrade proof, create an owned temporary folder containing unchanged0000–0003 SQL and only their journal entries. startTestRun with that folder, allocateFixture, insert a legacy row using SQL that does not reference the absent new column, then run the real migrator against the full folder.
- Compare existing row fields/counters before/after, assert solid, schema metadata and the applied0004 journal timestamp. Always close the fixture, dispose the owned run and remove the temporary folder in finally. A normal createTestDb() fixture alone is not upgrade evidence.
- Use TEST_DATABASE_URL on the disposable local PostgreSQL cluster only. No DATABASE_URL fallback, production connection or helper redesign.
- Compare baseline/candidate public HTTP behavior with isolated databases for GET state, POST coat, POST actions/:action and POST name: permit only requested coat.pattern output/additional coat input deltas; preserve status codes, errors, other fields and persisted counters.
- Record actual assertion RED/GREEN, migration upgrade, database checks, lint/build and HTTP differential before native review. For THIS candidate the human explicitly leaves the independent verifier UNEXECUTED / NOT APPROVED because its profile isolates HOME. Native RDD remains separate, needs fresh candidate consent and must stop/report on a block. No commits.


## Complete candidate declared before source writes

Exactly26 paths, including all new files and future evidence:

- `backend/README.md`
- `backend/drizzle/0004_coat_pattern.sql`
- `backend/drizzle/meta/_journal.json`
- `backend/src/db/schema.ts`
- `backend/src/pet/pet-rules.ts`
- `backend/src/pet/pet-rules.spec.ts`
- `backend/src/pet/pet.service.ts`
- `backend/src/pet/pet.service.spec.ts`
- `backend/src/pet/infrastructure/drizzle-pet.repository.ts`
- `backend/src/pet/infrastructure/drizzle-pet.repository.spec.ts`
- `backend/src/pet/dto/set-coat.dto.ts`
- `backend/src/main.ts`
- `backend/src/config/validation-pipe.ts`
- `backend/src/pet/model-retirement.http.spec.ts`
- `backend/src/pet/pet.controller.spec.ts`
- `backend/src/pet/coat-pattern.http.spec.ts`
- `backend/src/db/coat-pattern-migration.spec.ts`
- `backend/openspec/changes/pet-coat-pattern/proposal.md`
- `backend/openspec/changes/pet-coat-pattern/design.md`
- `backend/openspec/changes/pet-coat-pattern/tasks.md`
- `backend/openspec/changes/pet-coat-pattern/specs/coat-contract.md`
- `backend/openspec/changes/pet-coat-pattern/specs/http-compatibility.md`
- `backend/openspec/changes/pet-coat-pattern/specs/persistence-and-rollout.md`
- `backend/openspec/changes/pet-coat-pattern/review.md`
- `backend/openspec/changes/pet-coat-pattern/evidence/tdd-results.json`
- `backend/openspec/changes/pet-coat-pattern/evidence/http-differential.json`

Excluded: odd/tasks/pet-coat-pattern.md, odd/evidence runners/scratch copies and .git/agent-evidence raw streams. No dependency, frontend, old SQL/snapshot, Dockerfile/startup or test-helper changes. All26 paths must be selected for native RDD, including untracked files, before START.

## References

- [NestJS validation](https://docs.nestjs.com/techniques/validation): whitelist, forbidNonWhitelisted, transform.
- [Drizzle migration reader](https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/migrator.ts): journal when→folderMillis; installed dialect is authoritative for this checkout.
- [PostgreSQL16 ALTER TABLE](https://www.postgresql.org/docs/16/sql-altertable.html): constant-default metadata and lock requirements.
