# USDC coin purchases — proposed design, ledger decision required

**Plan only; NOT approved for implementation.** Branch `feat/coin-purchase-usdc` starts at Freighter `31615747ea866438eb4a3887a9ff785901059e0b`. No application code, migration, database, testnet account/transaction, secret configuration or production state was changed. No push or merge.

## 0. Blocking owner decision: the existing entries table is legacy-only

Verified source: `backend/drizzle/0008_user_coin_ledger.sql` and `backend/src/db/schema.ts:214–237` require every `user_coin_entries` row to have a pet and matching ownership/claim-operation provenance, with unique `pet_id`. The private legacy-credit method inserts once per pet; there is no generic purchase-credit port. Separate repository transactions cannot make a credit and detector cursor atomic.

| Choice | Proposed design | Contract consequence |
| --- | --- | --- |
| **A — recommended, requires approval** | Keep `user_coin_entries` entirely unchanged; add purchase-specific provenance entries and an additive purchase UOW updating the same canonical `user_coin_balances` | Preserves legacy semantics, but **purchases do not physically appear in the original entries table**. Owner must accept this interpretation of the requested ledger. |
| **B — explicit contract expansion** | Generalize the canonical entries schema into distinct legacy-import/purchase provenance variants | Changes nullability/constraint/reader contracts. Needs owner authorization and detailed impact review before any implementation. Legacy uniqueness/claim guarantees still cannot be weakened. |

**Neither choice is selected by this plan.** Do not fabricate pets or claims, attach a purchase to an unrelated operation, or remove legacy per-pet uniqueness. The remaining architecture is shared; table examples use A conditionally and must be rewritten if B is chosen. This document is a complete proposal with this explicit gate, not a claim that the owner's exact ledger requirement is already met.

## 1. Product boundaries and proposed open policies

- One internal shop coin equals1USDC; coins are user-owned database balance, not an on-chain token. No coin→USDC redemption. Guests cannot obtain purchase instructions or credits.
- Preserve free care and the one-time legacy import. A deposit adds to, never replaces, the canonical account balance.
- Testnet only. Accepted asset is exactly code `USDC` and issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` [Circle quickstart](https://developers.circle.com/stablecoins/quickstart-transfer-usdc-stellar).
- The receiver G-account public key is backend configuration. The purchase backend never holds its secret or signs transfers/refunds. Existing SEP-10 server-signing credentials are a separate identity, not treasury authority.
- Owner creates the receiver/trustline manually. Receiving USDC requires its trustline [Circle](https://developers.circle.com/stablecoins/quickstart-transfer-usdc-stellar). Validate receiver/asset/network readiness before enabling instructions; no automatic trustline creation.

| Open policy | Recommendation, not an approved product decision |
| --- | --- |
| Minimum |1wholeUSDC, configurable integer and validated at startup |
| Fractional amount | Put the **entire** deposit in review; no rounding, truncation, automatic partial credit or cross-deposit combining |
| Unknown/missing/wrong-type memo | Persist in admin review; never infer owner from sender/exchange address or guess an internal user ID |
| Manual credit | Only verified inbound CircleUSDC with whole-coin amount and valid account assignment; reason/audit required. Invalid asset is not converted into shop credit. |
| Refund | Owner sends it manually on testnet after a recorded refund reservation; record external transaction reference, never automate signing |

Amounts on Stellar have seven decimal places [official migration guide](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc). Parse source decimal strings into integer units of10^-7 using BigInt/checked decimal arithmetic; never binary float. Require units modulo10000000=0 for automatic credit. Example2.0000000→2coins;2.5000000→review;0.5000000→review. A wrong issuer with codeUSDC is still a wrong asset, not CircleUSDC. Existing canonical balances are PostgreSQL integer; reject to review if the exact addition would exceed2147483647, rather than wrapping or changing that column's semantics.

## 2. Memo and address scheme

**Propose MEMO_ID**: cryptographically random nonzero unsigned64-bit value, stored without JavaScript Number conversion, rendered as canonical decimal digits. It is opaque, stable per user and never derived from user UUID or wallet key. Database uniqueness plus collision retry enforces assignment; retain mappings/tombstones permanently and never reassign an old user's memo. A memo is routing data, not an authentication credential.

MEMO_ID is a uint64; MEMO_TEXT is limited to28bytes in protocol XDR [official transaction schema](https://github.com/stellar/stellar-xdr/blob/master/Stellar-transaction.x). A numeric ID is easy to copy/type but can be up to20digits; text would be more flexible for some exchange forms but has encoding/length/typo tradeoffs. Exchange-specific support is **not verified**. UI must name the expected memo type explicitly, preserve all digits and never silently reinterpret MEMO_TEXT containing digits as MEMO_ID. Wrong type routes to review.

Muxed M-addresses embed routing information and can avoid a separate memo, but exchange support varies [official muxed-account guide](https://developers.stellar.org/docs/build/guides/transactions/pooled-accounts-muxed-accounts-memos). Do not make M-addresses the default or assume a provider accepts them. Propose G-address+MEMO_ID for v1, keeping muxed-compatible decoding in the source adapter: an unexpected muxed identifier is preserved/reviewed, not credited by blindly stripping it. Verify exact Horizon representation before implementing that adapter.

The memo belongs to the transaction, not an individual payment operation [transaction schema](https://github.com/stellar/stellar-xdr/blob/master/Stellar-transaction.x). Several qualifying operations in one transaction may share one memo and each be credited once. Do not use txhash alone as the credit key. A sender can intentionally pay another user's memo; possession of that memo never grants account access.

## 3. Source choice: Horizon first, RPC alternative

**Recommend Horizon account payments in ascending cursor order**, with a stored paging_token, explicit successful-transaction filtering and transaction lookup by the operation's canonical transaction hash to obtain its memo. Horizon already indexes account-related payment operations; the proposed adapter must explicitly filter destination, asset, operation kind and success [Horizon API](https://developers.stellar.org/docs/data/apis/horizon/api-reference).

| Source | Verified facts / proposed consequence |
| --- | --- |
| Horizon | Indexed payment endpoints and cursor-oriented responses fit this account detector. SDF docs describe finite hosted retention; provider-specific actual retained range must be checked. |
| RPC getTransactions | Supplies transaction/result/meta XDR; can derive classic payment outcomes, but requires decoding/indexing, account filtering and explicit retained-range handling. No assumption of an equivalent account-payments endpoint. |
| RPC getEvents | Not an unconditional replacement for Horizon payments. Classic events require Core `EMIT_CLASSIC_EVENTS=true`; preProtocol23 historical coverage additionally needs `BACKFILL_STELLAR_ASSET_EVENTS=true`. Confirm provider capabilities, do not infer them from an empty result. |

Official comparison and flags: [Horizon→RPC](https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc). RPC method references: [getTransactions](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getTransactions), [getEvents](https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getEvents). This plan does not assert a live provider's event configuration, retention SLA or service availability.

Use only successful transactions/operations with a verified destination equal to the configured receiver and exact delivered asset. Ignore outgoing operations even when the receiver account appears as source or fee payer. Treat self-payments as non-purchases to avoid minting shop credit from treasury balance recycling. For strict-send/strict-receive path payments, use the **delivered destination amount/asset**, not source_amount/source_asset [Horizon API](https://developers.stellar.org/docs/data/apis/horizon/api-reference), [protocol operation/result schema](https://github.com/stellar/stellar-xdr/blob/master/Stellar-transaction.x). Derive field mapping and fee-bump memo/hash behavior from the actual source representation in adapter contract tests, not assumptions.

### Retention and the no-loss requirement

A persisted cursor is necessary but **not sufficient** after downtime beyond source history. SDF docs report hosted Horizon truncation to one year starting Aug2024; self-managed retention is configurable, with default HISTORY_RETENTION_COUNT=0 retaining ingested history [providers](https://developers.stellar.org/docs/data/apis/horizon/providers), [official ingestion source](https://github.com/stellar/stellar-docs/blob/main/docs/data/apis/horizon/admin-guide/ingestion.mdx). These are documentation facts, not a live API guarantee.

Before enabling purchases, require a specified historical recovery source covering every receiver ledger since a verified bootstrap boundary, plus a tested gap-fill procedure. Options include an appropriately retained provider or filtered self-managed Horizon with retained history/backups and historical reingestion. Historical ingestion is itself subject to retention; account/asset filtering reduces storage, not necessarily to an amount suitable for this shared VPS [ingestion filtering](https://github.com/stellar/stellar-docs/blob/main/docs/data/apis/horizon/admin-guide/ingestion-filtering.mdx). Do not provision it here or promise it fits72GB/freeRAM.

Bootstrap from the receiver's verified creation/earliest relevant ledger, not from 'now'. Store provider/network identity, retained range and bootstrap evidence. Persist every classified received observation or ignored-operation outcome before advancing its cursor. Detect a cursor older than available history, source discontinuity, receiver change or incompatible network epoch; stop automatic credits/instructions, retain the cursor and alert. Restore from the approved historical source, then resume monotonically. Never skip to current time, silently switch endpoints or mark the gap complete.

Testnet resets erase network state [network reset documentation](https://developers.stellar.org/docs/networks#testnet-and-futurenet-data-reset). Track a declared network epoch/source identity and reconcile any reset before resuming; network passphrase alone is not an epoch identifier. Retain local observations/credits/audit across resets. If a deposit happened while every observer/archive was down and upstream history is gone, no application algorithm can reconstruct it from a cursor alone. **Until historical recovery is specified/proven, unconditional 'no confirmed payment lost' is an unmet readiness gate, not a promise this plan makes.** Do not relax that criterion without the owner.

## 4. Detector architecture and transaction boundary

Propose a dedicated NestJS application-context worker process, reusing ports/adapters and the testnet-only configuration; no public HTTP listener. Supervision restarts it with bounded exponential backoff/jitter and health/lag metrics. Do not run a polling interval independently inside every web replica.

One dedicated PostgreSQL session owns a receiver/network-specific advisory lock for the worker lifetime. Run its credit/cursor UOW transactions on that **same live connection**, not unrelated pool transactions. Connection loss releases leadership and rolls back its in-flight transaction; terminate/reacquire before further work. Never hold a DB transaction open during an HTTP source request.

Fetch bounded ascending pages outside a transaction; apply each operation in order. Store the cursor after each committed classification, not merely after fetching a page. Lock the cursor row and verify its expected predecessor; obsolete work cannot move it backward or skip intervening observations. A second worker that cannot acquire leadership waits without processing. Database uniqueness remains the safety barrier even under leadership/retry faults.

For one qualifying operation, one actual transaction must:

1. Lock/validate the cursor/predecessor and insert-or-find immutable observation by canonical source operation key.
2. Validate source success/destination/asset/memo/amount from retained evidence, resolving user only through its stable memo mapping.
3. Obtain the **same existing account/user lock** used by legacy balance operations before touching the canonical balance. Reuse its actual locking contract, not a similarly named independent mutex.
4. Insert the unique purchase provenance entry under chosen owner-approved ledger design; increment canonical balance only if that unique insertion succeeds. All writes share this transaction/session.
5. Append audit/status and advance the operation cursor atomically; commit.

For review/ignored/duplicate operations, atomically persist the relevant classification/observation/audit and cursor without a new balance increment. A malformed/unverifiable source payload is not a business rejection: keep the cursor and retry/alert until it can be classified safely. A crash before commit rolls back all changes; a crash after commit replays into the uniqueness barrier. A page containing several operations sharing a memo or transaction is still processed operation-by-operation.

Admin resolution locks that same observation and user, checks expected review revision/state, and invokes the same purchase UOW credit path. It cannot run a second ad hoc balance update or choose a client-supplied amount. Keep lock order explicit across worker/admin/legacy integration and test both interleavings. No changes to private creditLegacy behavior are implied by defining a new UOW.

## 5. Proposed additive schema — conditional on choice A

Next migration number follows Freighter0008; reserve no number until upstream merges are reconciled. No migration file is created by this planning task.

| New table | Important constraints / retained data |
| --- | --- |
| coin_payment_memos | userFK/unique user, unique memo type+value, numeric64-safe storage/canonical text, receiver/network context, immutable assignment/tombstone |
| coin_deposit_cursors | unique receiver+source+network epoch, paging token as opaque string, last ledger/hash, bootstrap/retained-range evidence, expected revision |
| coin_deposit_observations | unique epoch+canonical operation ID (or canonical txhash+operation index); tx/ledger/source/destination/asset/delivered integer units, memo, immutable verification evidence, classification/status |
| user_coin_purchase_entries | unique observationFK, userFK, exact integer coin amount, origin/admin decision reference; **not a fabricated legacy pet/claim** |
| coin_deposit_reviews | one active resolution per observation, expected revision/state, assigned user if known, reason, refund reservation/external reference |
| coin_deposit_audit_events | append-only actor/action/reason/before-after revision/references; no cascading deletion or secret payload |

Reuse existing user_coin_balances unchanged and serialize both legacy import and purchase increments. Do not make pet_id nullable, change legacy uniqueness or extend its FK meanings under choiceA. ChoiceB requires a separately reviewed variant/check-constraint/reader design and compatibility analysis instead of these sibling-entry assumptions.

Uniqueness belongs in PostgreSQL, not only cache/process memory. Use restrictive references and append-only event history; state transitions may update an observation/review status, but nothing is deleted. Large source amounts are retained exactly even when they cannot fit the existing balance type. Never round them to fit.

## 6. Flows and administrative resolution

| Flow | Durable result |
| --- | --- |
| Normal payment | Verified observation + one purchase entry + one canonical increment + audit + cursor, same transaction |
| Duplicate/reordered delivery | Existing operation identity; zero new entry/increment; cursor predecessor/monotonic checks prevent skip/regression |
| Crash mid-credit | All UOW writes roll back or all commit; replay cannot double credit |
| Missing/unknown/wrong memo type | Review observation, no credit; later mapping creation does not automatically assign an old unknown payment |
| Wrong asset / issuer | Review, no automatic or manual conversion into CircleUSDC coins |
| Fraction / below minimum / overflow | Entire payment in review with exact amount; no truncation or partial credit |
| Source unavailable | Backoff/health alert, no cursor advance; on recovery verify retained continuity before resume |
| History gap / testnet reset | Stop automatic processing/instructions, retain state, mandatory verified backfill/epoch reconciliation |
| Receiver/trustline not ready | Instructions unavailable, owner action required; no signing key or automatic trustline transaction |

Admin-only means current server-side admin/super_admin guards and CSRF/Origin/session controls, not just hiding a button. Require bounded paginated filters and audit for all resolutions. Membership/roles are freshly checked; do not reuse a stale client role.

- **Credit:** choose an existing eligible account, reason and expected revision; amount derives from the verified deposit and policy. One unique entry/terminal resolution wins across worker/admin/retries. A missing or unknown memo requires deliberate attribution, not sender-address inference.
- **Refund externally:** reserve the observation for refund in the database **before** owner signing; automatic/manual credit then refuses it. Owner performs the network transfer outside the backend; admin later records public transaction reference and reason. No private key, signing endpoint or automatic transfer. If the owner refunds outside this coordination protocol, the database cannot magically observe intent atomically; require reconciliation before credit.
- **Discard:** terminal reviewed decision with reason and evidence retained. A duplicate delivery cannot resurrect it.

Do not mark a credited deposit refunded through a review action without a separately designed balance adjustment policy; this scope does not invent coin debits/redemption. Fraud/typo claims remain auditable cases rather than destructive edits.

## 7. UI, flags and late payments

Add account “Comprar monedas” with separate copy buttons for public receiver and memo, visible memo type, mandatory-memo/testnet warnings and exchange-style withdrawal instructions. Explain that an exchange must support this network/memo; actual testnet testing uses wallets, **not an assumed Binance testnet withdrawal facility**.

Proposed Spanish copy: “Solo testnet: no envíes fondos de mainnet.” / “El memo es obligatorio. Copiá la dirección y el memo completos.” / “Las monedas son saldo de la tienda, no son reembolsables ni canjeables por USDC.” Preserve the distinction between nonredeemable shop coins and owner-operated exceptional payment refunds before credit.

Show awaiting-transfer (not proof a payment exists), detected/pending-review and credited statuses with exact amounts and public transaction references. Unknown-memo payments are not exposed to arbitrary accounts; admin assignment controls visibility. Return the account coin counter to the home only under the frontend purchase gate, reading canonical user balance and retaining Freighter owner/epoch fences. Do not show a purchased balance for guests or debit free care.

Use existing tokens: --primario#3dff8a, --estado-advertencia#ffcc33, --estado-error#f500dc, --tarjeta#ffffff, --superficie#eef6f0. Reuse account/admin patterns and accessible status/copy feedback; no cat/landing redesign.

Proposed backend COIN_PURCHASE_ENABLED defaultsfalse; COIN_DEPOSIT_OBSERVER_ENABLED also defaultsfalse before initial rollout but must remain enabled for the post-disable drain once addresses have been shown. Receiver public key, expected testnet issuer and network epoch/source identity are separate validated settings. Reserve COIN_USDC_ISSUER_MAINNET as configuration-only for a future separately authorized environment; do not invent its value or select it in this testnet implementation. The testnet path rejects a mainnet network/issuer selection even if that future field is populated.

Proposed frontend NEXT_PUBLIC_COIN_PURCHASE_ENABLED defaultsfalse and is fixed at build time, not changed by editing a running environment [Next environment guide](https://nextjs.org/docs/app/guides/environment-variables#bundling-environment-variables-for-the-browser). Validate testnet/issuer/public receiver and source history readiness before enabling backend instructions/automatic credits, then publish the matching enabled frontend build.

Disable frontend first, then new backend purchase issuance/automatic-credit behavior. Once a public receiver/memo has been shown, users can still send on-chain after UI shutdown. A separately supervised observe/review drain must keep those addresses covered, or a concrete retained-history backfill must cover the shutdown; backend flagoff is not permission to abandon them. Explicit observer lifecycle is part of the enable/disable runbook. No new flag implicitly authorizes chain transfers or hides unrecorded late deposits.

## 8. Ten-times load and failure acceptance

Bound page size, memory and retry queue; process one cursor serially rather than unconstrained Promise.all crediting. Measure source requests, lag, operation rate, transaction latency, lock waits, review age and last retained-source head. Let measured sustained capacity be μ and incoming rate λ; at10× target require μ>10λ and verify catch-up time against backlog/(μ−10λ). These are measurement conditions, not throughput claims.

On rate limiting/outage honor retry policy without advancing the cursor. Detect a stalled worker even while the web API is healthy. On DB failure retain/retry the same operation; no source acknowledgement can outrun durable credit/classification. Unique constraints plus predecessor-checked cursor, shared account lock and one-session leadership cover repeated events/restart/admin races. An archive/retention failure is not solved by increasing workers.

## 9. Future RED → GREEN matrix

These are proposed tests; **none ran in this plan task**. Use the public detector/service/admin interfaces, isolated PostgreSQL per run, exact returned state/errors, balance/entry/audit/cursor invariants and no rejected-input mutation. Preserve existing legacy import and care tests unchanged.

| Rule / input | Required outcome |
| --- | --- |
| Valid2.0000000CircleUSDC + valid memo | Exactly2coins, one observation/entry/audit, cursor advances atomically |
| Same operation delivered twice/restart after commit | Zero second credit; entry/count/balance stable |
| Two qualifying ops in one tx/memo | Two operation identities, exact sum, not deduped by txhash alone |
| Failed tx / outgoing / self payment | No purchase credit; durable ignored classification/cursor as designed |
| Path payment source differs from delivery | Credit destinationCircleasset/delivered integer amount only |
| Wrong code/issuer, XLM, missing/unknown/text-for-ID memo | Review, no balance/credit; exact evidence retained |
| Fraction0.5/2.5, below minimum, integer-bound overflow | No rounding/increment; exact amount/reason in review |
| Memo collisions/reassignment/deleted user/late mapping | No wrong-account automatic credit; old mapping/history retained |
| Crash before each UOW write/commit, DB disconnect | Either all effects or none; replay exactly once |
| Two detector processes / lock connection loss | One active leader; rollback/reacquire, no cursor skip or double credit |
| Worker/admin credit race + two admin resolutions | One terminal resolution and unique purchase entry |
| Refund reservation then duplicate/credit attempt | No later credit; owner external reference audited, no network signing |
| Existing legacy import before/after purchase | Same canonical balance sum; unique legacy import intact, no fabricated pet claim |
| Source outage, retention gap, reset, receiver config change | No cursor=now shortcut; explicit stopped state/backfill prerequisite |
| Flags off/direct API/nonadmin/guest/stale owner | Denied mutation and unchanged balance/entries/audit/cursor as applicable |
| UI/account/home/copy/status/errors | Required copy/gates, canonical account balance, free care/epochs preserved |
|10× deterministic backlog/repeated pages | Bounded memory, complete ordered catch-up, no drops/duplicates |

Future E2E: agent creates isolated DB users/memos and two throwaway testnet sender identities only inside a dedicated volatile signer runner; no secret is printed, committed, retained in evidence or passed through chat/model. This is a **future test proposal**, not account creation now. The owner alone controls the receiver and manually establishes its CircleUSDC trustline, obtains testnetUSDC from the Circle faucet and transfers to public sender addresses as needed [Circle quickstart](https://developers.circle.com/stablecoins/quickstart-transfer-usdc-stellar). Friendbot supplies testnetXLM, notUSDC. Agent-owned ephemeral sender signing is separate from the backend, which never receives receiver keys.

Exercise normal integer deposit, replay/restart, fractional/missingmemo and successful wrong-assetXLM, then admin resolution through the real isolated API/UI. Wrong-issuer source records have deterministic adapter tests; a real wrong-issuer delivery needs an explicitly authorized separate receiver trustline, not a silent change to treasury setup. Owner holds any real extension/treasury secrets. Clean only owned throwaway resources after preserving public IDs/source/build evidence. Physical/testnet/mainnet acceptance is not inferred from fixtures.

## 10. Future files, integration and delivery gates

Proposed source areas: new backend coin-purchases module with source adapter, worker entry, configuration, detector/admin/account services, ports and one transaction-bound UOW; additive Drizzle definitions/migrations after0008; focused database/HTTP/worker tests. Exact entry schema depends on section0; no migration is authorized now.

Frontend: account purchase panel/services, admin review page under existing role guards, guarded home coin counter and related tests/styles. Preserve same-origin proxy/auth contracts. Known intersections: Freighter canonical balance/legacy import/account/session epochs; A2 and B1 both touch PetHomeStage/viewer area, so isolate coin-counter presentation and never change cat models/poses/care. No writes to those task worktrees.

If upstream Freighter changes/merges, incorporate it by **merge commit**, never rebase, then redo affected design/checks against that base. No push/merge/production/mainnet. Implementation eventually has stored-money/security/concurrency risk and needs independent verification plus applicable native review under owner policy; this documentation is not that approval.

**Readiness gates:** owner ledger choice; approved minimum/fraction/unknownmemo policies; verified historical recovery/provider capacity and bootstrap; owner receiver/trustline/testnetUSDC; implementation authorization. Until then this remains a reviewable, committed **proposal**, not an executable payment system or an unconditional no-loss guarantee.
