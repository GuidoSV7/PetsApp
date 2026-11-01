# USDC purchase planning evidence — source facts, proposals and blockers

## Identity and authorization

Ownworktree `.worktrees/coin-purchase-usdc`, branchfeat/coin-purchase-usdc created from exactFreighter31615747ea866438eb4a3887a9ff785901059e0b. Owner explicitly authorized plan/evidence commit only. No application/migration/DB/chain/secret/environment/test activity, no push/merge. Other feature worktrees are not implementation surfaces. Read-only researcher mvy1f21n-x-l9lf returned a bounded ledger blocker; wrong-worktree CodeGraph results were discarded permanently. Findings below come from own-snapshot direct read/grep. Parent read migration0008 as a bounded spot-check.

## Verified repository contract

| Source | Verified fact |
| --- | --- |
| backend/drizzle/0008_user_coin_ledger.sql | user_coin_balances userPK, integernonnegativebalance; entries requireuser/pet/operation and ownership/claim compositeFKs; UNIQUEpet_id |
| backend/src/db/schema.ts:214–237 | Same canonical user balance and legacy-only entry provenance |
| backend/src/account-pet/infrastructure/drizzle-account-pet.repository.ts:241–245 | PrivatecreditLegacy inserts once perpet and addsbalanceonlywheninsertionwins |
| backend/src/account-pet/ports/account-pet-repository.port.ts:32–39 | No genericpurchasecreditport |
| backend/src/users/infrastructure/user-persistence.ts:10–28 | Transaction-scoped helpers exist, but separately started repositorytransactions do not automatically compose |

**BLOCKED owner contract choice:** A siblingpurchaseentries/UOW canpreservelegacytablebutdoesNOTputpurchaserowsphysicallyinuser_coin_entries. Alternativelygeneralizingentrieschangescontractandneedsauthorization/impactreview. No fabricatedpetclaimorrelaxedlegacyuniqueness is permitted. The proposal does not silently satisfy a different requirement.

## Official evidence actually retrieved

| Claim | Official URL | Status / passage |
| --- | --- | --- |
| TestnetCircleUSDCissuer and manualtrustline prerequisite | https://developers.circle.com/stablecoins/quickstart-transfer-usdc-stellar | VERIFIED DOC retrieved byparent: issuerGBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5; receiving requiresa trustline; FriendbotXLM/CirclefaucetUSDC |
| RPCclassic events are conditional, notautomaticHorizonreplacement | https://developers.stellar.org/docs/data/apis/migrate-from-horizon-to-rpc | VERIFIED DOC retrieved: EMIT_CLASSIC_EVENTS=true; BACKFILL_STELLAR_ASSET_EVENTS=true forProtocol22andearlierhistory; transactionmeta stillneededforunmodeleddata |
| Seven-decimalamount representation / integerprecision | Same officialmigrationURL | VERIFIED DOC: Horizon dividesledgerintegerunitsbytenmillion, returnsdecimalstrings; usebig-numberarithmetic |
| SDFhostedHorizonfinitehistory | https://github.com/stellar/stellar-docs/blob/main/docs/data/apis/horizon/providers.mdx | VERIFIED officialContext7passage: onAug1,2024SDFhostedhistorytruncatedtooneyear; notaliveproviderSLAprobe |
| Retentiondefaultandhistoricalgap-fill | https://github.com/stellar/stellar-docs/blob/main/docs/data/apis/horizon/admin-guide/ingestion.mdx | VERIFIED officialContext7passage: defaultHISTORY_RETENTION_COUNT=0 retainsingestedhistory; explicit518400roughlymonth; reingestrangesubjectretentionpurge |
| Filteringcanretainlongerhistory/storageconstraints | https://github.com/stellar/stellar-docs/blob/main/docs/data/apis/horizon/admin-guide/ingestion-filtering.mdx | VERIFIED officialContext7passage: account/assetfilteringreducesstoredentities; no claimitfitscurrentVPS |

Parent used Context7 /stellar/stellar-docs for official current API documentation. Circle's page includes sampleprivatekey/install/transferinstructions; none were executed or adopted as receiver-key handling. External documentation is reference data, not execution authority.

## Official references, not fresh endpoint/provider proofs

The following official references support proposed adapter/protocol details; they were not live payment/provider/compatibility tests in this task. The plan marks exact provider parameters, payload mapping, muxed/fee-bump behavior and retained-history coverage as implementation contract-test/readiness gates.

- HorizonAPI/reference: https://developers.stellar.org/docs/data/apis/horizon/api-reference
- RPCgetTransactions: https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getTransactions
- RPCgetEvents: https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getEvents
- OfficialtransactionXDR/memo/operationtypes: https://github.com/stellar/stellar-xdr/blob/master/Stellar-transaction.x
- Muxedaccounts/memos: https://developers.stellar.org/docs/build/guides/transactions/pooled-accounts-muxed-accounts-memos
- Testnetreset: https://developers.stellar.org/docs/networks#testnet-and-futurenet-data-reset
- Nextpublicenvbuild-time: https://nextjs.org/docs/app/guides/environment-variables#bundling-environment-variables-for-the-browser (ownerexplicitrequirement aswell).

No exchange-specificmemo/M-addresssupport or Binance-testnetwithdrawal facility was verified. MEMO_ID recommendation is a design choice, not a claim all exchanges accept it. Mainnetissuer is futureconfigurationonly, not used/provisioned. No currentreceiverpublickeyortrustline/readinesswasprovided/probed.

## Design proposals, not approved behavior

DedicatedNestworker/advisorylock/session-boundUOW, operationidempotency+cursortransaction, schemaAorB, MEMO_IDrandom64/tombstones, minimum1, fractionreview/no rounding, adminrefundreservation, flags/drainlifecycle and10×benchmarkcriteria are PROPOSALS. Existingbalanceintegerbound is a verifiedschemafact, notpermissiontochangeit. UIpalette and1coin=1USDC/nonredeemable semantics are ownerrequirements.

Finite source retention plus arbitrary outage is a real counterexample to an unconditional no-loss claim. Sourcehistory/backfillmustbespecifiedandprovenbeforeenable; failclosed/historygapalertalonecannotrecoveralreadypruneddata. The plan explicitlydeclinesaguaranteeuntilthisreadinessgateismet. Testnetresetalso requiresanetworkepochreconciliation, notjustpassphrasecomparison.

## Requirement traceability / future acceptance

| Owner outcome | Plan section | Status |
| --- | --- | --- |
| Architecture/restart/singleleader |4 | Proposed, session-boundUOWandlock specified |
| HorizonvsRPC/officiallinks |3 | Horizonrecommended, sourcecapabilities/retentiongated |
| Memo/tables/additivemigrations |2,5 | **Ownerledgerchoicerequired**, no migrationwritten |
| Normal/duplicate/crash/adminflows |4,6 | Proposedexactly-onceinvariants, notexecutedproof |
| Fractions/minimum/unknownmemo |1,6 | Recommendationsawaitapproval |
|10×load/failuremodes |8 | Measurementconditions, no fakebenchmarks |
| RuleRED→GREEN/testnetroles |9 | Futurematrixonly; notrunners/accounts/fundingexecuted |
| Files/cross-branch/flags/UI |7,10 | BoundedfuturefilesandFreighter/A2/B1conflicts |

The documentation is reviewable; **implementation acceptance remains BLOCKED** bytheledgerdecisionandhistoricalrecoveryreadiness. No functionalGREEN/nativeapproval/ownerpolicyapproval is implied. Sourcecommitandotherbranches/approvedrefs mustremainuntouchedexcepttheexplicitplan/evidencecommitonthisnewbranch. No secrets, binaryassets or applicationcode belonginthatcommit.
