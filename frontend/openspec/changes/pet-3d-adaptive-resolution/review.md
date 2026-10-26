# Review: pet-3d-adaptive-resolution

Status: implementation and functional verification complete; native RDD approved and its exact acknowledgement consumed authority. Prompt4 authorizes one local 24-file commit; no push, merge or production operations.
Post-acknowledgement documentation: only this report and tasks.md were updated for closure and the requested pre-existing mobile-layout follow-up. Code, tests and captured evidence remain byte-identical to the approved frozen candidate.
Baseline: `6643f8964364051625d4ba71c8a2126eb4a945a3`; branch `feat/voxel-pet-migration`.
Scope: the 24 paths declared before source writes in [design](design.md). Local trackers/runners/raw streams are excluded. No dependencies or protected caller/model/helper changes.

## Human decision and implemented behavior

Prompt3, verbatim:
> **Decisión humana:** comparé las capturas emparejadas y 256 se ve igual que 512. La sombra queda **fija en 256** y no hay cambio de escalón en vivo.

- ContactShadows has fixed `resolution={256}`. Position `[0,-0.62,0]`, opacity `0.28`, scale `3.4`, blur `2.6`, far `2.2`, color `#1c2b22`, smooth and continuous updates remain unchanged. No shadow tiers, factor thresholds, shadow state or crossing tests.
- Cat3DViewer owns numeric selectedDpr, initialized to the memory-first ceiling. Quantized changes alone update state. Fallback synchronously derives the final DPR from its callback factor and rejects later changes; orbit rerenders retain it.
- No renderer driver, useThree/setDpr adapter, layout-effect driver, forced-store-reset test or new controller component. Camera, lights, controls, model geometry/animation/reduced-motion policy and both callers remain unchanged.
- Existing drei Stats panel 0 is client-opt-in only for exact `pet3dStats=1`, viewer-local and pointer-safe. Reload applies flag changes. Real unmount removes its DOM; no new dependency, telemetry or animation loop.

## Observed commands and results

Run from frontend unless noted. [TDD evidence](evidence/tdd-results.json) preserves stream hashes and raw paths.

| Check | Result |
|---|---|
| Initial public-viewer RED against old tuple | Exit 1; 24 assertion failures / 7 passes / 31 total, 1.59s; zero collection/import errors; production source still unchanged |
| DPR-only focused GREEN | Exit 0; 62 passes / 8 deliberately filtered, 2.05s; not full coverage |
| Prompt2 combined focused GREEN | Exit 0; 70 passes / 0 skips, 1.42s |
| Prompt3 shadow RED against implicit 512 | Exit 1; 1 assertion failure / 30 filtered, 2.05s; missing resolution256, all other expected props identical |
| Prompt3 combined focused GREEN | Exit 0; 70 passes / 0 skips, 2.76s; empty stderr |
| Existing preservation controls | Exit 0; 83 passes / 10 files / 0 skips, 4.71s; empty stderr |
| Full frontend suite under heavy | Job18 exit 0; 280 passes / 49 files / 0 skips, 32.03s |
| TypeScript | `./node_modules/.bin/tsc --noEmit --incremental false`: exit 0, empty stdout/stderr |
| Production build | `NEXT_TELEMETRY_DISABLED=1 heavy -- ./node_modules/.bin/next build`: job19 exit 0 |
| Public viewer differential | Baseline/current runner exits 0/0; 6 cases / 18 observations / 0 unexpected differences |
| Home real WebGL | Job21 exit 0 / 53s; normal Stats off/on and reduced Stats on, all pass |
| Admin real WebGL | Job22 exit 0 / 29s; existing Diseño 3D route with Stats on, pass |
| Independent verifier | **UNEXECUTED / NOT APPROVED**; explicit Prompt2/3 human exception because its profile isolates HOME |
| Native RDD | APPROVED: four prepared/submitted reviewer lenses; exact acknowledgement completed and authority burned for this candidate. No correction round |

Focused commands:
```bash
./node_modules/.bin/vitest run test/features/pet-home/cat-3d-viewer.test.tsx -t fixed256 --maxWorkers=2 --reporter=dot
./node_modules/.bin/vitest run test/features/pet-home/cat-3d-viewer.test.tsx test/features/pet-home/pet-render-quality.test.ts --maxWorkers=2 --reporter=dot
heavy -- ./node_modules/.bin/vitest run --maxWorkers=2 --reporter=dot
```

The RED command is the first command above before the source change. The same fixed256 test is included in the subsequent 70-test GREEN. Initial tuple RED used the viewer file without the filter. The earlier DPR-only filter is preserved exactly in tdd-results.json.

Preservation controls:
```bash
./node_modules/.bin/vitest run test/features/pet-home/cat-anatomy.test.ts test/features/pet-home/cat-anatomy-contact.test.ts test/features/pet-home/cat-part-tree.test.ts test/features/pet-home/cat-3d-model-frame.test.ts test/features/pet-home/cat-idle-motion.test.ts test/features/pet-home/use-reduced-motion.test.tsx test/features/pet-home/cat-3d-model.test.tsx test/features/pet-home/cat-3d-model-connection.test.tsx test/features/pet-home/pet-home.test.tsx test/features/admin/admin-design-3d-page.test.tsx --maxWorkers=2 --reporter=dot
```

Root-only evidence runners, excluded from the candidate:
```bash
node odd/evidence/pet-3d-adaptive-resolution-differential.cjs
heavy -- npx -y --package=playwright@1.63.0 -c 'NODE_PATH="$(dirname "$(dirname "$(command -v playwright)")")" node odd/evidence/pet-3d-adaptive-resolution-browser.cjs'
PET_ADAPTIVE_ADMIN_ONLY=1 heavy -- npx -y --package=playwright@1.63.0 -c 'NODE_PATH="$(dirname "$(dirname "$(command -v playwright)")")" node odd/evidence/pet-3d-adaptive-resolution-browser.cjs'
```

Warnings retained, not silently waived or fixed outside scope: existing admin-nav test mock gives React's non-boolean scroll warning; Next reports that Edge runtime disables static generation for that page. Heavy briefly waited for its machine-wide slot. These did not fail the suite/build.

## S1–S10 scenario → test / evidence class

| Spec | Scenario and evidence | RED-caused or preservation-only? |
|---|---|---|
| S1 | Memory 0.5/1/2/2.01/4/8; cores ignored when memory available. Viewer and pure-helper tests | Public numeric-cap assertions RED → GREEN. Pure table added after initial RED: additional GREEN-only coverage |
| S2 | Missing memory with cores 1/2/unknown/8; same files | Public numeric-cap assertions RED → GREEN; pure table GREEN-only |
| S3 | Physical DPR clamp, downward 0.05 ticks, exact ticks and approved 0.8 → 1 | Public assertions RED → GREEN; pure boundary tests additional GREEN-only. Client-loaded callers remain unchanged |
| S4 | Numeric ceiling and monitor factor1/step0.15/bounds function/flipflops8 | RED fixed tuple/absent monitor → GREEN. Camera/gl/light properties additionally preserved by controls/differential |
| S5 | Quantized mapping/endpoints, same-value no rerender, orbit-start/end retention | RED absent monitor → GREEN exercising callbacks. Browser confirms actual buffers resize with those production callbacks; no forced-store test |
| S6 | Same-act change0.7/fallback0.2/late callbacks and orbit/tap | RED absent monitor → GREEN final DPR1.15. Browser retains it through actual input. Ninth qualifying vendor-event behavior is installed-source evidence, not an executed FPS-timing test |
| S7 | Full shadow props expect resolution256 | New Prompt3 assertion RED against implicit512 → GREEN. Other appearance props are preservation assertions. Human-approved images select visual equivalence; live browser sees actual256² shadow target |
| S8 | Default off/other values; exact opt-in/local panel/unmount | Opt-in RED → GREEN; default off preservation-only. Real Stats visible and pointer-safe, absent without flag, DOM removed on unmount |
| S9 | Existing anatomy/tree/frame/idle/reduced/home/admin controls; public differential; actual orbit and raycast tap in normal/reduced/home/admin | Preservation-only: 83 controls, full suite, 18 differential observations, four real-browser cases. No unrequested behavior deltas |
| S10 | Complete scope before edits, dependencies/protected paths/source-before-RED, initial no-commit stop, accepted verifier limitation | Structural/process proof, not FPS evidence. Prompt4 separately authorizes one commit after the now-approved and acknowledged native review |

## Differential and real-browser proof

[Public differential](evidence/viewer-differential.json): identical harness against isolated baseline and current-src copies, without package manager or HOME changes. Six cases cover high/low memory, missing-memory fallback, fractional physical DPR, reduced/all-zero input and Stats. Eighteen initial/orbit-start/orbit-end observations preserve aria/class/model inputs and mount count, camera/gl/lights, controls, tap forwarding and shadow appearance props. Only requested numeric DPR, fixed256, monitor and opted-in Stats differ. Mocks bound graphics; real pixels are checked separately.

[Browser report](evidence/adaptive-browser.json): Chromium153.0.8010.12 / SwiftShader, viewport390×844, scale2, injected memory8/cores8. Active WebGL, nonblank output, no context loss, zero JS page errors, console errors or failed requests in all four cases. Thirty-three cat instances persist across quality changes, fallback and interactions.

- Home actual buffers: 490² → 280² → 490² → 322², corresponding to DPR1.75 → 1 → 1.75 → 1.15. Actual shadow texture remains256².
- Real orbit changes camera quaternion; starting/ending orbit preserves selected DPR. Real raycast taps reach the unchanged home action and mocked POST /pet/actions/pet response in normal/reduced mode.
- Real Stats uses a local absolute/pointer-events:none parent, is absent without the flag and removes its DOM on subtree unmount. Vendor cleanup code supplies subscription removal; DOM observations are not a heap-leak proof.
- Admin's existing layout at390px leaves a44×280 CSS preview: buffers77×490 →44×280 →77×490 →50×322. Same shadow/orbit/tap/Stats checks pass; admin preview has no pet-action callback/API request. This is not a mobile-layout redesign or usability certification.

Browser instrumentation is fixture-only: current-src copy plus read-only useFrame observer, exposed existing quality callbacks, tap counter and subtree-unmount switch. No model/clock edit, renderer setter or store reset. Buffer tests drive real production callbacks deterministically; they do not claim measured FPS-driven timing, GPU speedup or phone performance. All API/session state is synthetic; outside origins blocked, internal API fallback unreachable. Owned contexts/browser/server/ports stopped and copies removed; HOME preserved.

## Shadow images and final capture

Historical paired baseline captures, same mounted model/pose/camera/DPR within each pair, fixture-only time0:

| Home state | 512 | 256 |
|---|---|---|
| Needs80 | [512](evidence/shadow-home-normal-512.png) | [256](evidence/shadow-home-normal-256.png) |
| All needs0 | [512](evidence/shadow-home-zero-512.png) | [256](evidence/shadow-home-zero-256.png) |

[Comparison metadata](evidence/shadow-comparison.json) retains original diagnostics/hashes; its pending-decision field is historical capture-time state, superseded by the verbatim Prompt3 decision above. No automated pixel metric chose the branch.

Final current-source captures with moving animation and fixed256, not retouched:
- [Normal, Stats off — final256 shadow](evidence/adaptive-normal-stats-off.png)
- [Normal, Stats on](evidence/adaptive-normal-stats-on.png)
- [Reduced motion, Stats on, needs0](evidence/adaptive-reduced-stats-on.png)

## Failures, deviations and unexecuted proof

- Initial public RED and shadow RED are expected assertion failures, not collection failures. New pure-helper tests are GREEN-only additional coverage. The final focused/full suites have no skips.
- Initial browser job20 exited1 because a GET-only fixture rejected the real pet-action POST; an unhandled route assertion bypassed cleanup. Only the verified owned process group was stopped manually; port42077 freed and its copy removed. The exact POST fixture and response wait corrected the tooling; job21 passed. Initial runner/server/job logs are preserved, not relabeled successful.
- Initial differential exited1 before collecting tests: Vite denied loading the owned copy under .git. Moving its temporary copies inside odd/evidence resolved it; baseline/current then passed. Initial stdout/stderr are archived separately, not RED evidence.
- One earlier bookkeeping codemode syntax error invoked no tools. No production regression or source modification was hidden by these tooling corrections.
- Prompt2 intentionally replaced tuple/driver design with controlled numeric DPR and approved the DPR<1 floor exception. Prompt3 removed shadow tiers entirely. No new controller or tier tests were created.
- Independent verifier for THIS candidate remains **UNEXECUTED / NOT APPROVED**, explicitly accepted in Prompt2 and preserved by Prompt3. Do not describe native RDD as executing or approving that omitted verifier.
- Android/iPhone observations are future human work, not an unavailable server acceptance check. No phone FPS result or guaranteed improvement is claimed.

## Native RDD closure

- Existing lineage `review-29c903a510e3a4e9`, medium tier, 24 paths / 1699 original changed lines / correction budget200. All20 new untracked paths were explicitly included with the4 tracked edits; no prior feature's authority was reused.
- Frozen base tree: `9ec16782be96f59e9bccc26dd623dd2af01468a1`; reviewed candidate tree: `c239e10f41441d88ae5867646e826ebf9a1cce8a`.
- Target: `sha256:66df052c7978f3177acf9cb68d79dd7c527663ddf96525c1aea9f68f8fc9d0e4`.
- Historical outer-wrapper capture call was rejected without mutation; stopped and reported. Prompt4 authorized resuming the same lineage. Fresh STATUS returned the same candidate and exact inner bindings. The accepted informational forecast was `pi_host_relay`,4model runs, in provider order: risk, resilience, readability, reliability.
- Actual acknowledged group:4 reviewers prepared /4 submitted. The final admitted event returned `approved`; no correction round was required. Individual warning/suggestion text was not included in the facade result; approval is not a claim that there were zero advisories.
- Fresh bound STATUS offered the exact acknowledgement; it returned `native-approved-acknowledgement-completed`, `authority: burned`, evidence `gentle-ai.review-acknowledged/v1`, consumed revision `sha256:12ffd69e724ee95cc6170803f596fc255e77b63bab2dff0d1ae7b90c479d2329`. No STATUS was issued after the burn.
- Native approval covers the frozen tree above, not subsequent documentation edits. The only post-ack edits are this report and tasks.md (closure metadata and the requested follow-up below). Code/tests/evidence are unchanged; the delivery guard compares all24paths against the approved tree and allows only those2documentation deltas.
- This native review does not execute or approve the omitted independent verifier. Local closure/commit audits are excluded bookkeeping under `.git/agent-evidence`; the local commit identity is recorded in the ODD tracker rather than introducing a self-referential commit hash here.

## Separate follow-up: mobile Diseño 3D layout

At390px viewport width, the existing Diseño 3D layout leaves a44×280px CSS preview. This predates adaptive resolution and is explicitly deferred to a separate change. Do not alter the protected admin caller/layout in this feature. Its WebGL checks passing is not approval of the mobile layout or usability.

## Ready-to-follow phone procedure

1. Record low-end Android/iPhone model, OS/browser, viewport, battery/thermal condition and reduced-motion setting. Keep real credentials out of screenshots/reports.
2. Open home with `?pet3dStats=1` (or append `&pet3dStats=1`), reload, and confirm the local panel does not intercept orbit/tap.
3. Observe startup and at least30seconds of settled foreground FPS. Record actual range/stutters, not a universal60FPS promise.
4. Orbit/tap and inspect the fixed256 contact shadow with normal and low/all-zero needs. Repeat reduced motion and the existing Diseño3D preview using authorized access; note its viewport/layout limitations.
5. Remove the parameter/reload; confirm panel absence and interactions. Report appearance separately from FPS.
6. Stats adds overhead and measures frame-loop FPS, not GPU time. Safari may lack deviceMemory and cores can be underreported; SwiftShader results do not substitute for phone observations.

Risk: item3 (shared home/admin viewer behavior). Functional controls/differential/real-browser proof passed; independent verifier omission explicitly accepted, not approved. Native RDD approved and exact acknowledgement consumed authority. Prompt4 separately authorizes one local24-file commit and a paragraph in PR#1 if still open; no push or merge.
