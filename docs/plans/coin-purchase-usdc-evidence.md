# USDC planning evidence — owner decisions and Freighter compatibility

## Identity and proof boundary

Branch `feat/coin-purchase-usdc`, application source inherited from Freighter `31615747ea866438eb4a3887a9ff785901059e0b`; previous documentation commit `4fc84797d3c495d7a3e8dc86fc5fa05e5be526ef`. Parent's read-only Git comparison confirmed no differences in backend/src, backend/drizzle or frontend/src. This revision changes only these two planning documents; no implementation, migration, DB/environment setup, test execution, wallet/secret/chain operation, push or merge.

Read-only researcher `mvy50o3j-y-y8w8` inventoried this worktree for the owner-selected option B; parent spot-checked repository:209–263, including the user-lock dependency and bare pet conflict target. Searches cover tracked, nonignored source/tests/docs, not ignored/generated material. A local CodeGraph index is tool metadata, not execution proof; earlier wrong-worktree research remains discarded. This is ordinary read-only source exploration, **not a claimed sdd-explore execution**.

## Owner decisions — not unresolved alternatives

| Decision | Resulting plan contract |
| --- | --- |
| Ledger B | New additive migration generalizes canonical entries; type/source uniqueness, partial unique legacy pet and type-specific provenance CHECK; same-transaction balance update. No edits to0008/Freighter history. |
| SDF Horizon testnet | Documented one-year retention accepted for this phase; proposed15min scan/head-lag alert. Stop/alert with unchanged cursor for uncovered gaps. No self-hosted Horizon; reconsider mainnet. |
| Detector | Flagged module inside existing backend; one replica holds session advisory lock on dedicated connection, with credit/cursor transactions on that connection. No Dokploy service. |
| Memo | Random unique never-reassigned ten-digit ID1000000000–9999999999, collision retry; also exact same numeric text without coercion. |
| Amounts | Minimum1;>=1 credits integer portion and queues exact residual for manual external refund/discard; below1 wholly reviewed; never combine deposits. |
| Home | Prefer separate counter outsidePetHomeStage, subject to actual layout; preserve account/session fences. |
| Prior approved invariants | Per-operation idempotency, delivered path-payment amount, ignored self-payments, audited admin/reservations, atomic cursor, flags/drain and future matrix/E2E retained. |

The earlier sibling-ledger recommendation, unresolved A/B choice, entire-fraction rejection, random64-bit-only memo, separate worker process and permanent-archive readiness blocker are **superseded**, not still pending owner decisions. Implementation remains unauthorized.

## Complete Freighter ledger compatibility inventory

Paths prefixed `src/` or `drizzle/` below are relative to **backend/**. Every adjustment is **future work on this coin branch only**. No listed file was changed in this documentation task.

### Production schema and every direct production entry use

| Exact source | Operation and current assumption | Required future treatment |
| --- | --- | --- |
| `drizzle/0008_user_coin_ledger.sql:11–23` | DDL: mandatory pet+operation; unconditional UNIQUEpet; same-user ownership/claim FKs; nonnegative integer amount. Every row structurally legacy. | Preserve0008 byte-for-byte; append new typed migration, partial legacy-pet index and CHECKs while retaining all existing data/provenance/zero imports. |
| `src/db/schema.ts:223–237`, registration239–243 | ORM schema/types expose all provenance as non-null and global pet uniqueness. | Reflect typed variants. Purchases cannot require a pet/claim; legacy must still require BOTH via CHECK in addition to nullable composite FKs. |
| `src/account-pet/infrastructure/drizzle-account-pet.repository.ts:6,241–246` | **Only production entry import/write/returning-read:** creditLegacy inserts user/pet/operation/amount, bare ONCONFLICT(pet_id), increments only on returning row. Explicit legacy-only writer. | Supply legacy type/source; use exact partial-index conflict predicate; preserve one import per pet and transaction/insert-gated increment. Coordinate migration/writer rollout; old conflict inference is not automatically compatible. |

No other production `user_coin_entries`/`userCoinEntries` reader, writer, sum, count, join, update or delete was found. The ORM symbol has one importing repository; frontend has no direct table/symbol reference. This absence is a bounded source-search finding, not a runtime guarantee about external consumers.

### Balance, transaction and locking interactions

| Source | Verified behavior / preservation requirement |
| --- | --- |
| Repository above:36–39,45–84,87–115 | User→operation when resolving→sorted pets→ownership lock order; creditLegacy called82/113 after ownership insertion. Preserve ordering/ownership-before-credit. |
| Same:209–212,230–233 | User row FORUPDATE serializes activity. Balance read is plain SELECT, not balance-row FORUPDATE; purchase UOW must take this actual user lock. |
| Same:136–181,176–179 | Current reads/mutations use canonical balance; pet snapshot writes exclude coins. Preserve with mixed ledger. |
| Same:185–207,252–263 | Restore does not import again; confirmed replay returns stored operation result rather than recomputing it. Preserve, while current account balance remains canonical. |
| `src/users/infrastructure/user-persistence.ts:10,18–28` | Shared transaction type/db.transaction with local5s lock timeout; balance init ONCONFLICTDONOTHING never resets. Separate repository transactions do not compose atomically. |
| `src/database/database.module.ts:15,59–62` | Pool-backed Drizzle does not establish dedicated detector leadership connection; module must explicitly own/session-bind its UOW. |
| `src/pet/infrastructure/drizzle-pet.repository.ts:42–49,57–86` | Sorted pet locks; guest operations lock then reject owned pet. Preserve fresh locked legacy import and revocation. |

### Every direct test/fixture entry use

| Exact source | Read/write assumption | Future branch adjustment / preservation |
| --- | --- | --- |
| `src/db/account-pet-migrations.spec.ts:70–71` | Unqualified SELECT empty entries after migrating empty fixture. | Still valid for that fixture; add populated-ledger upgrade preservation. |
| Same:84–87,90 | Raw legacy INSERTs; duplicate pet, negative amount, owner/operation mismatch rejection. | Add type/source metadata as needed; retain all rejection/zero cases and add valid/invalid purchase variants/type-source uniqueness. |
| Same:13–19,57–69 | Exact journal tail; blanket no-UPDATE policy over every appended migration. | Keep historical0007/0008 expectations; new metadata backfill needs its own explicit preservation proof. Never edit0008 to satisfy a new test. |
| `src/account-pet/drizzle-account-pet.repository.spec.ts:21–22` | Whole-table SELECT exposes state().entries. | Type-neutral snapshot; retain and exercise with purchase rows. |
| Same:68,117,212,218,249,273 | Empty/exact counts or first-row amount in legacy-only fixtures. | Existing fixture assertions remain valid; mixed fixtures must scope legacy counts by type/user/pet. |
| Same:160,167,188,195,224,232 | Whole-table before/after equality for care/recovery/concurrency. | Not inherently legacy-only; preserve whole mixed ledger. |
| Same:177,181 | Temporary CHECK(amount<>5) failure injection affects all types. | Keep isolated or scope fault to legacy type in a mixed fixture. |
| `src/account-pet/testing/account-pet-http-test-kit.ts:45–50` | Dynamic whole-table snapshots include entries. | Type-neutral; retain mixed-row preservation. |
| `src/account-pet/account-pet.http.spec.ts:54,69,103,302,314,352` | Singleton/empty/total counts; legacy-only fixtures. Snapshot assertions transitively use the kit. | Retain isolated cases; add scoped/mixed-ledger coverage, not global-row legacy inference. |
| `src/account-pet/t4-independent.spec.ts:30,84` | Snapshot digest plus unqualified1/2entry count. | Digest type-neutral; scope counts only when adding mixed cases. |
| `src/auth/testing/stellar-http-test-kit.ts:55–60` | Dynamic full-table snapshots include entries. | Type-neutral; include purchases in preservation cases. |
| `src/auth/stellar-independent.spec.ts:127–136,143` | Raw legacy INSERT/balance seed, durable hash proves auth cleanup preserves ledger. | Supply legacy metadata; extend durable preservation to purchase rows. |
| `src/auth/infrastructure/drizzle-stellar-auth.repository.ts:44–48` | Cleanup deletes transient auth rows only, not ledger. | No new ledger cleanup; preserve nondeletion contract. |

### Every identified indirect destructive fixture path

No direct ledger DELETE/TRUNCATE was found. The following **test-only CASCADE truncations** indirectly erase every ledger type; allowed only in each owned isolated test DB, never admin/application history:

- `src/account-pet/drizzle-account-pet.repository.spec.ts:17`, `account-pet.http.spec.ts:22`, `t4-independent.spec.ts:26`.
- `src/auth/stellar-independent.spec.ts:20`, `stellar-auth.e2e.spec.ts:28`, `infrastructure/drizzle-stellar-auth.repository.spec.ts:19`.
- `src/users/infrastructure/drizzle-user.repository.spec.ts:19`, `drizzle-wallet-user.repository.spec.ts:17`.
- `src/roles/infrastructure/drizzle-role.repository.spec.ts:20`.
- `src/pet/model-retirement.http.spec.ts:88`, `free-care.http.spec.ts:49`, `coat-pattern.http.spec.ts:73`, `adopted-guest.http.spec.ts:16`, `pet.controller.spec.ts:27`, `guest-compatibility.http.spec.ts:20`, `pet.service.spec.ts:26`, `infrastructure/drizzle-pet.repository.spec.ts:25`.
- `src/testing/postgres-lifecycle.ts:126` drops its owned fixture database, including all entries; new tables must remain covered by isolated lifecycle cleanup.

Documentation consumers: `backend/README.md:317–328` describes historical0007/0008 provenance/history; future coin-branch clarification distinguishes purchase provenance without weakening legacy guarantees. `docs/plans/freighter-user-pet-plan.md:94,100,122–126` records once-per-pet import/history: **leave that Freighter plan and approvals untouched**; this document describes the extension.

## Official documentation — facts versus decisions

| Claim | Official reference / actual proof boundary |
| --- | --- |
| Circle testnet issuer/trustline; FriendbotXLM versus faucetUSDC | https://developers.circle.com/stablecoins/quickstart-transfer-usdc-stellar — previously retrieved; no sample key/install/transfer executed |
| Seven-decimal amount strings; conditional classic RPC events | https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc — previously retrieved; integer units and event flags documented, not live adapter proof |
| SDF hosted one-year retention | https://github.com/stellar/stellar-docs/blob/main/docs/data/apis/horizon/providers.mdx — prior official Context7 passage: Aug1,2024 truncation to one year. Owner accepts phase scope; no fresh SLA/endpoint-retention measurement |
| Self-managed retention/filtering | Official stellar-docs horizon/admin-guide/{ingestion,ingestion-filtering}.mdx — historical comparison only, **not a requirement or provisioning proposal now** |
| Memo uint64/TEXT28bytes and operation/result definitions | https://github.com/stellar/stellar-xdr/blob/master/Stellar-transaction.x — mutable official schema, not a frozen tag or source-adapter execution |
| Indexed Horizon versus RPC methods | https://developers.stellar.org/docs/data/apis/horizon/api-reference and rpc/api-reference/methods/{getTransactions,getEvents} — references, not verified hosted capability/configuration |
| Muxed tradeoffs/testnet reset/public build-time env | Stellar pooled-accounts-muxed-accounts-memos guide; networks#testnet-and-futurenet-data-reset; https://nextjs.org/docs/app/guides/environment-variables#bundling-environment-variables-for-the-browser — references, no exchange/browser/reset test |

Ten-digit memo/text equivalence, floor-credit/residual policy, in-process leader module and15min lag threshold are owner decisions/design proposals, not facts proved by these URLs. No exchange compatibility, receiver trustline, live throughput or mainnet configuration is asserted.

## Documentary acceptance and remaining implementation proof

Plan§0–7 and future§9 matrix now reflect every owner decision;§8 retains10×measurement conditions and§10 isolates future surfaces. New residual rules require atomic conservation and scoped refund reservation: a residual refund cannot refund/recredit the already settled integer portion. A one-year-retained source cannot cover arbitrary downtime; stop/alert without cursor movement is the accepted boundary, not recovery of erased history.

Only documentary readback, requirement tracing, whitespace/scope checks and local documentation commit apply now. **No RED/GREEN, migration compatibility, observer leadership, balance atomicity, live source continuity, UI/browser, E2E, throughput or native approval is claimed.** Those remain future implementation checks, not unresolved ledger/source/product choices. Physical source/schema bytes, original Freighter approvals, A2 and B1 must remain unchanged by this coin documentation commit.
