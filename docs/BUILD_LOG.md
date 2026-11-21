# Build log: Nov 21, 2026

Every line points to a commit (`git log --date=format:%H:%M --format="%ad %h %s"`) or a feature log in `docs/log/`.

Notes on the clock:
- Commit times are EST and record when the reviewer committed, not when the work started. Several features were built and measured before their commit.
- Feature logs use UTC. EST = UTC − 5.
- At 13:40 EST the economic loss model, health probes, lenses, twin modeller, transcript, voice updates and the evaluation runs were still uncommitted (`git status`). Their entries cite the feature log.

## Commits

| EST | Commit | What |
| --- | --- | --- |
| 11:47 | `f0a6bd3` | Scaffold: twin foundation |
| 12:11 | `8278783` | Twin and pipeline contracts extended |
| 12:16 | `5f3d66e` | Line 3 seed plant and geometry tests |
| 12:18 | `1ecd6bc` | Process equipment SVG symbols, `/gallery` |
| 12:21 | `37678dd` | Control and network equipment symbols |
| 12:25 | `6f31d72` | Wireless and portable device symbols |
| 12:33 | `19a2ad7` | Rules engine and attack-path graph |
| 12:38 | `a5fe998` | Plant floor and device placement |
| 12:43 | `b213e4b` | Purdue network map |
| 12:44 to 12:50 | `09698db`, `ae0c121`, `a9b7c13`, `0bb77e9` | README upload from GitHub, title, merge |
| 12:48 | `9601ca8` | AI crew, results panel, capture with phone handoff |
| 12:53 | `bf6d203` | Gemini pipeline, SSRF-safe link fetch, compliance catalogue |
| 12:56 | `a3777b5` | Plant simulation and Threat Watch |
| 12:59 | `a8d35da` | Evaluation harness, fit preview, brand assets |
| 13:24 | `3fd91cd` | Chief voice, evaluation dataset |
| 13:26 | `b4bd5c7` | README, lens screenshots, overview doc |
| 13:33 | `3a4f73c` | UI integration: floor, Purdue, dock, results rail, `/proof` |
| 13:35 | `1c94428` | Pipeline, rules and simulation hardening, counterfactuals |

## Measured events from the feature logs

| UTC (EST) | Event | Source |
| --- | --- | --- |
| 17:17 (12:17) | Eval Run 1 starts: 71 captures, 6 workers, Carbon `medium` | `eval-run.md` |
| 17:42 (12:42) | Run 1 cut off at 25 min: 67 of 71 pairs | `eval-run.md` |
| 18:01 (13:01) | Reliability batch: 63 captures, 6 workers | `pipeline-speed.md` |
| 18:04 to 18:06 (13:04 to 13:06) | Health: CLI run, then `10 / 10` healthy in the app | `gemini-health.md` |
| 18:15 (13:15) | Pipeline frozen; Run 3 starts | `eval-run.md` |
| 18:24 (13:24) | Run 3 report written | `eval/report/REPORT.md` |
| 18:34 (13:34) | Fair single-call baseline finishes (4.1 min), saved as `run-3-baseline` | `eval/report/REPORT.md` |
| 18:54 (13:54) | Run 4 freeze marker; system collection starts | `eval-run.md` |
| 19:02 (14:02) | Run 4 report written: 71/71 captures, 66 shared answers | `eval/report/REPORT.md` |

Commits after 14:02 EST and the later features (3D view, escalation call, theme, watch relevance, Samples tray, security pass, loss model audit) cite their feature logs: `view3d.md`, `escalation-call.md`, `watch-relevance.md`, `loss-model.md` (Audit), `gemini-health.md`, `docs/DEMO_KIT.md`, `docs/SECURITY.md`.

Run 2 has no UTC start in its log; its report file is dated 13:11 EST.

## What broke and how it was fixed

### Carbon latency and thinking level (`pipeline-speed.md`, `src/gemini/models.ts`)

- Carbon at `high` exceeded 120 s per capture; `medium` took about 117 s.
- First text capture with the original prompt: 118.877 s end to end.
- Fixes: compact twin context (8,354 bytes instead of 68,526), smaller schema, rules verdict streamed before Carbon, revision only when needed.
- Paired test, Carbon `low` vs `medium`: p50 15.293 s vs 67.076 s (4.39× faster). Same room and level on 5 of 6 devices, same rules verdict on 6 of 6.
- Result: default thinking `low` for all three Gemini 4 models.

### API version (`pipeline-server.md`, `pipeline-speed.md`)

- First build: Decisions on `v1beta`, Interactions on the stable `v1` client.
- Later: both clients on one shared `v1beta` transport, with one retry on HTTP 429 and 5xx. The logs do not record the exact error that led to the switch.

### Evaluation runs 1 to 4 (`eval-run.md`)

| Run | Setup | Outcome |
| --- | --- | --- |
| 1 | Carbon `medium`, 6 workers | `0` placements. `59` of 67 hit the 120 s Carbon deadline. p50 `129.2 s` |
| 2 | Updated object-assessment pipeline, Carbon `low`, 8 workers | `35` assessments (32 devices, 3 passive). `34` errors, `21` at the gate. p50 `23.5 s` |
| 3 | Frozen pipeline after the speed work, Carbon `low`, 6 workers | `69` assessments (63 devices, 6 passive), `0` errors. p50 `26.0 s`. Lost to the fair baseline on equipment kind and key-risk recall |
| 4 | Kind definitions in the Scout prompt; final risk list complete by construction; 6 workers | 71/71 recorded, 66 shared answers, `2` system errors. Kind `57/58`, key-risk recall `69/118`. All-attempt area fell from `57/62` to `51/62` and tied the baseline. Median `24.6 s` |

Baseline fairness:
- Runs 1 to 3 first reused the Run 1 baseline. It had `48` errors: `46` were valid answers rejected by local length caps the request schema never sent.
- That made the baseline look much worse. The comparison was re-run with a fair baseline, caps removed, saved as `run-3-baseline` and reused unchanged for Run 4.
- Current result (Run 4, shared answers, single call vs Pyre Witness): forbidden areas `3/54` vs `0/54`; key-risk recall `51.7%` vs `58.5%`; kind `94.8%` vs `98.3%`; area `87.7%` vs `89.5%`; Purdue level `96.3%` vs `94.4%`. None of these headline differences is significant on `71` items; the single call is significantly better on radio recall and cloud flags. One development set that informed the iterations; no held-out set (`eval/report/SUMMARY.md`, `eval/report/REPORT.md`). Earlier reports are archived in `eval/report/run-*`.

### Other fixes

| Problem | Fix | Source |
| --- | --- | --- |
| Main-page runtime error in the rules graph during Fast Refresh | Live rules context supplies the method | `bugfix-1.md` |
| Telemetry shown with raw floats | One shared formatter | `bugfix-1.md` |
| Simulation launcher raced the lazy dock | Shell owns the launcher and its clock | `bugfix-1.md` |
| Duplicate floor labels | Floor owns one tag per asset | `bugfix-1.md` |
| Antigravity artifact download HTTP 404 | Workspace path fixed; next run 75.3 s, HTTP 200 | `threat-watch.md` |
| Neon Watch reassessment hit its 45 s deadline | Shorter prompt, 85 s deadline: 21.8 s | `threat-watch.md` |
| CISA connection timeouts failed the feed probe | HEAD probe with bounded GET fallback | `gemini-health.md` |
| Direct reloads unstyled at 1280 and 1024 px | Loader change; checked at both sizes | `lens-integration.md` |
| Loss model: triangular means overweighted the high bound; radio contact prior too high; double credit for safeguards | PERT, lower radio prior, single credit. Seed plant `$280k / yr` to `$110k / yr` | `loss-model.md` (Audit) |
| Escalation: a port lock left the media finding active | Recommendation uses the service-media mitigation | `escalation-call.md` |

## Test count

`npx vitest run` at 13:37 EST: `81` files, `498` passed, `3` skipped.
