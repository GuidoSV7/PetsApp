# BACKEND_LISTEN_HOST — optional listener setting

## Contract and scope

Owner-requested rename from generic HOST to BACKEND_LISTEN_HOST, optional with **no default**. Absent means the existing one-argument app.listen(port); defined means app.listen(port, host). Generic HOST is ignored, so an unrelated platform variable cannot change the interface. Frontend standalone HOSTNAME remains a separate setting. No production configuration, deployment, T7 environment or historical auth/ledger implementation changed.

## Test-first evidence

Public-bootstrap test configuration now looks up keys explicitly; it does not falsely return the same environment value for every unknown key. Cases: both variables absent; only generic HOST set (ignored); BACKEND_LISTEN_HOST=127.0.0.1 (loopback allowed, other local/network addresses refused).

- RED against old implementation: exit1,1passed/2failed. Generic HOST incorrectly changed the listener; new setting was ignored.
- GREEN after the single configuration-key change: exit0,3/3passed.
- Full backend suite: exit0,671tests/66files, no skips.
- Backend E2E: exit0,2/2passed.
- TypeScript, type-aware oxlint and Nest build: each exit0. Lint has three warnings in unchanged auth specs.
- Test resources: unique disposable DB and global fixture namespaces cleaned; explicit DB drop exit0. Probe listeners use ephemeral0 and are closed.

Gates ran with normal HOME, installed tools/no package manager, one worker, under exclusive petsapp-heavy-a2 plus heavy to prevent overlap with A2 heavy work. Heavy queue0.000053s/execution79.54s; shared lock queue0.000119s/execution79.59s.

Resolve this worktree's evidence with git rev-parse --git-path agent-evidence/freighter-final-security: rename-red/rename-green stdout, stderr and exits; rename-gates.json; rename-gate-source-identity.json; per-check logs; rename-cleanup.json. Source identity covers source/tests/migrations/config/lock. Original HOST evidence remains historical and unchanged; this file supersedes its active setting name, not its observed results.

README, T7 guide and DEPLOY.md document the renamed optional setting with no default. At the listener rename commit, the NEW independent blind final-state security review was pending; it is now separately recorded in [the completed security report](freighter-final-security-review.md). The primary gates alone do not establish that result. T8 uses the owner's new acceptance basis, without reconstructing absent snapshots or reopening54ddaf.

Risk: item 2 (network-interface configuration). No push/merge/production/mainnet or T7 execution.
