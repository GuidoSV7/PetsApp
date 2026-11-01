# Optional HOST — preparation evidence, not T7 execution

## Scope and source

Base: `31615747ea866438eb4a3887a9ff785901059e0b`. Owner authorizes only optional backend listener HOST, its tests/docs and preparation reports; no production configuration change. `backend/src/main.ts` keeps `app.listen(port)` when HOST is undefined and calls `app.listen(port, host)` only when defined. Existing PORT fallback, middleware, auth, ledger and T1–T6 approvals remain unchanged. Frontend standalone HOSTNAME is a future run setting, not an application change.

## Observed checks

| Check | Observed result |
| --- | --- |
| RED: new public-bootstrap spec against unchanged main | Exit1: default behavior passed, explicitHOST failed because listen received only[3081] |
| GREEN after minimal HOST change | Exit0,2/2passed; real HTTP transport rejects other local/network addresses with HOST127.0.0.1 |
| Full backend suite, isolated PostgreSQL | Exit0,670/670tests,66files, no skips;61.09s command |
| Backend E2E suite, own disposable test DB | Exit0,2/2tests;3.48s command |
| TypeScript `tsc --noEmit` | Exit0;8.05s |
| `oxlint --type-aware src/ test/` | Exit0;1.85s; three warnings in unchanged auth specs |
| `nest build` | Exit0;6.59s |
| Independent verifier `mvy5tqck-10-lsz4` | S1/T1met; actual Nest/Express/HTTP probe plus exact no-HOST differential against base; no product blockers |
| Parent post-verifier spot-check | Exit0,2/2passed; no source change or full-gate rerun |
| Owned test resources | Fixture/global-run databases cleaned, explicit DB drop exit0; all probe listeners closed |

Gate used `heavy` (queue0.000051s, execution81.76s), at most2workers; normal HOME `/home/agent`, Node24.22.1, installed Vitest4.1.12/TypeScript6.0.3, no package-manager/install. Ports in committed tests are ephemeral0; app PORT3081 is an asserted bootstrap argument, not a fixed test listener. The temporary dependency link is tooling only and is removed after checks.

Parent evidence is resolved **from this worktree** with `git rev-parse --git-path agent-evidence/freighter-t7-preparation`: `host-red.{stdout,stderr,exit}`, `host-green.*`, `gates.json`, per-check stdout/stderr, `gate-source-identity.json`, `cleanup.json`, `parent-spotcheck.*`. Identity covers source/tests/migrations/config/lock; the verifier checked every entry against the candidate. Logs are not public app artifacts or secret environment dumps.

## Independent differential and qualification

No-HOST baseline/candidate both used listen arguments[3081], identical logger stdout, empty stderr, successful bootstrap, wildcard reachability and exact HTTP responses. Configured HOST bound actual Nest/HTTP to127.0.0.1; requests to127.0.0.2 and a nonloopback interface were refused withECONNREFUSED. Probe fixed clock/colors only for exact logger comparison, not application behavior.

The verifier's first probe harness failed because Nest's proxy bypassed ephemeral-port interception and briefly used3081; all owned listeners closed. Corrected interception/probe passed; this was a harness failure, not an app defect. It also used isolated HOME/system temporary storage despite the parent's normal-HOME/in-project-scratch instructions, due to its verifier profile. This deviation is disclosed, not represented as compliant environment evidence. Parent gates/spot-check used normal HOME and needed no package-manager action. Parent did not read/change that outside-root scratch; the verifier report retains its location and exact outputs. No additional verifier run or unexecuted proposed regression is counted as a pass.

## Review boundary and remaining work

Native ASSESS could not classify untracked inputs (`nativeRisk: unassessable`); explicit security item2 escalation required the independent verifier, which ran. No native review was created, reconstructed, acknowledged or used to approve this change. Historical approval/maintainer/owner-omission records remain untouched; the old54ddaf omission does not cover HOST. Feature-native-review timing remains the repository's pre-merge policy, not an invented approval now.

T7 environment/secrets/proxy/wallets/extension journeys remain unstarted until the owner schedules the session. T8 reconciliation concerns only historical70906fd..3161574 and does not include this new HOST delta. No push/merge/mainnet/production action.

Risk: item 2 (network interface exposure), item 5 (listener environment); verified as above.
