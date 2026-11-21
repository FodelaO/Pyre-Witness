# Memory audit and optimisation (`memory-opt`)

Request: "manage application memory more optimally". 21 Nov 2026, measured 14:30 to 15:40 on the dev
server at `http://localhost:4119`.

## Result in short

- **The app does not leak in a model-free session.** Repeating the whole interactive scenario five
  times in one page left the DOM, the listeners and the detached-node count where they were after
  the first pass. A heap snapshot comparison put the remaining heap rise at 115 KB per pass, made of
  JIT-compiled code and development-build bookkeeping, not application objects.
- **One thing did grow, and it is fixed.** The Crew activity list was mounted while its disclosure
  was closed, so every crew step added 11 DOM nodes and one listener that nobody could see, up to the
  feed's 200-entry cap. The rows now exist only while the list is open.
- **One real retention is not fixed**, because it sits in the hash-frozen pipeline client: each
  captured device keeps its capture photo for the life of the tab. The exact change is in
  `.agents/requests/memory-opt.md`.
- No high-severity finding. Everything else is bounded, or is allocation churn rather than retained
  memory. The full list is in section 4.

## 1. How memory is measured

`scripts/heap-profile.mjs` drives the installed Chrome through Playwright (headless, SwiftShader,
1440 x 900) and reads memory over a CDP session. At each step it forces a full collection twice
(`HeapProfiler.collectGarbage`) and then reads `Performance.getMetrics`: JS heap used, live DOM nodes
(attached and detached), JS event listeners. No capture, Threat Watch run or voice session is started.

```
node scripts/heap-profile.mjs --label baseline --allocations --out docs/log/memory-baseline.json
node scripts/heap-profile.mjs --label after    --allocations --out docs/log/memory-after.json
```

Scenario: load, idle 10 s, lens keys 1/2/3 ten rounds, select 30 different floor assets, transcript
`T` / Escape ten times, every visible "Show more" opened and closed twice, the `2D | 3D` switch five
times, two scenarios from the Simulate rail run to the end (at 4x) and reset, idle 20 s. The standard
run takes about 90 s on a quiet dev server (the longest I saw was 169 s) and stops itself at 172 s.
A step that cannot run is recorded as `skipped` or `partial` with the reason and is still sampled.

Options: `--cycles N` repeats the interactive steps N times (leak check); `--snapshots` (with three
or more cycles) compares heap snapshots by object kind; `--allocations` lists the code that
allocated what is still alive; `--start-view app` keeps the view the app opens with;
`--live-reload` lets dev-server hot updates through; `--shots` saves a screenshot of a step that
went wrong.

Four things the script does on purpose, each because the first attempt gave wrong numbers:

1. **It holds dev-server hot updates back after the page has rendered.** Other agents were editing
   the tree during every run (up to 333 rebuilds in two minutes). Hot updates and reloads in mid-run
   changed the heap by megabytes and once covered the page with a build-error overlay.
2. **It never keeps an element handle.** My first leak check showed 164 detached DOM nodes added per
   pass. They were held by the profiler's own `page.waitForSelector` handles, not by the app. With
   locator waits the number is zero. I mention it because the wrong result looked exactly like a leak.
3. **It opens and closes 3D once before the first sample**, so the lazily loaded WebGL code is in
   every sample and is not read as growth in the `2D | 3D` step.
4. **It opens the page in 2D.** The scenario selects `[data-floor-asset]` symbols, which exist only
   in the 2D drawing. At 15:00 another task made 3D the default view; without this the baseline and
   the later runs would not start from the same screen.

Limits of these numbers. This is the development build: React keeps debug data on every element and
V8 keeps compiling code as paths get hot, so the heap after a forced collection still moves by about
1.5 MB between two runs of the same code (two runs before my change gave 31.91 and 33.53 MB at load).
DOM nodes and listeners are exact. SwiftShader puts the 3D view in its still mode (it draws on
demand), so continuous 3D animation on a real GPU is not measured here.

## 2. Before and after, standard scenario

Before: 15:14, `docs/log/memory-baseline.json`. After: 15:17, `docs/log/memory-after.json`. Both runs
valid, no step skipped, same script, three minutes apart.

| Step | JS heap used (MB) before | after | DOM nodes before | after | JS event listeners before | after | Activity rows mounted before / after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| load | 32.24 | 31.08 | 6727 | 6815 | 804 | 803 | 1 / 0 |
| idle 10 s | 32.60 | 31.43 | 6726 | 6807 | 805 | 803 | 2 / 0 |
| lens keys 1/2/3 x10 | 31.15 | 28.64 | 6742 | 6806 | 806 | 803 | 3 / 0 |
| select 30 floor assets | 32.24 | 29.81 | 7241 | 7296 | 808 | 804 | 4 / 0 |
| transcript T / Escape x10 | 33.66 | 31.96 | 7243 | 7292 | 808 | 804 | 4 / 0 |
| Show more x2 | 35.13 | 32.87 | 8560 | 8606 | 957 | 952 | 5 / 0 |
| 2D \| 3D switch x5 | 35.82 | 33.72 | 7398 | 7434 | 812 | 806 | 6 / 0 |
| simulate 2 scenarios + reset | 35.65 | 35.49 | 7478 | 7441 | 818 | 806 | 12 / 0 |
| idle 20 s | 36.91 | 35.64 | 7497 | 7446 | 820 | 806 | 14 / 0 |
| growth, idle 10 s to idle 20 s | +4.31 | +4.21 | +771 | +639 | +15 | +3 | |

How to read it:

- **Listeners: +15 became +3. Nodes: the 132-node difference in growth is the 13 feed rows.** These
  two are the effect of the change and they are exact.
- **Heap: do not read the 1 to 2.5 MB difference as a saving.** It is inside the 1.5 MB run-to-run
  noise, and the tree changed between the two runs (the after run starts with 81 more nodes because
  another task moved the health chip into the crew dock at about that time). The allocation profile
  gives the honest figure: before, the feed's 14 rows held about 415 KB of live objects in this
  development build; after, none.
- The rest of the growth (about 4 MB and 640 nodes in both runs) is state, not a leak: an asset is
  selected and its inspector is open, the transcript holds two simulation runs, and code that ran for
  the first time has been compiled. Section 3 shows it does not repeat.
- "Show more" reads 1,300 nodes higher because the sample is taken right after the breakdown closes
  and React still holds the previous tree. The next step gives them back.

For the record, the same scenario with the view the app opens with today (3D), after the change
(`.agents/qa/memory/after-3d-default.json`): 31.28 MB, 7,654 nodes and 842 listeners at load,
33.76 MB after 10 s idle, 37.43 MB, 7,883 nodes and 821 listeners at the end.

## 3. Leak check: the interactive steps repeated in one page

`--cycles N`. Values are at the end of each pass, after the simulate step.

| Run | Pass | JS heap used (MB) | DOM nodes | JS event listeners | Activity rows mounted | Nodes outside the document |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| before, 15:11 | 1 | 36.96 | 7760 | 812 | 10 | 699 |
| | 2 | 39.23 | 7860 | 820 | 19 | 661 |
| | 3 | 39.12 | 7940 | 828 | 27 | 661 |
| after, 15:19 | 1 | 35.72 | 7449 | 808 | 0 | 672 |
| | 2 | 36.88 | 7478 | 808 | 0 | 672 |
| | 3 | 37.81 | 7471 | 808 | 0 | 672 |
| after, 15:23 | 1 | 37.36 | 7906 | 823 | 0 | 700 |
| | 2 | 38.97 | 7901 | 821 | 0 | 671 |
| | 3 | 39.60 | 7927 | 823 | 0 | 700 |
| | 4 | 39.24 | 7930 | 823 | 0 | 700 |
| | 5 | 40.73 | 7929 | 823 | 0 | 700 |

- Before: +80 to +100 nodes and +8 listeners per pass, all of it activity rows (9 rows a pass, 10.9
  nodes and one listener each). After: flat.
- "Nodes outside the document" are detached nodes plus browser-internal ones. The number is the same
  at the same step of every pass, before and after. Nothing detached accumulates.
- The heap still creeps up by 0.2 to 0.9 MB per pass in these development-build runs. A fourth run
  with `--snapshots` (15:30, `.agents/qa/memory/leak-check-after-snapshots.json`) compared the heap
  after pass 2 with the heap after pass 5: **+344 KB in total, 115 KB per pass.** Compiled code
  +440 KB, V8 internal arrays +121 KB, stack-frame records of 364 development-mode `Error` objects
  +112 KB, weak lists +80 KB, then browser font, paint and performance-timeline entries. React
  fibers went down by 293 and strings by 3,203. Detached DOM nodes: 0 before, 3 after. Nothing of
  the application's own data grew. In that run the node count alternated between 7,765 and 8,178
  from pass to pass without climbing (a simulation change committed at 15:31 by another task).

## 4. Findings, ranked by memory retained in a demo session

Severity is about retained memory in one session of this demo. "Churn" means memory that is
allocated and collected again: it costs collector time, it does not accumulate.

### Client: stores, buffers, binary data

| # | Severity | Where | What grows, how fast | Fix | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Medium, unbounded | `src/pipeline/client.ts:37`, set at `:51` and `:130`, never deleted | One record per captured device with its first capture photo as base64 (JPEG, 1600 px long edge, q 0.85). Not run here; from the sample photos about 0.3 to 0.9 MB per photo or link capture, 3 to 9 MB after ten | Keep the photo for the newest eight devices, keep profile / gate / assessment for all | **Not applied**: frozen pipeline surface (run 4 hash). Exact patch in `.agents/requests/memory-opt.md` |
| 2 | Low to medium, bounded at 200 | `src/crew/ActivityFeed.tsx`, inside the closed `Disclosure` of `src/panel/SidePanel.tsx:137` (`src/panel/PanelParts.tsx:44` always renders its children) | 10.9 DOM nodes, one listener and about 30 KB of development-build objects per activity entry; an idle patrol entry every 8 s, five per simulation, one per pipeline event; up to 200 rows = about 2,200 hidden nodes, all re-rendered on every new entry | Mount the rows only while the list is visible | **Fixed** |
| 3 | Low, bounded | `src/transcript/transcriptStore.ts:75` (20 runs), fed by `src/pipeline/runStore.ts:65` and `:119` | Each run keeps its events and full provider records. The server cuts each text field at 40,000 characters (`src/gemini/transcript.ts:7`), so a run is at most about 1 MB and usually far less; 20 runs at most | None needed | Left. Note: every reassess (a device drag) and every simulation is a run and counts against the same 20, so a long session can push the first capture out of the transcript |
| 4 | Low, churn | `src/panel/SidePanel.tsx:31-35`, `src/panel/DeviceCard.tsx:61`, `src/crew/ScoutEvidence.tsx:16`, `src/view3d/Overlay.tsx:254`, `src/fit/FitTile.tsx:27` | The capture photo is concatenated into a `data:` URL on every render and used as a React key in the device card: one photo-sized string built and compared per render | Build the URL once per image | Left: the panel and 3D files were being edited by their owners. In the request file |
| 5 | Low, churn | `src/sim/simStore.ts:174` (`tickPlant`) with `src/sim/runtime.ts:19` | The plant model replaces the twin object once a second. Every `state.twin` subscriber re-renders: floor, crew layer, simulation layer, fit preview (also while its disclosure is closed), and the whole 3D scene (finding 9) | Separate readings from structure | Left: a refactor, and it is how live telemetry reaches the drawing. The 2D data layer already avoids it (`src/layers/dataModel.ts:98-110`) |
| 6 | Low, churn | `src/econ/model.ts:135-144` with `src/econ/scenarios.ts:39-41` | The estimate cache is keyed by the scenario object, and the scenario builders return a new object per call, so it never hits across callers. Measured on the seed plant (`.agents/qa/memory/econ-cost.mts`): 0.9 to 1.2 ms and one 80 KB typed array per estimate; 7 findings are estimated twice per risk change (escalation monitor and plant header), about 9 ms | Reuse the scenario object per (twin, finding) | Left: 9 ms per configuration change does not justify touching the audited loss model. Not a retention |
| 7 | Low, bounded in practice | `src/econ/pert.ts:25` | A `Map` of 65.5 KB quantile tables with no cap. Measured: 6 tables (0.39 MB) after pricing the whole seed plant, still 6 after 12 plant variants | A cap, if recall scenarios ever vary | Left: it does not grow |
| 8 | Low | `src/escalation/store.ts:51`, `src/escalation/useCallPairing.ts:39-41` | One record of about 1.5 KB per threshold episode, never trimmed; three small maps keyed by record id | Keep the last 200 resolved records | Left: kilobytes per session, and the records are the call receipts |
| 9 | Low | `src/watch/watchCache.ts:32-39` | One `localStorage` key per decided watch proposal, never pruned, across sessions | Prune receipts older than the report they belong to | Left: about 60 bytes each |
| 10 | Low | `src/twin/store.ts:110` | `mitigations` is append-only for capture and watch proposals (simulation proposals are replaced) | None | Left: a handful per run, and the queue is the approval history |

Checked and bounded: risk "Session trend" 24 scores (`src/panel/RiskDial.tsx:12`), crew handoff
pulses 4 (`src/crew/crewStore.ts`), captured-asset receipts 64 (`src/pipeline/assetFromProfile.ts:51`),
photo draft 3 photos, health snapshot replaced on each poll and saved without its history
(`src/health/useHealth.ts:25`), feed check replaced on each poll, modeler store one review at a time,
watch reports one `localStorage` key per mode.

Binary data, checked and clean: object URLs are revoked (`src/capture/image-runtime.mjs:58`,
`src/voice/microphone.ts:20`, `src/transcript/transcriptExport.ts:53`,
`src/modeler/VideoEvidenceStrip.tsx`); the resize canvas is zeroed after encoding; camera and
microphone tracks are stopped on unmount and on abort; both `AudioContext`s are closed when their
owner unmounts; PCM sources are disconnected when they end; QR codes are regenerated only when the
URL changes. `TranscriptEntry` carries no image data: the server counts attachments and redacts
base64 (`src/gemini/transcript.ts:16-27`, `:37-45`).

### Effects: timers, frames, listeners, observers

I read every `setInterval`, `setTimeout`, `requestAnimationFrame`, `addEventListener` and observer in
`src/floor`, `src/crew`, `src/sim`, `src/panel`, `src/shell`, `src/econ`, `src/escalation`,
`src/health`, `src/watch`, `src/voice`, `src/capture`, `src/purdue`, `src/layers` and `src/view3d`.
Every one has a matching cleanup. The leak check agrees: listeners are flat across passes. Module
level store subscriptions (`transcriptStore.ts`, `featureAdapters.ts`, `watchStore.ts`,
`mountsSimulationSnapshot.ts`) live as long as the page by design.

### WebGL (`src/view3d`)

| # | Severity | Where | What | Status |
| --- | --- | --- | --- | --- |
| 9a | None | `gl/renderer.ts:195-203`, `:311-317`, `:358-377`, `gl/program.ts:30-44`, `Plant3D.tsx:404-415` | GPU buffers and vertex arrays are deleted on every re-upload, the pick texture and renderbuffer on resize, everything plus the program on unmount, and the context is released. The loop stops while the tab is hidden and the view unmounts in 2D. Five mounts and unmounts per pass leave no canvas and no heap behind | Clean |
| 9b | Low to medium, churn | `Plant3D.tsx:131`, `:426`, `:457`, `:471` | The scene is rebuilt and three instance groups are re-uploaded once a second, because the twin object changes with each telemetry tick | Left: owner was editing these files (3D became the default view at 15:00). In the request file |
| 9c | Low to medium, churn | `Overlay.tsx:139-235` | Arrays, one box and one screen point per label, and one transform string per shown label are allocated on every drawn frame. On a real GPU the plant animates continuously, so this is per frame; not visible in this headless measurement | Left, same reason. In the request file |

### Server

| # | Severity | Where | What | Status |
| --- | --- | --- | --- | --- |
| S1 | Medium, transient and bounded | `src/modeler/request.ts:64-66`, `:97`, `src/modeler/media.ts:36`, `:48`, `:63`, `:68` | An upload is held two to three times: stream chunks, then a `Blob`, then the parsed `File`, then `arrayBuffer()` (the whole video, only to read its duration), then base64 for photos and PDFs. Bounded at 51 MB multipart / 68 MB JSON, two uploads at once, six per ten minutes (`src/app/api/model/ingest/route.ts:14-15`) | Left: fixing it means streaming to disk or parsing the video header from slices, which is a rewrite. The limits keep the peak near 300 MB |
| S2 | Low to medium, bounded | `src/handoff/store.ts:22`, `:137`, `src/handoff/payload.ts:49-58` | The last phone upload (up to three photos, 12 MB of base64) stays in its session until the 10-minute expiry, so a reconnecting desktop can get it again. 12 sessions at most. The request body exists as a string, as parsed JSON and once more as an SSE frame while it is delivered | Left: the replay is a feature and the expiry frees it |
| S3 | Low | `src/pipeline/server/sse.ts:20`, `src/watch/sse.ts:41` | Events are enqueued without looking at `desiredSize`; a stalled reader makes the server buffer one run's events (under 1 MB). The handoff and escalation streams do check | Left: frozen pipeline file, small |
| S4 | Low | `src/pipeline/server/sse.ts:27-31` | The 18 MB size check trusts `content-length`; `request.json()` then buffers the body | Left: frozen pipeline file |
| S5 | Low | `src/fit/cache.ts:25-37` | 24 generated images at most, but an expired entry stays until it is read or pushed out by count | Left: bounded at about 15 MB |

Checked and bounded: speech cache 8 MB (`src/app/api/voice/speak/route.ts:14-31`), watch reports 16
with pending runs removed in `finally` (`src/watch/runAdmission.ts:10`, `:62-72`), feeds replaced
every 30 minutes (`src/watch/feeds/index.ts:9`), health history 20 (`src/health/runner.ts:10`),
escalation relay 32 sessions pruned by expiry (`src/escalation/relay.ts:18`, `:48`), rate-limit
windows pruned on use (`src/app/api/health/rateLimit.ts:16`). Transcript and usage collectors are
scoped to one request with `AsyncLocalStorage` and keep nothing global (`src/gemini/transcript.ts`,
`src/gemini/usage.ts`). All five streams release their timers and subscribers on disconnect
(`src/pipeline/server/sse.ts:48`, `src/watch/sse.ts:56`, `src/app/api/model/ingest/route.ts:58-66`,
`src/app/api/handoff/[code]/stream/route.ts:48-73`, `src/app/api/escalation/[code]/route.ts:71-97`).

## 5. What changed

One source change. I applied it at 15:16, after `.agents/demo-build-cut` appeared (14:42).

- `src/crew/ActivityFeed.tsx`: the list rows are rendered only while the feed is visible. The
  component finds the `<details>` it sits in, listens for its `toggle` event and removes the listener
  on unmount. The entries stay in the store, so opening the list shows everything recorded while it
  was closed. A reopened list starts at the newest entry.
- `src/crew/feedVisibility.ts` (new): the rule itself, `feedShown(disclosure)`. Outside a disclosure
  the feed is always shown.
- `src/crew/feedVisibility.test.ts` (new): the rule; no rows in the markup before the feed knows it
  is visible; and the existing 200-entry cap of `src/crew/feedStore.ts`, which had no test.

No rename, no refactor, no new dependency. No honesty label was touched: rows still read "idle
patrol" and "SIMULATION" (screenshot `.agents/qa/memory/feed-open.png`).

Checks:

- `npx tsc --noEmit`: clean for the whole repo.
- `npx vitest run src/crew --maxWorkers=1`: 6 files, 43 tests passed.
- `node .agents/qa/memory/feed-check.mjs` in the running app: 0 rows while closed, 2 on opening,
  a row opens the transcript, a third row arrives while open, 0 after closing, 3 on reopening, no
  console errors.
- Sections 2 and 3 above.

## 6. Caps in force

I added no cap that drops data. These are the limits that exist, with their tests.

| What | Cap | Where | Test |
| --- | --- | --- | --- |
| Crew activity entries | newest 200; rows mounted only while open | `src/crew/feedStore.ts:5`, `src/crew/ActivityFeed.tsx` | `src/crew/feedVisibility.test.ts` (new) |
| Transcript runs | last 20, of any kind | `src/transcript/transcriptStore.ts:75` | `src/transcript/transcriptStore.test.ts` |
| Transcript text per field | 40,000 characters, with a note in the entry | `src/gemini/transcript.ts:7` | server tests |
| Risk session trend | 24 scores | `src/panel/RiskDial.tsx:12` | none |
| Capture photos per draft | 3, long edge 1600 px | `src/capture/image.ts:5-7` | `src/capture/image.test.ts` |
| Phone handoff | 12 sessions, 20 uploads each, 10 minutes, 12 MB per upload | `src/handoff/store.ts`, `src/handoff/payload.ts:6-7` | `src/handoff/store.test.ts` |
| Escalation relay | 32 sessions, pruned at expiry | `src/escalation/relay.ts:18` | `src/escalation/relay.test.ts` |
| Fit images | 24, 15 minutes | `src/fit/cache.ts:5-6` | `src/fit/fit.test.ts` |
| Briefing speech | 8 MB | `src/app/api/voice/speak/route.ts:14` | none |
| Watch reports | 16 per server, one per mode in the browser | `src/watch/runAdmission.ts:10` | `src/watch/runAdmission.test.ts` |
| Health history | 20 runs | `src/health/runner.ts:10` | `src/health/runner.test.ts` |

Not capped: captured devices and their photos (finding 1), escalation records (8), watch decision
receipts (9), mitigations (10).

## 7. Found and deliberately left

- **Finding 1, the capture photos.** The one I would fix first. `src/pipeline/client.ts` is in the
  29-file surface hashed for evaluation run 4 (`docs/log/pipeline-speed.md:534`), and the freeze
  marker is still there. Changing it would make the shipped pipeline differ from the scored one.
- **Findings 4, 9b, 9c.** Real allocation churn, now on the default view, in files their owners were
  editing while I worked (`src/view3d/*` at 15:00 to 15:02, `src/panel/SidePanel.tsx` at 15:12).
  A second writer in those files was the bigger risk. Exact suggestions are in the request file.
- **Findings 5, S1.** Refactors, not small changes.
- **Findings 6, 7.** Measured and too small to justify touching the audited loss model.
- **Findings 3, 8, 9, 10, S2 to S5.** Bounded or kilobytes.
- **The run cap of 20 shared by captures, reassessments, simulations, watch, modeler and voice**
  (finding 3) is not a memory problem. It is the one place where a cap can drop something a judge
  wants: 20 simulation replays or device drags push the first capture's transcript out. Separate
  limits for pipeline runs and for the other kinds would prevent that. I did not change it because
  `transcriptStore.test.ts` had someone's uncommitted edits.

## 8. Files, verification, gaps

Created: `scripts/heap-profile.mjs`, `docs/log/memory-baseline.json`, `docs/log/memory-after.json`,
`docs/log/memory.md`, `src/crew/feedVisibility.ts`, `src/crew/feedVisibility.test.ts`,
`.agents/requests/memory-opt.md`, and the run records under `.agents/qa/memory/`.
Changed: `src/crew/ActivityFeed.tsx`.

Known gaps:

- No real capture was run, so finding 1 and the transcript sizes are from reading the code and from
  file sizes, not from a measurement.
- Development build only. Absolute megabytes will be lower in a production build; the node and
  listener counts will not.
- Real-GPU 3D animation is not measured (findings 9b, 9c).
- The server findings come from reading the code. I did not profile the Node process.
- The tree was changing throughout. The before and after runs are three minutes apart and both
  include other tasks' edits.
