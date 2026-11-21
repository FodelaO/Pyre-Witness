# Pyre Witness — Build Log

Chronological record of everything built on 2026-11-21, synthesised from the 20 workstream logs in [`docs/log/`](log/). Where later integration passes resolved earlier log requests or added files, those updates are noted explicitly.

## Summary of workstreams

| # | Workstream | Scope | Detailed log |
| ---: | --- | --- | --- |
| 1 | `equipment-process` | 16 process SVG symbols + `/gallery` | [`equipment-process.md`](log/equipment-process.md) |
| 2 | `plant-design` | Bebidas del Norte Line 3 seed twin (92 assets) | [`plant-design.md`](log/plant-design.md) |
| 3 | `rules-engine` | Inspector deterministic rules engine (13 rules) | [`rules-engine.md`](log/rules-engine.md) |
| 4 | `equipment-devices-b` | 7 user-introduced device SVG symbols | [`equipment-devices-b.md`](log/equipment-devices-b.md) |
| 5 | `floor-view` | Interactive 1600 x 1000 SVG plant floor | [`floor-view.md`](log/floor-view.md) |
| 6 | `pipeline-server` | SSE pipeline routes, Gemini 4 stages, self-check loop | [`pipeline-server.md`](log/pipeline-server.md) |
| 7 | `crew` | 4 walking crew avatars, office, idle patrol, feed | [`crew.md`](log/crew.md) |
| 8 | `panel` | Results rail, RiskDial, progressive cards, mitigations | [`panel.md`](log/panel.md) |
| 9 | `equipment-devices-a` | 6 control and network SVG symbols | [`equipment-devices-a.md`](log/equipment-devices-a.md) |
| 10 | `purdue-view` | Linked Purdue Levels 0–5 + DMZ network map | [`purdue-view.md`](log/purdue-view.md) |
| 11 | `capture` | Desktop capture card + `/capture` phone QR handoff | [`capture.md`](log/capture.md) |
| 12 | `compliance-data` | 58-clause industrial compliance catalogue | [`compliance-data.md`](log/compliance-data.md) |
| 13 | `link-fetch` | SSRF-guarded server product-page and image fetcher | [`link-fetch.md`](log/link-fetch.md) |
| 14 | `eval-harness` | Paired baseline vs. pipeline evaluator + `/proof` | [`eval-harness.md`](log/eval-harness.md) |
| 15 | `simulation` | Living process loop + tabletop incident replays | [`simulation.md`](log/simulation.md) |
| 16 | `threat-watch` | Daily CISA/NCSC feed watch + Antigravity comparison | [`threat-watch.md`](log/threat-watch.md) |
| 17 | `fit-preview` | On-demand photorealistic Fit Preview tiles (`/api/fit`) | [`fit-preview.md`](log/fit-preview.md) |
| 18 | `eval-dataset` | 71-item curated evaluation dataset + `SOURCES.md` | [`eval-dataset.md`](log/eval-dataset.md) |
| 19 | `voice` | Chief TTS briefing + Live push-to-talk voice | [`voice.md`](log/voice.md) |
| 20 | `integration-pipeline` | Retry/grounding hardening, abort plumbing, full verification | [`integration-pipeline.md`](log/integration-pipeline.md) |

---

## Feature build record

### 1. Process equipment symbols (`equipment-process`)
- **What it is:** 16 parametric SVG process symbols (vessels with clipped liquid levels, pumps, valves, ISA-5.1 instruments, RO skid, UV reactor, carbonator, heat exchanger, 24-head rotary filler, conveyor, labeler, palletizer, screw compressor, 3-fan condenser) and the `/gallery` review route.
- **Key files:** `src/equipment/kinds/*` (process kinds), `src/equipment/process/*`, `src/equipment/Gallery.tsx`, `src/app/gallery/page.tsx`.
- **Verification:** `npm run typecheck`, focused ESLint, `npm run test` (6 tests at that time), `HTTP 200` on `/gallery`, and visual inspection of a raster contact sheet rendered from live gallery SVGs checking all 29 cards, unique `useId()` definitions, and motion CSS.
- **Known gaps:** macOS sandbox blocked live browser playback during verification; motion was checked via markup and CSS.
- **Log:** [`docs/log/equipment-process.md`](log/equipment-process.md)

### 2. Plant design (`plant-design`)
- **What it is:** Fictional 36,000 bottle/h cola bottling line (**Bebidas del Norte, Line 3**) with documented mass/energy balance across water treatment (75% RO recovery), 54 °Bx syrup, 10.6 °Bx blend, 3.7 vol carbonation, −4 °C/+1 °C glycol loop, duty/standby NH3 compressors, and isolated 2% NaOH CIP. Contains 92 assets, 13 areas, 6 entry points, 75 connections, 10 conduits, and 3 deliberate security weaknesses (`C-F3-PACK`, `GW-PK`, `HMI-F3`).
- **Key files:** `src/twin/seed.ts`, `src/twin/seed/*`.
- **Verification:** `npm run typecheck`, `npx vitest run src/twin` (7 seed checks: uniqueness, references, clearances, orthogonal piping, mass balance, CIP isolation), 19 total repo tests, baseline Inspector score **46.09/100 (elevated)**, `HTTP 200` on port 4119.
- **Known gaps:** Schematic inventory (bottle transfers, hardwired signals, and off-sheet utilities are descriptive); browser interaction check was blocked by local Chrome launcher at build time.
- **Log:** [`docs/log/plant-design.md`](log/plant-design.md)

### 3. Inspector rules engine (`rules-engine`)
- **What it is:** Pure TypeScript deterministic rules engine shared by browser and server: 13 rules (`RF-01`, `ZONE-01..03`, `CRED-01`, `USB-01`, `PHYS-01`, `TRANS-01`, `CAM-01`, `HAZ-01`, `WASH-01`, `SAFE-01`, `MGMT-01`), bounded 6-hop BFS reachability graph with canonical MITRE ATT&CK for ICS v20.1 techniques, ordinal 0–100 risk index, and `rankPlacements`.
- **Key files:** `src/rules/engine.ts`, `src/rules/registry.ts`, `src/rules/rules/*`, `src/rules/graph.ts`, `src/rules/paths.ts`, `src/rules/placement.ts`, `src/rules/score.ts`, `src/rules/compliance.ts`.
- **Verification:** `npm run typecheck`, `npx vitest run src/rules` (10 tests) and 20 repo tests. Warmed 120-asset dense fixture (240 paths) measured 2.41 ms median, 3.75 ms p95, 5.37 ms max against a 15 ms p95 budget. Verified seed camera scenario (46.09 -> 47.32 -> 46.52 radio off -> 46.09 best placement).
- **Known gaps:** Preliminary screening model only (no field RF survey, camera FOV geometry, structured ACL parsing, or physical damage model). Subsequent parallel Vitest runs across the full repo occasionally breached the 15 ms p95 timing assertion due to CPU contention.
- **Log:** [`docs/log/rules-engine.md`](log/rules-engine.md)

### 4. User-introduced device symbols (`equipment-devices-b`)
- **What it is:** 7 parametric SVG symbols for user-introduced devices (`wifi_ap`, `ip_camera`, `gateway`, `laptop`, `phone`, `usb_drive`, `generic_device`) following ISA-101 restraint, `compact` mode, and `useId()` gradients.
- **Key files:** `src/equipment/kinds/{wifi_ap,ip_camera,gateway,laptop,phone,usb_drive,generic_device}.tsx`.
- **Verification:** `npm run typecheck` and live `/gallery` inspection via headless Chrome screenshots across all states.
- **Known gaps:** No standalone unit tests for pure presentation SVG components.
- **Log:** [`docs/log/equipment-devices-b.md`](log/equipment-devices-b.md)

### 5. Plant floor schematic (`floor-view`)
- **What it is:** Top-down SVG schematic with pan/zoom/pinch camera, 10 m grid, zone boundaries, 92 equipment symbols, animated orthogonal pipes with media filters, shared-segment attack paths, entry points, drop pin, and drag-to-reassess for added devices.
- **Key files:** `src/floor/PlantFloor.tsx`, `FloorStage.tsx`, `ZoneLayer.tsx`, `AssetLayer.tsx`, `PipeLayer.tsx`, `AttackPathLayer.tsx`, `EntryPoints.tsx`, `DropPin.tsx`, `Legend.tsx`, `camera.ts`, `placement.ts`, `useFloorPlacement.ts`.
- **Verification:** `npm run typecheck`, `npx eslint src/floor`, `npx vitest run src/floor` (10 tests), 66 repo tests, and live Chrome check on `/` verifying fitted schematic, asset card, and pipe toggles.
- **Known gaps:** Physical-device pinch gestures, live Gemini reassessment, and sustained 60 fps frame-time measurements remain unverified.
- **Log:** [`docs/log/floor-view.md`](log/floor-view.md)

### 6. Analysis pipeline server (`pipeline-server`)
- **What it is:** Server-side SSE routes (`POST /api/analyze`, `POST /api/reassess`) orchestrating optional link fetch, `gemini-decision-1` gate, `gemini-4-hydrogen` Scout perception, `gemini-4-carbon` streaming Architect reasoning, Inspector self-check, at most one Carbon `previous_interaction_id` revision, and `gemini-4-neon` Chief briefing, plus browser SSE client and CLI smoke script.
- **Key files:** `src/app/api/analyze/route.ts`, `src/app/api/reassess/route.ts`, `src/gemini/{capture,assess,schemas,transport}.ts`, `src/pipeline/server/{run,groundAssessment,selfCheck,requests,sse}.ts`, `src/pipeline/{client,assetFromProfile}.ts`, `scripts/smoke-pipeline.ts`.
- **Verification:** `npm run typecheck`, 66 repo tests, intercepted SDK request checks confirming `v1beta` Decisions and `v1` streaming Interactions shapes and header-only auth, deterministic seed check (office pass vs. ammonia block: 47.46 -> 46.09), live localhost SSE tests returning missing-key gate error.
- **Known gaps:** Workspace lacked `GEMINI_API_KEY` at build time, so live model completions, Carbon thought deltas, and provider-side `previous_interaction_id` continuation were unverified. (Link cancellation and retry hardening were completed in workstream 20.)
- **Log:** [`docs/log/pipeline-server.md`](log/pipeline-server.md)

### 7. AI crew (`crew`)
- **What it is:** Four floor avatars (Scout, Architect, Inspector, Chief) driven by `pipelineBus`, room-entrance pathfinding, desk office in `crew_office`, 3-line floor briefing bubbles, reduced-motion direct placement, visible-tab `idle patrol`, and 200-entry `ActivityFeed`.
- **Key files:** `src/crew/{director,crewStore,feedStore,walk,walkTiming,patrol,officeLayout}.ts`, `src/crew/{CrewLayer,Avatar,Bubble,CrewOffice,ActivityFeed}.tsx`.
- **Verification:** `npx vitest run src/crew` (13 tests), 67 repo tests, scoped TypeScript/ESLint, Chromium checks confirming idle patrol (`LT-301 60 % · in band`), desk labels, reduced-motion placement, and gate-error feed row on live text capture.
- **Known gaps:** Successful live provider path unverified without `GEMINI_API_KEY`; Vitest covers full success/failure event sequences with test events.
- **Log:** [`docs/log/crew.md`](log/crew.md)

### 8. Results side panel (`panel`)
- **What it is:** 372 px results rail with sticky `RiskDial` (24-point sparkline + baseline delta), Chief briefing card, progressive analysis cards (`DeviceCard`, `PlacementAnswer`, `NeverPlace`, `RiskList`, `AttackPathList`, `ComplianceChips`, `RunProgress`), human-approved `MitigationQueue`, and `AssetInspector`.
- **Key files:** `src/panel/SidePanel.tsx`, `RiskDial.tsx`, `DeviceCard.tsx`, `PlacementAnswer.tsx`, `NeverPlace.tsx`, `RiskList.tsx`, `AttackPathList.tsx`, `ComplianceChips.tsx`, `MitigationQueue.tsx`, `AssetInspector.tsx`, `RunProgress.tsx`.
- **Verification:** Scoped TypeScript/ESLint, 71 repo tests, `HTTP 200` on `/`, React render check covering empty state, seeded telemetry, mitigation approval delta, and API gate error.
- **Known gaps:** Live analysis stopped at missing key; interactive browser checks were blocked at build time. Note: the three shared bindings requested in this log (`captureThumbnail` on `RunState`, multi-node path highlighting via `highlightIds`/`setHighlight`, and area highlighting) and `SpeakButton`/`FitPreview`/`WatchPanel` mounts were subsequently wired in the live codebase.
- **Log:** [`docs/log/panel.md`](log/panel.md)

### 9. Control and network equipment symbols (`equipment-devices-a`)
- **What it is:** 6 parametric SVG control/network symbols (`plc_cabinet`, `hmi` with visible right-bezel USB port, `workstation`, `server_rack`, `firewall`, `network_switch`) plus shared ISA-101 LED state helpers.
- **Key files:** `src/equipment/kinds/{plc_cabinet,hmi,workstation,server_rack,firewall,network_switch}.tsx`, `src/equipment/control/{led.tsx,control.css}`.
- **Verification:** Scoped TypeScript/ESLint, `HTTP 200` on `/gallery`, rasterized contact-sheet inspection across 9 states and 2.3x detail confirming unique `useId()` clip paths, zero `<text>` in compact mode, and running-only LED animations.
- **Known gaps:** Visual check used static rasterized SVGs rather than live browser video.
- **Log:** [`docs/log/equipment-devices-a.md`](log/equipment-devices-a.md)

### 10. Purdue network map (`purdue-view`)
- **What it is:** Linked Purdue Levels 0–5 + Level 3.5 DMZ diagram with aligned cell columns, collapsible Level 0 field groups (auto-expanding on floor selection/hover), conduit gates showing allowed flows, shared-segment attack paths with technique badges, and drag-to-relevel with reassessment.
- **Key files:** `src/purdue/PurdueMap.tsx` and layer/layout modules under `src/purdue/`.
- **Verification:** Scoped TypeScript, `npx vitest run src/purdue` (9 tests), 71 repo tests, Chrome checks on Floor/Purdue/Split tabs at 1,199 px and 519 px widths, two-way selection/hover, gate details, and synthetic added-device drag.
- **Known gaps:** Live Gemini reassessment unverified; asset-free conduit endpoints must match their Purdue band name.
- **Log:** [`docs/log/purdue-view.md`](log/purdue-view.md)

### 11. Capture card and phone QR handoff (`capture`)
- **What it is:** Floating capture card (up to 3 photos via laptop camera, file picker, drop, or paste; HTTP(S) product link; free text), shared JPEG encoder (<= 1600 px, quality 0.85), floor drop-pin chip, and standalone `/capture` phone sender paired via 6-character LAN QR code and in-memory 10-minute SSE mailbox.
- **Key files:** `src/capture/*`, `src/app/capture/{route.ts,phone.mjs,phone.css}`, `src/handoff/*`, `src/app/api/handoff/{info,[code],[code]/stream}/route.ts`.
- **Verification:** `npm run typecheck`, scoped ESLint, `npm run test -- --maxWorkers=1` (102 passed, 3 skipped), Chromium checks for camera canvas video, permission fallback, drop/paste, pinning, keyboard shortcuts, and LAN phone-sized QR handoff resizing a 2500 x 1400 image to 1600 x 896.
- **Known gaps:** Physical laptop cameras, Safari/WebKit, and real iOS/Android phones remain untested; phone handoff depends on venue Wi-Fi allowing LAN peer connections.
- **Log:** [`docs/log/capture.md`](log/capture.md)

### 12. Compliance reference catalogue (`compliance-data`)
- **What it is:** 58 verified compliance clauses across 22 frameworks/documents (IEC 62443, NIST SP 800-82r3, NIST CSF 2.0, EU NIS2, OSHA 1910.119, EPA RMP, ANSI/IIAR 2, NIOSH IDLH, IEC 61511-1, NFPA 70, IEC 60079, IEC 60529, ISO 20653, FDA 21 CFR 117, 3-A, EHEDG, NSF/ANSI 51 & 169), with 10 document/section-level entries explicitly marked `confidence: "medium"` to avoid invented clause numbers.
- **Key files:** `src/data/compliance.ts`, `src/data/compliance.test.ts`.
- **Verification:** `npx vitest run src/data` and `npm run typecheck`.
- **Known gaps:** Paywalled standards link to official landing pages. Note: `src/rules/compliance.ts` now imports `src/data/compliance.ts` directly for all 13 rules (resolving the rules-side gap noted in the log); `src/pipeline/server/` still uses prompt text.
- **Log:** [`docs/log/compliance-data.md`](log/compliance-data.md)

### 13. Product page fetcher (`link-fetch`)
- **What it is:** Server-only SSRF-guarded HTTP fetcher (`3 MB` HTML, `4 MB` image, `10 s` timeout, max `3` validated redirects, private/link-local/metadata IPv4+IPv6 blocklist) extracting title, JSON-LD `Product`, spec tables/lists (`<= 6,000` chars), and main image with magic-byte validation.
- **Key files:** `src/link/{fetchProductPage,safeFetch,extract,image,errors}.ts`, `src/link/__fixtures__/*`, `src/link/*.test.ts`.
- **Verification:** `npx vitest run src/link` (80 tests across 3 files, zero live network) and `npm run typecheck`. (Later verified live on `axis.com` in workstream 20.)
- **Known gaps:** No JS execution for client-rendered SPAs; blocked by WAF/bot challenges; no image resizing/conversion; narrow DNS-rebinding window between `dns.lookup` and `undici` connect; `run.ts` flattens `LinkFetchError` codes into one message.
- **Log:** [`docs/log/link-fetch.md`](log/link-fetch.md)

### 14. Evaluation harness and `/proof` page (`eval-harness`)
- **What it is:** Paired evaluation runner comparing single-call `gemini-4-hydrogen` baseline vs. full production pipeline, with anonymized `gemini-decision-1` device-type judging, post-hoc `evaluatePlacement` rule consistency checks, 22 metrics with Wilson 95% and paired bootstrap CIs, content-hashed caching (`--limit`, `--only`, `--resume`), and the `/proof` UI.
- **Key files:** `eval/{run,baseline,system,judge,metrics,statistics,dataset,cache,failures,markdown,report,validate}.ts`, `eval/FORMAT.md`, `src/app/proof/page.tsx`, `src/proof/*`.
- **Verification:** `npm run typecheck`, `npx vitest run eval` (9 tests), `npx tsx eval/validate.ts` (38 items at the time; later 71), `HTTP 200` on `/proof` empty state, `HTTP 404` on unknown failure-image ID, single-worker full suite (197 passed, 3 skipped).
- **Known gaps:** No measured report generated yet (`GEMINI_API_KEY` was absent); `package.json`'s `npm run eval` uses `--env-file=.env`, which exits before the script's own error if `.env` is missing; dynamic product URLs are fetched independently by each side.
- **Log:** [`docs/log/eval-harness.md`](log/eval-harness.md)

### 15. Line 3 living process and tabletop simulation (`simulation`)
- **What it is:** Deterministic visible-tab mass/energy balance loop (`patchTwinQuiet`, `< 1e-8 kg` residual/tick over 600 s) plus tabletop incident engine with pause, 1x/4x replay, floor overlays, counterfactual mitigation filtering, and exact reset. Built with 5 UI scenarios (`cip`, `ammonia`, `ransomware`, `wireless`, `chiller`); a 6th scenario (`carbonation`, "CO2 Upset") was added to `src/sim/scenarios/carbonation.ts` and `ALL_SCENARIOS`.
- **Key files:** `src/sim/{engine,runtime,simStore,monitors,outcome,overlay,crewAlerts}.ts`, `src/sim/process/*`, `src/sim/scenarios/*`, `src/sim/{SimControls,SimLayer,Timeline,IncidentEffects}.tsx`.
- **Verification:** `npx vitest run src/sim` (15 tests), ESLint, `npm run typecheck`, single-worker full suite (197 passed, 3 skipped), Chrome check confirming stock CIP containment at `00:12`, approval of CIP branch isolation, and updated timeline at `00:06`.
- **Known gaps:** Illustrative stage times and readings without calibrated dispersion, contamination chemistry, or RF propagation; `carbonation` is registered in `ALL_SCENARIOS` but not shown as a button in `SimControls.tsx`.
- **Log:** [`docs/log/simulation.md`](log/simulation.md)

### 16. Daily Threat Watch (`threat-watch`)
- **What it is:** Concurrent fetcher for CISA KEV JSON, CISA ICS RSS, and UK NCSC RSS (8 s deadline, 30-min cache, 14-day window), seed inventory matcher (cap 24 pairs), `gemini-decision-1` triage, `gemini-4-neon` grounded synthesis with rules-engine deltas, optional `antigravity-preview-09-2026` remote-agent comparison (`/api/watch/managed`), `WatchPanel`, and headless cron runner (`scripts/daily-watch.ts`).
- **Key files:** `src/watch/*`, `src/app/api/watch/{run,managed}/route.ts`, `scripts/daily-watch.ts`.
- **Verification:** `npm run typecheck`, 15 watch tests (including live feed smokes), live localhost stream on Nov 21 fetching 21 KEV + 19 ICS + 2 NCSC items and 3 candidate pairs before missing-key errors, intercepted SDK checks.
- **Known gaps:** Live Decisions, Neon, and Antigravity completions unverified without `GEMINI_API_KEY`; NVD outside scope. Note: `WatchPanel` is now mounted in `SidePanel.tsx` and toggled from `TopBar.tsx` (resolving the missing-mount item noted in the log).
- **Log:** [`docs/log/threat-watch.md`](log/threat-watch.md)

### 17. Fit Preview (`fit-preview`)
- **What it is:** On-demand 4:3 photorealistic installation preview comparing recommended placement vs. current drop location using `gemini-nano-banana-2.1`, grounded in live twin room attributes, nearby equipment offsets, and optional capture photo, with a 15-min/24-entry LRU cache and lightbox.
- **Key files:** `src/app/api/fit/route.ts`, `src/fit/{FitPreview,FitTile,FitLightbox}.tsx`, `src/fit/{prompt,scene,placements,cache}.ts`.
- **Verification:** `npm run typecheck`, 6 focused Vitest tests, full suite (`--no-file-parallelism`: 205 passed, 3 skipped), `HTTP 400` / `HTTP 503` route checks, intercepted SDK check, isolated Chrome fixture verifying both tiles, tile removal after move, and lightbox keyboard dismissal.
- **Known gaps:** Live image generation and visual resemblance require `GEMINI_API_KEY`. Note: `<FitPreview />` is now mounted in `SidePanel.tsx` and `captureThumbnail` is now exposed on `RunState`.
- **Log:** [`docs/log/fit-preview.md`](log/fit-preview.md)

### 18. Evaluation dataset (`eval-dataset`)
- **What it is:** Curated 71-item benchmark: 54 Wikimedia Commons JPEGs (46 devices across 14 categories + 8 negatives; 27 clean, 16 messy, 11 edge), 9 project-authored text captures, and 8 live product URLs, with complete provenance and licences in `SOURCES.md`.
- **Key files:** `eval/dataset/{labels.csv,links.csv,SOURCES.md}`, `eval/dataset/images/photo-001.jpg`..`photo-054.jpg`.
- **Verification:** `npx tsx eval/validate.ts` (`Validated 71 evaluation items.`), separate JPEG decode + uniqueness + perceptual-hash audit (500–1600 px long edge, max 1.27 MB), live `HTTP 200` + extractor check on all 8 product URLs, `npm run typecheck`, single-worker full suite (205 passed, 3 skipped).
- **Known gaps:** Single-curator placement labels; area and level scored independently; public Commons images may have prior model pretraining exposure; Moxa's full connector table is absent from the extracted link snapshot.
- **Log:** [`docs/log/eval-dataset.md`](log/eval-dataset.md)

### 19. Chief voice (`voice`)
- **What it is:** Spoken Chief briefing (`SpeakButton` + `POST /api/voice/speak` via `gemini-3.8-flash-tts`, `Charon` voice, 24 kHz WAV, 8 MiB cache, optional auto-speak) and push-to-talk Live voice (`TalkToChief` + `POST /api/voice/session` minting 1-use `v1beta` ephemeral tokens for `gemini-3.8-live` with PCM16 audio worklet, live context snapshots, and 5 validated client tools).
- **Key files:** `src/app/api/voice/{speak/route,session/route,session/setup,response}.ts`, `src/voice/{SpeakButton,TalkToChief}.tsx`, `src/voice/{briefings,talkSession,liveWire,liveAudio,microphone,micProcessor,context,toolDispatch,chiefActions,wav}.ts`.
- **Verification:** `npm run typecheck`, scoped ESLint, 8 voice tests, intercepted `v1beta` transport checks, `HTTP 503` missing-key route checks, Chrome checks for error display, auto-speak persistence, mic permission flow, and synthetic PCM worklet track release.
- **Known gaps:** Live authenticated TTS, ephemeral token minting, and Live voice dialogue unverified without `GEMINI_API_KEY`; Safari/WebKit unverified; `useChiefPath` is not yet subscribed by `src/floor/` or `src/purdue/` for exact-path highlighting. Note: `TalkToChief` and `SpeakButton` are now mounted in `AppShell.tsx` and `SidePanel.tsx`.
- **Log:** [`docs/log/voice.md`](log/voice.md)

### 20. Pipeline integration and hardening (`integration-pipeline`)
- **What it is:** End-to-end resilience pass adding single 350 ms abortable retry on HTTP 429/5xx across link fetch and all model stages, Carbon completion-text fallback, graceful skip when revision fails or lacks an interaction ID, server-assigned IDs and per-mitigation rules-engine deltas, overlapping-zone context for Carbon, link-fetch DNS/body abort propagation, SSE thumbnail handoff, and aligned crew cues across analyze and reassess flows.
- **Key files:** `src/gemini/{transport,capture,assess,schemas}.ts`, `src/pipeline/server/{run,groundAssessment,requests,sse}.ts`, `src/pipeline/{client,assetFromProfile}.ts`, `src/link/{safeFetch,fetchProductPage,image}.ts`, `src/crew/{director,crewStore}.ts`, `scripts/smoke-pipeline.ts`.
- **Verification:** `npm run typecheck`, scoped ESLint, 130 focused tests across 14 files, full Vitest suite passing **262 tests across 42 files (3 skipped)**, live `POST /api/analyze` fetching `https://www.axis.com/products/axis-m3085-v` + PNG in 215 ms before stopping at the missing-key gate, and CLI smoke tests across text, `photo-002.jpg`, and link modes.
- **Known gaps:** `.env` was still absent during this pass, leaving all live Gemini completions, provider-side schema acceptance, and model latencies unverified; link fetcher retains the socket-level DNS pinning limitation.
- **Log:** [`docs/log/integration-pipeline.md`](log/integration-pipeline.md)
