# USDC coin purchases — owner-selected testnet design

**Plan only; no implementation authorized.** Branch `feat/coin-purchase-usdc` starts at Freighter `31615747ea866438eb4a3887a9ff785901059e0b`. This revision records the owner's decisions after documentation commit `4fc84797`. Only the plan/evidence change: no application, migration, database, wallet, secret, testnet transaction, service, push or merge. Freighter/A2/B1 code and approvals remain untouched.

## 0. Selected ledger: B, canonical entries with typed provenance

**OWNER DECISION:** generalize `user_coin_entries` through a **new additive migration after0008 in this branch**, not a sibling purchase ledger. Never edit `0008_user_coin_ledger.sql`, rewrite Freighter history or reinterpret its approvals. Source today requires every entry to have pet/claim provenance and global pet uniqueness; this is a planned extension, not an already-compatible schema.

Proposed final schema contract:

| Movement | Required provenance and constraints |
| --- | --- |
| `legacy_import` | Non-null `pet_id` AND `operation_id`; retain both same-user composite FKs to ownership/claim operation. A type-specific CHECK requires both; nullable FKs alone are insufficient. Source reference identifies the imported pet. Preserve zero-valued imports and nonnegative integer amount. |
| `usdc_purchase` | No invented pet/claim: `pet_id` and `operation_id` are null; require a FK to the verified deposit observation, with source reference equal to that observation identity. Purchase amount is an integer>=1. |
| All entries | Non-null movement type and source reference; `UNIQUE(movement_type, source_reference)` across users. A partial unique index on `pet_id WHERE movement_type='legacy_import'` preserves once-per-pet import. CHECK accepts only supported type/provenance combinations. |

Observation identity itself has a unique canonical `(network_epoch, receiver, operation_id)` source key. Purchase reference equality/FK plus type/source uniqueness prevents assigning the same observation twice through different fabricated references. Legacy source references use pet identity, not claim operation alone: one claim may involve more than one legacy pet. `user_coin_balances` remains the canonical nonnegative PostgreSQL integer balance and is updated **in the same transaction as the winning ledger insert**.

The new migration must classify/backfill existing rows as legacy without changing IDs, user/pet/operation references, amounts, balances or history; add/validate typed constraints and the partial index before retiring obsolete global pet uniqueness. Schema/type definitions and the legacy writer need coordinated changes **here**, not in Freighter. Bare `ON CONFLICT(pet_id)` will not infer only a partial index: adapt it to the exact legacy predicate and retain insert-gated increments. No rolling compatibility with an unchanged old writer is claimed; implementation must prove a coordinated migration/writer rollout that never lets an incompatible writer process a claim. No downtime-free deployment requirement is invented.

Compatibility audit of every direct ledger reader/writer, transitive test snapshot and cleanup is in [evidence](coin-purchase-usdc-evidence.md#complete-freighter-ledger-compatibility-inventory). Existing Freighter fixtures remain meaningful; necessary fixture metadata/journal expectations and mixed-ledger preservation tests belong to this branch. No implementation is performed now.

## 1. Product boundaries and approved amount policy

- One shop coin=1USDC; user-owned database credit, not an on-chain token. No coin→USDC redemption, guest purchase credit or paid care. Preserve free care and unique legacy import; deposits add to the canonical balance.
- Testnet only: code `USDC`, issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` [Circle](https://developers.circle.com/stablecoins/quickstart-transfer-usdc-stellar).
- Receiver G-account public key is backend configuration. Owner manually creates its trustline. Backend never receives the receiver secret, creates its trustline or signs refunds. SEP-10 server identity is not treasury authority.
- Minimum **1USDC**. Parse seven-decimal strings into integer units of10^-7 with BigInt/checked decimal arithmetic, never binary float or rounding [Stellar representation](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc).

| Delivered amount | Automatic credit / exact remainder |
| --- | --- |
| `2.0000000` |2coins, no residual |
| `2.5000000` |2coins;5000000units (`0.5000000USDC`) in this operation's admin residual queue |
| `1.0000001` |1coin;1unit residual |
| `0.9999999` or `0.5000000` | Entire deposit to review; zero automatic credit |
| Integer portion would exceed balance2147483647 | Entire deposit to overflow review; no partial balance write/wrap |

For units>=10000000, integer coins=`units / 10000000`, residual=`units % 10000000`, using integer division. Whole credit and residual creation commit together; retained total=creditedUSDCunits+unresolved/resolved residual units. Never combine residuals or below-minimum deposits, automatically or manually. Residual resolution is **manual external refund or audited discard**, never a fractional coin credit. Unknown memo/wrong asset remains review rather than applying this automatic split blindly. UI asks for whole amounts and warns that decimals are not automatically credited as coins.

## 2. Stable ten-digit memo and address scheme

**OWNER DECISION:** cryptographically random, unique, fixed-ten-digit `MEMO_ID` in inclusive range `1000000000–9999999999`. Use an unbiased cryptographic sampler; retry database uniqueness collisions. Stable per user, opaque, never derived from user ID/wallet, never reassigned after deletion; retain mappings/tombstones. Memo is routing data, not authentication.

Accept either protocol MEMO_ID with that numeric value or MEMO_TEXT whose contents are **exactly the same ten ASCII digits**. Text must match `[1-9][0-9]{9}`, be in the range and resolve to the assigned mapping; no spaces, signs, leading zeros, Unicode digits, decimals or exponent notation. Thus assigned ID1234567890 and text`1234567890` route identically. Values999999999/10000000000, text` 1234567890`, `+1234567890`, `01234567890`, missing/hash/return or unknown memo go to review. Do not trim/coerce invalid strings or infer owner from sender/exchange address.

MEMO_ID is protocol uint64; MEMO_TEXT has28byte maximum [official XDR](https://github.com/stellar/stellar-xdr/blob/master/Stellar-transaction.x). Ten digits fit both; persistence/source decoding must preserve exact values. This narrows the former random64-bit proposal and explicitly permits canonical numeric text; exchange-specific support is still unverified. UI primarily labels MEMO_ID and explains the exact accepted text fallback, without claiming Binance/testnet withdrawal support.

Default is G-address+memo. Muxed accounts can embed routing [official guide](https://developers.stellar.org/docs/build/guides/transactions/pooled-accounts-muxed-accounts-memos), but are not the default or assumed exchange-compatible; preserve/review unexpected identifiers instead of stripping them. Transaction-level memo applies to all qualifying operations; deduplicate by operation, not transaction hash. Verify fee-bump memo/hash/muxed representations through future adapter tests.

## 3. Selected source: SDF Horizon testnet, bounded retention

**OWNER DECISION:** use `https://horizon-testnet.stellar.org` account payments, ascending cursor/paging-token order, successful transactions only. Obtain transaction memo by canonical transaction hash; explicitly filter destination, delivered asset, operation type and success [Horizon](https://developers.stellar.org/docs/data/apis/horizon/api-reference).

| Alternative | Reason / boundary |
| --- | --- |
| SDF Horizon testnet — selected | Indexed account payments fit this detector. Documented one-year retention is sufficient for this phase; not a freshly measured SLA. |
| RPC getTransactions | Transaction/result/meta XDR requires decoding/account indexing and retained-range handling, not an equivalent indexed account-payments endpoint. |
| RPC getEvents | Classic events require `EMIT_CLASSIC_EVENTS=true`; preProtocol23 history additionally `BACKFILL_STELLAR_ASSET_EVENTS=true`. Empty events do not prove no payments. |

References: [Horizon→RPC](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc), [getTransactions](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getTransactions), [getEvents](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getEvents). No self-hosted Horizon, archive service or new infrastructure is provisioned or required for this testnet plan. Reassess source/retention/recovery for separately authorized mainnet work.

Only successful incoming operations delivered to the configured receiver in exact CircleUSDC can credit. Ignore outgoing and **self-payments**; do not count fee-payer/source-account appearances as deposits. For strict-send/strict-receive path payments, use delivered destination asset/amount, not source asset/amount [Horizon and protocol result XDR](https://github.com/stellar/stellar-xdr/blob/master/Stellar-transaction.x).

### Retention, lag alert and stop policy

Official SDF documentation reports one-year hosted Horizon history from Aug2024 [providers](https://github.com/stellar/stellar-docs/blob/main/docs/data/apis/horizon/providers.mdx). Owner accepts that window. **“No lost payments” is conditional on downtime remaining within retained history and verified continuity; it is not an unlimited-outage guarantee.** No separate permanent archive is an unresolved testnet design blocker anymore.

Propose **15minutes** alert threshold for scan/head progress lag or oldest unprocessed source work. Measure source-head/scan progress, not time since the last customer deposit: an idle account must not falsely look stalled. Alert when the web API is healthy but the detector is not progressing. Persist checkpoint ledger/source identity alongside the operation cursor so a pruned interval cannot masquerade as an empty page.

Bootstrap from verified receiver creation/earliest relevant ledger within available history, never cursor=now. Verify retained continuity on bootstrap/restart. If the source cannot cover any gap, outage exceeds retention, receiver/source changes incompatibly or continuity is uncertain: **stop automatic credits/new instructions, alert, preserve all evidence and do not advance, reset or skip the cursor.** Operator reconciliation must establish coverage before resume; never silently change provider or pretend unavailable payments were recovered. Testnet resets are an independent stop/epoch-reconciliation event [network reset reference](https://developers.stellar.org/docs/networks#testnet-and-futurenet-data-reset); retain local credit/audit history.

## 4. Detector inside the existing backend

**OWNER DECISION:** a feature-flagged module within the existing backend process, not a separate application-context worker/service, Dokploy service or uncoordinated per-replica interval. When observer flag is enabled, replicas may attempt leadership; exactly one processes a receiver/network stream.

Hold a PostgreSQL **session advisory lock on a dedicated connection** for the active leader's lifetime. All credit/classification/cursor transactions run on that **same connection**, not separately pooled repository transactions. Other replicas wait without processing. Connection loss releases leadership and rolls back in-flight work; stop processing, reconnect/reacquire leadership and verify continuity. Bound retries/backoff/jitter and shutdown; never leave a failed leader processing through a different connection.

Fetch bounded ascending pages outside transactions. Apply each operation in order; lock cursor row and compare expected predecessor, rejecting obsolete/regressive/skipping work. Commit cursor after durable classification, not after page fetch. For one operation, one transaction on the leadership connection:

1. Lock/check predecessor; insert-or-find immutable observation by unique network/receiver/operation identity.
2. Validate success/destination/delivered asset/memo/exact amount; resolve user only through stable mapping.
3. Obtain the existing account/user `FOR UPDATE` lock used by legacy import; respect its lock ordering before canonical balance access.
4. Insert typed purchase entry for the integer portion, increment balance only if that unique insert wins, and create any residual review **atomically**. Overflow/invalid input makes no increment.
5. Append classification/audit and advance cursor atomically; commit. Review/ignored/duplicate paths persist their applicable outcome and cursor without another credit.

A crash yields all effects or none. PostgreSQL uniqueness remains the safety barrier under retry/leadership faults. Admin resolutions use the same observation/revision and account serialization, not a separate service's independent transaction. No network fetch, refund/signing or unbounded work holds the transaction open.

## 5. Additive data design and Freighter compatibility

| Planned table / extension | Contract |
| --- | --- |
| `user_coin_entries` | Selected B: movement type, source reference unique per type, conditional provenance and partial legacy-pet uniqueness (§0); no sibling purchase ledger |
| `user_coin_balances` | Existing canonical balance unchanged; same-transaction insert-gated increment under existing user lock |
| `coin_payment_memos` | Unique stable ten-digit routing value; user mapping/tombstone, no reuse |
| `coin_deposit_cursors` | Receiver/network epoch/provider, paging token+ledger checkpoint+revision, head/lag/continuity evidence |
| `coin_deposit_observations` | Unique canonical operation identity; immutable public source provenance, exact delivered units, integer-credit/residual split and resolution state |
| `coin_deposit_reviews` | Whole-deposit or residual scope, amount/asset, revision, terminal reason or external-refund reservation/reference |
| `coin_deposit_audit_events` | Append-only actor/action/reason/revision/references; no secrets or cascading history deletion |

Compatibility inventory establishes one production entries writer (`creditLegacy`), no other production entries reads/sums/updates/deletes, and multiple raw fixture/test readers. Update the writer's type/reference and partial conflict predicate here, preserving ownership-before-credit, insert-gated balance update, recovery without reimport and confirmed-claim replay semantics. Test snapshots containing entries must preserve purchase rows; legacy-only count assertions must not become a mixed-ledger assumption. Exact paths/lines and every direct usage/indirect cleanup are in evidence.

Migration testing must preserve all existing data, mandatory legacy provenance, negative/mismatched/duplicate rejection and zero-valued import; add valid purchase-without-pet and invalid variant/type-source duplicate cases. The historical test's exact journal tail/blanket no-UPDATE assertion applies to0007/0008; a new metadata-backfill migration gets explicit preservation assertions instead of editing history or weakening legacy rules. Future backend README clarification belongs here; existing Freighter plan/approvals remain intact.

## 6. Flows and audited administrative resolution

| Flow | Durable outcome |
| --- | --- |
| Integer deposit | One observation/typed purchase/increment/audit/cursor transaction |
| Deposit>=1 with fraction | Integer credit once plus exact per-operation residual review in the same transaction |
| Below minimum | Entire exact amount in review; zero credit; never aggregate |
| Duplicate/restart/multiple ops per tx | Operation-level identities prevent repeated credit; distinct qualifying operations remain independently creditable |
| Missing/unknown/invalid memo or wrong asset | Review without automatic attribution/credit; no sender inference or conversion of wrong asset |
| Source failure/gap/reset | Backoff or stopped/alerted state as appropriate; no cursor skip; retained-continuity/epoch proof before resume |
| Receiver/trustline unready | No instructions; owner action, no backend signing |

Use current server-side admin/super_admin/session/Origin-CSRF guards, fresh roles, bounded pagination and optimistic revision checks. All actions retain evidence and audit.

- **Manual attribution/credit:** verified eligible CircleUSDC only; deliberate account assignment/reason for unknown memo, same minimum/integer/residual policy and one typed entry. Wrong asset or a sub-coin residual cannot be converted into coins.
- **Refund reservation:** reserve the exact uncredited scope **before** owner signs externally. Reservation wins against worker/admin credit races. For an already integer-credited deposit, reserve/refund **only the residual**, never the entire payment or credited integer portion. Record amount/asset/public external reference and reason; backend never signs. Do not invent coin redemption or debits.
- **Discard:** terminal audited resolution of whole review or residual; retain the exact amount/provenance, no deletion. Replay cannot resurrect it; never combine it with another payment.

Whole-deposit credit/refund/discard and residual resolution have explicit separate states/revisions. A refund/discard of a residual cannot reverse, repeat or conceal its settled integer credit. External transfers made outside this reservation protocol require reconciliation; the database cannot infer unrecorded human intent atomically.

## 7. UI, home placement, flags and shutdown drain

Account “Comprar monedas”: separate copy controls for public receiver and memo, visible MEMO_ID/exact numeric-text compatibility, mandatory memo/testnet warnings, whole-amount request and exchange-style instructions without unverified exchange compatibility claims. Proposed copy: “Solo testnet: no envíes fondos de mainnet.” / “El memo es obligatorio. Copiá la dirección y el memo completos.” / “Ingresá un monto entero. Los decimales no se acreditan como monedas y quedan para revisión.” / “Las monedas son saldo de la tienda, no son canjeables por USDC.” Distinguish nonredeemable coins from exceptional external refunds of uncredited funds/residuals.

Show awaiting transfer (not proof of payment), detected/review, credited integer and residual-review amounts separately, plus public references. Never expose unassigned unknown-memo deposits to arbitrary accounts. Free care remains free; guests have no purchased counter.

**Prefer a separate home coin-counter component outside `PetHomeStage.tsx`, mounted by the surrounding home composition if layout permits.** Preserve canonical account balance, Freighter session owner/epoch/abort fences and no stale-account overwrite. Avoid another A2/B1/Freighter shared-stage edit; if composition cannot accommodate it, report the concrete integration constraint rather than silently broadening that surface. No cat/pose/camera/landing redesign.

Use existing tokens `--primario #3dff8a`, `--estado-advertencia #ffcc33`, `--estado-error #f500dc`, `--tarjeta #ffffff`, `--superficie #eef6f0`; accessible copy/status/error feedback and existing admin/account patterns.

Backend `COIN_PURCHASE_ENABLED` and `COIN_DEPOSIT_OBSERVER_ENABLED` default false; the latter controls this in-backend module, not a new service. Validated receiver public key, exact testnet issuer/network/epoch/source are separate settings. Reserve `COIN_USDC_ISSUER_MAINNET` configuration only for separately authorized future work; do not invent/use it here. Frontend `NEXT_PUBLIC_COIN_PURCHASE_ENABLED` defaults false and is **build-time** [Next guide](https://nextjs.org/docs/app/guides/environment-variables#bundling-environment-variables-for-the-browser).

Enable backend readiness/observer before publishing enabled frontend instructions. Disable frontend first, then new backend issuance/automatic credit. Once an address was shown, late deposits remain possible: keep the existing backend module's observer enabled in observe/review drain mode, or guarantee shutdown backfill within retained SDF history. Observer shutdown beyond retention risks an unfillable gap and must stop/alert, not skip. No flag authorizes signing, mainnet or another Dokploy service.

## 8. Ten-times load and failure acceptance

Bound pages, memory/retries and serial cursor work. Measure source requests, scan/head lag, oldest work, operation rate, DB latency/lock waits, residual review age and source retained boundary. At measured incoming rateλ and service capacityμ,10×acceptance requiresμ>10λ and catch-up against backlog/(μ−10λ); not a benchmark claim. Alert at proposed15min lag; idle-with-current-head is healthy. Respect rate limits, retry the same operation after DB failure, do not equate healthy API with healthy observer. Extra replicas cannot recover pruned history.

## 9. Future RED→GREEN matrix

**Future tests only; none executed in this documentation task.** Use public detector/service/admin interfaces and isolated PostgreSQL, asserting exact status/errors, balances, typed entries, observations, residuals, audit and cursor. Rejected inputs must not mutate credit/counters; retained review classifications are explicit intended outcomes, not hidden credit writes.

| Rule / input | Required outcome |
| --- | --- |
|2.0000000CircleUSDC + assigned ID or exact numeric text |2coins once; one typed entry/observation/audit; atomic cursor; no residual |
|2.5000000 /1.0000001 |2/1coins; residual5000000/1units, each conserved and independently reviewed; replay changes neither |
|0.5000000 /0.9999999 | Entire amount review, zero credit; two deposits never combine |
|1.0000000 / balance exactly2147483647 / overflow | Boundary exact; overflow goes wholly to review without wrapping/partial writes |
| ID1000000000/9999999999; collision/reassignment/deleted user | Endpoints valid; collision retries uniqueness, tombstones never reused |
| Assigned ID1234567890 and text`1234567890` | Same routing; unknown assignment still review |
| ID999999999/10000000000; whitespace/sign/zero-prefixed/Unicode/hash/missing memo | Review with original evidence; no coercion/wrong-owner credit |
| Same op twice / restart after commit / two qualifying ops same tx | Once per operation; transaction memo shared, independent entries for distinct ops |
| Failed/outgoing/self-payment / wrong code or issuer/XLM | No purchase credit; correct ignored/review provenance and cursor |
| Path payment with different source asset/amount | Split/credit by delivered CircleUSDC destination amount only |
| Crash at each UOW write/commit, including residual insertion | All credit/residual/audit/cursor or none; exact replay; no lost fraction |
| Multiple backend replicas / leadership-connection loss | One active module; same-connection rollback/reacquire; no duplicate/skip; no separate service |
| Worker/admin credit race / two resolutions / stale revision | One winning disposition/typed entry; no double credit |
| Whole refund reservation vs credit | Reservation blocks later credit; audited external reference; no backend signing |
| Residual refund/discard after integer credit | Scope only residue; integer credit unchanged and not repeated; fraction never combined |
| New additive migration over populated legacy ledger | Preserve IDs/amounts/balances/FKs; typed metadata only;0008 unchanged |
| Legacy duplicate pet/zero import/negative/mismatched ownership or claim | Previous guarantees retained under partial unique index/type CHECK |
| Purchase without pet/claim / invalid variant / duplicate type+source | Valid purchase works; malformed provenance/duplicate rejected without balance increment |
| Legacy import before/after purchase; concurrent claim/purchase | Canonical sum exact, user lock respected; once per pet, no fake claim, mixed rows preserved |
| Auth cleanup/care/recovery/confirmed claim replay with mixed ledger | Prior behavior unchanged; no ledger deletion/recredit, canonical current balance preserved |
| Outage inside retention / lag>15min / idle current head | Resume exactly from cursor; alert on actual lag, not idle deposits |
| Pruned gap or outage beyond retention / reset/config identity change | Stop+alert, no advance/reset/cursor=now; explicit reconciliation before resume |
| Flags/drain/direct API/nonadmin/guest/stale owner | Gates hold; late deposits observed/reviewed; no stale-account balance/care regression |
| Account/home/component/copy/statuses | Whole-amount warning, separate integer/residual status, counter outsideStage if feasible; specified color tokens/gates preserved |
|10×backlog/repeated pages/rate-limit/DB failure | Bounded complete ordered catch-up, no duplicate/drop; observed measurements, not assumed capacity |

Future E2E: isolated DB/users/memos plus two throwaway testnet senders inside a volatile dedicated signer harness; never receiver signing in backend or secrets in logs/Git/chat. Owner creates receiver/trustline and obtains Circle faucetUSDC; Friendbot suppliesXLM, notUSDC [Circle](https://developers.circle.com/stablecoins/quickstart-transfer-usdc-stellar). No accounts/funding now. Exercise integer, decimal split/residual, below minimum, both accepted memo forms, replay/restart, missing memo and wrong-assetXLM, then real isolated admin/UI residual refund reservation/discard. Wrong-issuer live delivery needs separately authorized receiver trustline; deterministic source-adapter tests do not imply such a transaction happened. Preserve public source/build IDs and clean only owned resources.

## 10. Future surfaces and delivery gates

Existing-backend coin-purchases module/config/source adapter/detector/admin/account ports and same-connection UOW; new migration after0008, updated schema/legacy writer/test fixtures **only on this branch**. No worker entry point or Dokploy service. Frontend purchase/admin panels/services, independent home counter/composition and tests/styles, preserving same-origin auth/proxy and free care. Never edit Freighter/A2/B1 worktrees.

If authorized upstream changes must be integrated later, use merge commit, not rebase, and recheck affected contracts. No push/merge now. Implementation still needs explicit authorization, receiver/trustline/testnet readiness, retained-continuity/bootstrap checks, migration/rollout proof and functional/security/concurrency verification. Ledger B, SDF testnet retention, in-backend detector, memo and amount policies are **settled owner decisions**, no longer open A/B/archive/fraction gates. The approved design is not an implemented payment system or an unlimited-retention guarantee.
