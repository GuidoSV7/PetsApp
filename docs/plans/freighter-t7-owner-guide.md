# T7 — Owner-operated Freighter walkthrough, not an execution record

**T7 remains paused: none of the eleven owner journeys has run.**
Historical feature snapshot: `31615747ea866438eb4a3887a9ff785901059e0b`, branch `feat/freighter-user-pet`, worktree `.worktrees/freighter-user-pet`. Original optional-host preparation commit: `11fdf829122044d55c678ff61b709e6a752014dd` ([historical HOST evidence](freighter-host-preparation-evidence.md)). The owner subsequently renamed that setting to BACKEND_LISTEN_HOST; generic HOST is now ignored ([rename evidence](freighter-listen-host-rename-evidence.md)). The owner separately authorized the optional BACKEND_LISTEN_HOST bootstrap change and its backend tests/build; that is the only application delta. T1–T6 auth/ledger behavior and historical approvals are unchanged. Preparation tests use disposable fixtures/probe listeners, not a running T7 environment. No T7 server/tunnel/browser session, run secret, wallet account, Friendbot request or Stellar transaction was created.

## 1. Stop conditions before arranging a session

| Prerequisite | Current status / required future action |
| --- | --- |
| Owner available at PC Chrome with real extension | Not scheduled; this guide is for later use |
| Owner's existing SSH alias | Owner supplies locally; no host/IP/credential is invented here |
| Backend listens only on VPS loopback | Optional BACKEND_LISTEN_HOST is implemented/tested; future run must set BACKEND_LISTEN_HOST=127.0.0.1 and verify actual sockets; standalone frontend separately sets HOSTNAME=127.0.0.1 |
| Auth signer/HMAC/JWT credentials | Future per-run ephemeral generation/injection authorized, only after scheduling; no production credentials or secret output |
| Isolated database/fixtures | Future pgtest-db per run, no production connection |
| Valid testnet-only configuration | Future check; no flags changed today |
| Pinned extension compatibility with private localhost | UNKNOWN until the real owner session |
| Optional threshold supplement on separate C | Not a T7 blocker. Never modify B; skip/pending unless owner can safely co-sign C restoration |
| T8 acceptance | Owner-selected basis: six native approvals, maintainer R2, exact54ddaf omission and new blind final-state security review; no missing-snapshot reconstruction |

Future launch uses backend `BACKEND_LISTEN_HOST=127.0.0.1`, frontend standalone `HOSTNAME=127.0.0.1`. With BACKEND_LISTEN_HOST absent, backend still calls app.listen(port) exactly as before; no deployed configuration was changed. PORT alone does not select a private bind. At session preflight verify both listeners and the test proxy are loopback-only and owned, plus isolated DB transport; source/unit proof does not prove actual future process configuration. No host-wide firewall/Docker changes or public exposure. Do not start this environment before the owner schedules T7.

## 2. Private URL and exact tunnel recipe

Proposed future frontend VPS endpoint: `127.0.0.1:3080`; backend: `127.0.0.1:3081`, with the explicit bind settings above. The journey8 test proxy proposes `127.0.0.1:3082`. These ports are within3002–3112 but have **not** been reserved or tested free today. At execution, coordinate them with other agents and the `exclusive e2e-petsapp` lock. If either port changes, update all dependent origins/build values and the tunnel together.

On the owner's PC, use the existing SSH destination already configured for this VPS. The single missing input is its alias; no private key is pasted into the command or chat:

```sh
# Future owner action on PC only; not executed by the agent.
# Set OWNER_SSH_ALIAS to the owner's existing SSH config alias locally.
ssh -N -T -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:3080:127.0.0.1:3080 "$OWNER_SSH_ALIAS"
```

The owner opens **`http://localhost:3080`**, not a public VPS URL, `0.0.0.0`, the SSH alias or backend port. Keep the tunnel terminal open. No `-g`, wildcard local bind or public remote forwarding is allowed. The destination alias must be supplied before this is an executable recipe; it is deliberately not guessed.

### Matching application values

| Value | Proposed future isolated setting | Source / caution |
| --- | --- | --- |
| Backend runtime STELLAR_AUTH_ENABLED | `true` | stellar-auth.config.ts; otherwise feature stays off |
| Backend runtime ACCOUNT_PET_ENABLED | `true` | account-pet.config.ts; independent gate |
| STELLAR_NETWORK_PASSPHRASE | `Test SDF Network ; September 2015` | Verified consumed config name; all other network passphrases are rejected |
| STELLAR_HORIZON_URL | `https://horizon-testnet.stellar.org` | Testnet only |
| STELLAR_HOME_DOMAIN / STELLAR_WEB_AUTH_DOMAIN | `localhost` | Source regex rejects colon/port, scheme and path |
| CORS_ORIGIN | `http://localhost:3080` | Verified cors-origins.util.ts allowlist and CSRF origin source; do not rely on defaults for port3000 |
| Backend PORT / BACKEND_LISTEN_HOST | `3081` / `127.0.0.1` | BACKEND_LISTEN_HOST is consumed only when defined; absent retains previous listen overload |
| Frontend standalone HOSTNAME / PORT | `127.0.0.1` / `3080` | Runtime server binding, separate from NEXT_PUBLIC build variables |
| Journey8 isolated test proxy | `127.0.0.1:3082` | Future harness only, no application change; check availability too |
| Frontend public NEXT_PUBLIC_ACCOUNT_PET_ENABLED | literal `true` | Fixed during that isolated build |
| NEXT_PUBLIC_STELLAR_HOME_DOMAIN / NEXT_PUBLIC_STELLAR_WEB_AUTH_DOMAIN | `localhost` | Same hostname-only validation as backend |
| NEXT_PUBLIC_STELLAR_AUTH_SERVER_ACCOUNT | Public key of the isolated auth signer | Public counterpart only, not a secret seed |
| NEXT_PUBLIC_PETSAPP_API_URL | Unset | Retain same-origin `/petsapp-api` |
| Runtime PETSAPP_API_INTERNAL_URL | `http://127.0.0.1:3082` when using the loss proxy | Next proxy→test proxy→backend3081; transparent except one explicitly armed journey8 response. Direct runs without it use3081 |
| NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY | One configured build and one absent-key build | Distinct build identities, not a runtime toggle |
| Backend NODE_ENV / PROD | Nonproduction according to actual cookie policy | Do not claim URL alone controls Secure cookies |

This table is a configuration proposal, **not an environment file to source or a claim that every launch prerequisite exists**. The parent read stellar-auth.config.ts and cors-origins.util.ts to verify the passphrase/CORS variable names. Actual future process configuration and binding still require the preflight; no values were read from secret environment files.

### Per-run secrets — authorized for the scheduled run only

After the owner schedules T7, an isolated local bootstrap runner generates a fresh testnet SEP-10 keypair plus independent cryptographically random HMAC and JWT secrets (at least32characters; propose48random bytes each). It injects STELLAR_AUTH_SIGNING_SECRET, STELLAR_AUTH_HMAC_SECRET and JWT_SECRET directly into owned backend child-process environment, without printing values, placing them in command arguments, sourcing production env, or writing a committed/env/log artifact. Only the public signer key enters the frontend build. No keypair or secret was generated now.

Keep secret generation/injection inside the runner, outside model/chat, with tracing/core dumps disabled and no env/body dumps. Do not copy private material into screenshots, shell history or fixtures/evidence. Terminate the runner/children and discard memory references at cleanup; avoid persistent secret files (any unavoidable approved run-only file needs restrictive permissions and deletion). Do not claim JavaScript garbage collection securely erases immutable strings. Production credentials are never touched. The auth signer is separate from A/B/C and treasury; it need not be funded to sign off-chain challenges.

### Cookies and domain distinctions

For the proposed nonproduction backend, source uses host-only `petsapp_session`, HttpOnly, SameSite=Lax, Path=/, Secure=false. Browser-binding flow cookies `petsapp_stellar_login` / `_link` have a300000ms lifetime. These are application cookies, not cookies required by SEP-10 itself. Production naming/Secure policy differs and must not be borrowed just to make a local test pass.

The Next proxy forwards Origin/cookies and preserves separate Set-Cookie headers; Axios sends credentials. Verify attributes/presence in DevTools without recording their values. Keep browser host `localhost` consistent; do not alternate with127.0.0.1 during a flow.

If real Freighter/Chrome rejects this private HTTP flow, stop and retain the failure. Alternative proposal: owner-trusted HTTPS for `localhost`, still transported privately over SSH. Then browser origin/CORS become `https://localhost:3080`; challenge domains remain `localhost`. The proxy/bind/TLS arrangement and cookie policy require a separate configuration plan: backend Secure derives from environment, not automatically from URL. Do not use an untrusted-certificate bypass, public domain or production deployment. Current Freighter documentation resolves to Varial-branded content, so it does not prove pinned freighter-api6.0.0 localhost compatibility.

## 3. Accounts and fixtures — only after a future execution grant

### Required client wallets: A and B; C is optional

| Identity | Owner creates/stores | Funding / use |
| --- | --- | --- |
| A | One client identity inside the owner's extension | **Never fund with Friendbot.** Must remain nonexistent on testnet; wallet-only flows; may co-sign optional C only if owner can safely restore it |
| B | Second client identity inside the owner's extension | B is later funded by owner-operated Friendbot for email-linked member/existing-account coverage. Never change its thresholds/signers for the optional supplement |

A and B suffice for all required journeys. Optional third disposable C is created/funded only in the scheduled session for the threshold supplement; it is not a new requirement for completing T7. Server-side journeys use fresh isolated fixtures. Reuse A across fixtures without changing its on-chain nonexistent state. Reuse B across separate member/admin fixtures only with explicit database preconditions. These are not production users. Test email identities/passwords exist solely in the isolated fixture system; credentials are delivered privately to the owner, never logged or requested in chat.

The source accepts a genuine Horizon404 as nonexistent account authentication with master weight1/threshold1; other Horizon failures must return503, not be treated as nonexistent success. For an existing account it uses `max(1, high_threshold)`, positive Ed25519 signer weights, excluding the server signer. This is why both account states matter [SEP-10](https://raw.githubusercontent.com/stellar/stellar-protocol/master/ecosystem/sep-0010.md).

### Isolated fixture inventory

- **F-A-new:** A has no user/identity in this isolated DB; one recognizable, unowned local guest exists.
- **F-A-continuation:** preserve the user/pet created in journey1 for journeys2–3.
- **F-B-member:** isolated email member, no wallet identity yet; fresh login; B not linked elsewhere in this DB.
- **F-conflict-account / F-conflict-device:** distinct fresh fixtures, A already owns one pet and a different unowned device guest is recognized. Proposed balances: existing37 + guest5.
- **F-pending / F-response-lost:** fresh conflicts with durable operation identity and the same37+5 arrangement; do not reuse a completed operation as pending.
- **F-admin:** isolated email admin, wallet-only A visible in customer records. A separate fixture links B while member, then represents the privileged-role rejection case using authorized isolated fixture setup.
- **F-Pollar-on / F-Pollar-off:** same source, different identified builds and isolated equivalent fixtures.

Future fixture creation uses the authorized isolated test setup, not production data or fabricated application authentication. A new pgtest-db belongs to the run and is dropped afterward. Journeys1–3 intentionally share state; other journeys explicitly reset into independent throwaway fixtures. No fixed shared database name.

## 4. The eleven plan-section13 journeys

For every journey, the agent later records source/config/lock/build identity, fixture alias, expected state, screenshot names and actual outcomes. Database checks below are **future, bounded, read-only checks on the isolated database only**. No checks were run today. The home coin counter may remain hidden by the free-care feature; use the canonical API/database proof, not a nonexistent counter.

### 1 — “Invitado reconocible + wallet nueva”

**Account/state:** A remains unfunded/nonexistent on testnet; F-A-new; guest recognized, no existing identity.

**Owner:** open the private URL; select Freighter/testnet; connect A; read guest-claim consent; sign the authentication challenge in the real extension. This is not an on-chain payment or a seed export. Confirm arrival at the account/home with the intended pet.

**Screenshots:** `j01-consent.png`, `j01-account.png` (public address may be redacted consistently).

**Future agent checks:** exactly one wallet identity/user/current ownership, wallet-only nullable credentials, guest state preserved, canonical balance equals the single legacy import, one per-pet legacy credit, completed operation. Correlate sanitized challenge-issued/verified and claim completion logs. No duplicate import on the subsequent GET.

### 2 — “Alimentar/renombrar gratis, recargar y confirmar persistencia.”

**Account/state:** continue A/F-A-continuation, same owner/pet/session.

**Owner:** feed for free, rename through the existing UI, reload. No second login if session remains valid.

**Screenshot:** `j02-persistence.png` showing name/care state after reload.

**Future agent checks:** the same user/current pet, persisted name and care state, unchanged canonical coin balance/legacy-entry count; no debit or new claim. Existing care success logs only; no auth/claim replay caused by reload.

### 3 — “Borrar datos del sitio/cerrar sesión sin tocar almacenamiento de la extensión”

**Account/state:** same on-chain A, existing isolated wallet identity and pet from1–2.

**Owner:** clear only this app's site data or log out, without clearing the extension's wallet storage. Reconnect A on testnet and sign a new challenge.

**Screenshot:** `j03-reentry.png`, same pet/account after re-entry.

**Future agent checks:** same user/identity/pet/balance; zero second legacy credit or new pet; fresh session established. Do not screenshot localStorage/cookie/token values. If two already-authorized profiles/devices are available, repeat with the same A configured privately by the owner; PetsApp and the agent never transfer its secret.

### 4 — “Usuario email”

**Account/state:** F-B-member with B not linked; B may be funded for later existing-account tests.

**Owner:** password-login freshly, visit `/account`, choose “Vincular Freighter”, connect/sign B; log out; enter through B; log out and enter through password again.

**Screenshot:** `j04-linked.png` and successful identity display without credentials.

**Future agent checks:** same member user/pet through both methods, one linked wallet identity, password/email preserved, unchanged balances. Link session age must be **strictly less than300000ms**. Checking a password alone does not refresh the JWT iat; if stale, perform a fresh login rather than bypassing this rule. Reconfirm role on link confirmation.

### 5 — “Conflicto: conservar cuenta”

**Account/state:** F-conflict-account; A owns the account pet; separate recognized unowned guest; balances37/5.

**Owner:** connect/sign A, inspect both choices, choose account once; wait for completion and reload.

**Screenshots:** `j05-dialog.png`, `j05-result.png`.

**Future agent checks:** current pet remains the account pet; the guest is archived and not visible, with full state preserved under approved history semantics; balance42, guest5 imported once even if archived; one operation/choice and one legacy entry for that guest. Repeat reads/reload do not increase42.

### 6 — “En otro fixture aislado, conservar invitado”

**Account/state:** fresh F-conflict-device, not the already-completed journey5 operation.

**Owner:** sign A and choose device guest once; reload after success.

**Screenshot:** `j06-result.png`.

**Future agent checks:** selected guest becomes current; previous pet archived with its full state preserved and no pet selector/list added; balance42 once, not47; current-state fetch returns the actual selected/current pet. No stale owner response replaces it.

### 7 — “Cerrar sin elegir y cortar red antes de enviar elección”

**Account/state:** fresh F-pending conflict.

**Owner:** close with “Ahora no”; revisit; interrupt the network **before** submitting a choice; restore and explicitly retry/select.

**Screenshot:** `j07-pending.png`, then the recovered result.

**Future agent checks:** before choice, pending operation/identity and recognized guest key remain recoverable, no ownership switch, no credit (balance37); no fabricated consent. Retry uses the durable operation ID and one explicit choice; completion credits once to42. A newly adopted/non-owned guest is rejected, never silently claimed.

### 8 — “Cortar respuesta después de enviar una elección”

**Account/state:** fresh F-response-lost; one recorded choice/operation.

**Owner:** submit that choice, experience the deliberately lost response, restore connectivity and retry/re-enter without changing the choice.

**Screenshots:** `j08-pending.png`, `j08-recovered.png`.

**Future agent checks:** establish that the original transaction committed **before** suppressing the response. A generic offline error is not this test. The owner authorizes a **test-only loopback proxy between the Next proxy and backend**, outside application code and production. Arm it once for POST /account/pet/claim-guest with the selected fixture/operation: forward the authenticated choice unchanged, await the backend's complete HTTP200 confirmed-choice response (status=confirmed, matching operation; service transaction already committed), withhold all response bytes, and close the downstream connection. Record only an operation alias/drop counter and committed-status boolean, never bodies/tokens/guest keys. If response/status/operation does not match, forward normally and record that no post-commit drop occurred. Disarm after the one match so status/read/retry traffic passes unchanged, preserving Origin, cookies and response headers on all forwarded traffic. Verify committed status/balance independently before recovery; a cut before the backend completes or a generic offline error does not count. This proxy is a scheduled-run harness, not implemented or started now. Recovery first reads operation status, resubmits only the same choice if still pending, then retires only the matching guest key after confirmed success and reads current pet/state. Verify42/one credit/one completed choice despite retries; stale owner/epoch responses are ignored. A409 decision mismatch requires explicit re-resolution, not changing a committed choice.

### 9 — “Cancelar firma, red incorrecta y desafío vencido”

**Account/state:** logged-out A; clean browser-flow fixture before each subcase.

**Owner:** reject a signature; attempt with a non-testnet selection (do not sign/send mainnet), switch back to testnet; separately let the challenge expire (at least300000ms, respecting the actual timebounds) before signing/confirming.

**Screenshot:** `j09-rejections.png` or one named screenshot per subcase.

**Future agent checks:** no authenticated session, user/identity/claim/credit or ownership mutation on each rejection; exact public error and sanitized rejection reason from current code, not a guessed message. No consumed/replayed challenge authorizes a later action. A Horizon outage is503, not accepted nonexistent-account fallback.

### 10 — “Admin por email”

**Account/state:** F-admin; isolated email admin and wallet-only A customer; separate linked-then-admin B fixture for role rejection.

**Owner:** email-login admin; list/search A; edit allowed name/country fields; check wallet-only display does not require fake email/password. In the separate fixture, try wallet login for privileged B and observe rejection.

**Screenshot:** `j10-admin.png`, with unrelated personal data absent/redacted.

**Future agent checks:** nullable credentials stay nullable, only intended profile fields change, no empty email is sent as a side effect, roles/auth/identity/balance unchanged by profile edits; member gates deny privileged-role Freighter authentication/linking as implemented. Production identities are never fixtures.

### 11 — “Repetir la entrada Freighter con Pollar configurado y sin él”

**Account/state:** A and equivalent isolated fixtures; two distinct build identities.

**Owner:** connect/sign/re-enter once on the configured-Pollar build, once on the absent-key build.

**Screenshots:** `j11-with.png`, `j11-without.png`.

**Future agent checks:** both use the real Freighter path, same ownership/session/claim invariants, no accidental Pollar dependency, duplicate user or credit. NEXT_PUBLIC changes require a new identified build; never mutate runtime env and count it as a second frontend configuration.

## 5. Optional high-threshold supplement — disposable C only

This is **optional and nonblocking for T7**; real-SDK tests already cover the threshold logic. Never alter B's signers/thresholds. Only after scheduling, the owner may create/fund disposable C if a safe two-signature restoration tool is demonstrably available. No account or transaction is created/prepared/submitted now; all wallet signing is on the owner's PC, no client seed on VPS/chat/agent.

1. On C only, confirm masterWeight1 and low/medium/high1; owner adds A's public Ed25519 signer weight1, retaining adequate reserve/fees. A stays unfunded/nonexistent.
2. Verify C's public signer state and the ability to collect C+A restoration signatures **before** raising high2.
3. On C only set low1/medium1/high2, retaining masterWeight1 and Aweight1; never masterWeight0.
4. Attempt C-only app login: insufficient high-threshold weight must fail; the app does not aggregate client signatures.
5. Restore C high1 with owner co-signatures C+A before removing A; verify state first. Never use B as the experimental account or restoration target.
6. If the owner cannot co-sign safe restoration, do not raise thresholds; record the supplement as pending, without blocking T7 or claiming a pass.

SetOptions uses the high threshold and added signers consume reserve [operations](https://developers.stellar.org/docs/learn/fundamentals/transactions/list-of-operations); SEP-10 high-threshold verification is distinct from merely parsing a challenge [SEP-10](https://raw.githubusercontent.com/stellar/stellar-protocol/master/ecosystem/sep-0010.md), [SDK WebAuth](https://raw.githubusercontent.com/stellar/js-stellar-sdk/master/docs/reference/seps-webauth.md). Friendbot is testnet funding, never a mainnet facility [account creation](https://developers.stellar.org/docs/build/guides/basics/create-account).

## 6. Future evidence and cleanup checklist

Use `git rev-parse --git-path agent-evidence/freighter-user-pet` for logical evidence, because linked-worktree `.git` is a file. Existing historical evidence/authority stays in place. Future run evidence must have source/lock/config/build identity, public testnet account aliases, timestamps and per-journey pass/fail/blocked verdicts. Do not include signed XDR, tokens, cookie values, guest keys, passwords, seeds or unrelated data.

Future agent database checks connect **only** to the run's isolated URL, never `service=...` production connections. Scope SELECTs to fixture IDs and LIMIT; report counts/booleans and expected balances rather than raw personal data. Check identity/role/credential-nullness, claim status and durable choice, current ownership, full pet-state preservation, canonical balance and per-pet ledger-entry counts. Sanitize challenge-issued/rejected/verified and claim success/rejection logs. Do not log request bodies or secret configuration.

Before any future test, confirm free owned ports, normal HOME/toolchain and no competing heavy load. Full suites/builds use heavy; fixed-port browser tests also use exclusive e2e-petsapp. No heavy A2 suite may overlap another heavy load while swap is nearly full.

At future completion/failure: if exercised, restore C thresholds safely first (B never changed); stop only owned app/proxy/tunnel resources; drop only the run's pgtest-db and verify absence. Owner closes the PC tunnel. Stop the run-secret bootstrap and destroy its ephemeral secrets/run-only artifacts without printing them; cleanup includes the test proxy and its armed state. Keep immutable evidence and the T8 distinction; do not delete historical candidate worktrees or advance approved refs as cleanup.

## 7. What this guide does not prove

The eleven journeys are **instructions, not passes**. BACKEND_LISTEN_HOST bootstrap has separate RED→GREEN/backend/independent transport evidence, not proof of a launched T7 environment. Real extension behavior, HTTP/HTTPS localhost compatibility, actual scheduled-run bind/secret lifecycle and deterministic post-commit response loss remain future proof. Optional C restoration can remain pending without blocking T7. The historical frozen-scope union remains unproven, but is no longer the owner's acceptance gate. The new owner-selected basis requires a blind isolated final-state critical-surface security review; no snapshots or54ddaf review are reopened. The code-valid `localhost` domain is not a tested browser guarantee. Current freighter.app pages are Varial-branded and are not evidence of API6 behavior. No additional implementation beyond the separately authorized BACKEND_LISTEN_HOST change, native review, push, merge, production/mainnet action or authorization to execute T7 before scheduling is implied.

See [review coverage](freighter-t7-review-coverage.md) for exact historical outcomes and the owner-omitted cumulative target.
