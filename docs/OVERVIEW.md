# Pyre Witness

Snap any industrial or consumer device to see where it belongs in your plant and what physical, cyber, and compliance risk it introduces.

![Pyre Witness plant digital twin](public/brand/hero.png)

- **Living plant digital twin:** An interactive top-down SVG schematic of a fictional 36,000 bottle/h cola bottling line (**Bebidas del Norte, Line 3** — 92 assets, 13 areas, 6 entry points) paired with a linked Purdue network map (Levels 0–5 and the IT/OT DMZ).
- **Capture from anywhere:** Submit 1–3 photos from a laptop camera, file drop/paste, or same-LAN phone QR handoff (`/capture`), paste an HTTP(S) product link, or type a plain-text description.
- **Multi-model Gemini 4 pipeline with a walking crew:** Four visible crew members walk real routes on the plant floor as server-sent events fire — **Scout** (`gemini-4-hydrogen`), **Architect** (`gemini-4-carbon`), **Inspector** (deterministic rules engine, not a model), and **Chief** (`gemini-4-neon`).
- **Deterministic self-check and human-approved mitigations:** A 13-rule OT/physical engine with a MITRE ATT&CK for ICS reachability graph audits every model recommendation, triggers one grounded revision on disagreement, and queues concrete mitigations that never mutate the twin until an engineer approves them.
- **Operational depth beyond single captures:** Includes a live mass-and-energy process model, deterministic tabletop incident replays, daily Threat Watch against live CISA KEV / CISA ICS / UK NCSC feeds, photorealistic Fit Preview tiles, spoken and push-to-talk Chief voice, and a paired evaluation harness at `/proof`.

## Hackathon fit

Pyre Witness targets industrial OT security and engineering triage: plant engineers routinely add cameras, sensors, gateways, laptops, and replacement equipment without a clear view of how a physical placement affects Purdue segmentation, hazardous-area ratings, washdown hygiene, or attack paths.

| Judging criterion | How Pyre Witness addresses it |
| --- | --- |
| **Live demo on unrehearsed inputs** | Accepts live camera photos (laptop or phone QR handoff at `/capture`), arbitrary HTTP(S) product links (server-side SSRF-guarded fetch), or free text. Dragging a placed device on the floor or Purdue map re-runs reasoning against the exact new coordinates and level via `POST /api/reassess` without re-running perception. |
| **Proof it works** | Ships a paired evaluation harness (`eval/`) comparing the full pipeline against a single-call `gemini-4-hydrogen` baseline on 71 labeled captures (54 Wikimedia Commons photos, 9 text items, 8 live product URLs) with Wilson 95% confidence intervals, paired bootstrap intervals, and an honest failure gallery rendered at `/proof`. Every live recommendation is checked by the deterministic Inspector rules engine before presentation. Note: `eval/report/latest.json` has not been generated yet (see [Limits and honest gaps](#limits-and-honest-gaps)). |
| **Creativity** | Replaces a chat box with an ISA-101 "engineering drawing at night" schematic: 29 custom parametric SVG equipment symbols, animated process pipes, linked floor/Purdue selection, photorealistic in-plant Fit Preview tiles, and a four-member crew driven solely by real pipeline events. |
| **Gemini 4 and Decisions API use** | Assigns each Gemini 4 model one narrow role (Hydrogen for perception, Carbon with streaming thought summaries and `previous_interaction_id` for reasoning and revision, Neon for briefing and daily threat watch) and uses `gemini-decision-1` (`v1beta` Decisions API, zero output tokens) for capture gating, threat-watch triage, and anonymized evaluation judging. |

## Gemini models and their jobs

All model identifiers are centralized in [`src/gemini/models.ts`](src/gemini/models.ts) and invoked server-side only (except the Live WebSocket, which uses short-lived single-use ephemeral tokens minted by the server).

| Model ID | Role constant | Thinking | Job in Pyre Witness | Code |
| --- | --- | --- | --- | --- |
| `gemini-4-hydrogen` | `MODEL_IDS.perception` | `low` | **Scout:** converts photo, product link snapshot, or text into structured `DeviceProfile`. Also serves as the single-call evaluation baseline. | `src/gemini/capture.ts`, `eval/baseline.ts` |
| `gemini-4-carbon` | `MODEL_IDS.reasoning` | `high` | **Architect:** streams thought summaries and structured `Assessment` (placement, exclusions, risks, attack paths, compliance, mitigations) plus one `previous_interaction_id` revision if Inspector disagrees. | `src/gemini/assess.ts` |
| `gemini-4-neon` | `MODEL_IDS.chief` | `low` | **Chief:** writes the 2–3 line engineer briefing and synthesizes daily Threat Watch advisories into grounded findings and proposals. | `src/gemini/assess.ts`, `src/watch/reassess.ts` |
| `gemini-decision-1` | `MODEL_IDS.decisions` | n/a (`v1beta` Decisions API) | Admission gate (4 calibrated questions before perception), Threat Watch candidate triage (3 questions per pair), and anonymized device-type judge in evaluation. | `src/gemini/capture.ts`, `src/watch/triage.ts`, `eval/judge.ts` |
| `gemini-3.8-live` | `MODEL_IDS.live` | n/a (`v1beta` Live API) | Push-to-talk voice conversation with Chief over ephemeral tokens with 5 validated client tools (asset/path focus, view switch, recommended move). | `src/app/api/voice/session/setup.ts`, `src/voice/TalkToChief.tsx` |
| `gemini-3.8-flash-tts` | `MODEL_IDS.tts` | n/a (`v1beta` Interactions) | Spoken Chief briefing audio (`Charon` voice, 24 kHz WAV, cached in memory). | `src/app/api/voice/speak/route.ts`, `src/voice/SpeakButton.tsx` |
| `gemini-nano-banana-2.1` | `MODEL_IDS.image` | n/a (Interactions) | On-demand 4:3 photorealistic Fit Preview tiles comparing recommended placement vs. current drop location. | `src/app/api/fit/route.ts`, `src/fit/FitPreview.tsx` |
| `antigravity-preview-09-2026` | `MODEL_IDS.managedAgent` | n/a (`v1beta` Managed Agent) | Optional Threat Watch comparison: Google-hosted remote agent that fetches the same public feeds and writes `watch-report.json`. | `src/watch/managedAgent.ts`, `src/app/api/watch/managed/route.ts` |

`MODEL_IDS.deepResearch` (`deep-research-preview-04-2026`) is declared in `src/gemini/models.ts` for reference and is not called in the application.

## How it works

`POST /api/analyze` streams one JSON `PipelineEvent` per Server-Sent Events frame (`data: <json>\n\n`). The browser client ingests every frame into `useRunStore` and broadcasts it on `pipelineBus`, which drives the crew avatars, activity feed, and results rail without timers.

### Pipeline stages and events

| Stage | Events emitted | Engine | Timeout |
| --- | --- | --- | --- |
| Start | `run.started` | Server (`runAnalyze` / `runReassess`) | — |
| Link fetch (link mode only) | `link.started`, `link.fetched` | `src/link/fetchProductPage.ts` | 18 s |
| Gate | `gate.started`, `gate.done` | `gemini-decision-1` | 20 s |
| Perception | `perception.started`, `perception.done` | `gemini-4-hydrogen` (Scout) | 45 s |
| Reasoning | `reasoning.started`, `reasoning.thought`, `reasoning.done` | `gemini-4-carbon` (Architect) | 120 s |
| Self-check | `selfcheck.started`, `selfcheck.path`, `selfcheck.done` | Deterministic `rules engine` (Inspector) | sync |
| Revision (at most once) | `revision.started`, `revision.done` -> repeat `selfcheck.*` | `gemini-4-carbon` via `previous_interaction_id` | 120 s |
| Briefing | `summary.started`, `summary.done` | `gemini-4-neon` (Chief) | 30 s |
| Terminal | `run.completed` or `run.error` | Server | — |

Dragging a placed device calls `POST /api/reassess` (`mode: "reassess"`), which keeps the existing `DeviceProfile`, skips link/gate/perception, and runs reasoning, self-check, optional revision, and briefing at the exact new location and Purdue level.

### The propose -> check -> revise-once loop

1. **Model proposes:** Architect (`gemini-4-carbon`) receives the `DeviceProfile`, candidate coordinates/overlapping zones, and compact twin, then outputs a Zod-validated `Assessment`.
2. **Server grounds:** `groundAssessment` drops attack paths containing unknown asset IDs or disconnected hops, strips unknown MITRE ATT&CK for ICS technique IDs, attaches deterministic run-scoped IDs, and measures each proposed mitigation's real rules-engine risk delta.
3. **Deterministic rules engine checks:** Inspector (`src/rules/engine.ts`) evaluates both the recommended placement and the candidate drop spot across all 13 rules and the reachability graph. It records disagreements whenever invalid paths/techniques were stripped, the recommendation triggers a severity 4–5 blocker, or `rankPlacements` finds an unblocked alternative that removes a blocker or lowers the risk score by at least 10 points.
4. **Model revises once:** If disagreements exist and Carbon returned an interaction ID, the server continues the stored interaction (`previous_interaction_id`) with the exact disagreement list, re-grounds the revision, and runs Inspector one final time. Chief then briefs the engineer on the final checked result, noting any unresolved blockers.

## Run it

### Prerequisites

- Node.js 20+ (built-in `fetch` and `AbortSignal.any`) and npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/api-keys)

### Setup and development server

```bash
npm install
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=<your-key> (server-side only)
npm run dev
```

The app runs on `http://localhost:4119`.

### Application URLs

| Route | Purpose |
| --- | --- |
| `http://localhost:4119/` | Main single-screen workspace (Plant floor, Purdue map, Split view, Capture, Simulation, Voice, Results, Threat Watch) |
| `http://localhost:4119/gallery` | Interactive contact sheet of all 29 parametric SVG equipment symbols across running, stopped, selected, recommended, unsafe, alarm, and compact states |
| `http://localhost:4119/proof` | Measured evaluation report comparing Pyre Witness against the single-call baseline (`eval/report/latest.json`) |
| `http://localhost:4119/capture` | Standalone phone capture page opened via the desktop Capture card's same-LAN QR code (`/capture?code=XXXXXX`) |

### Verification, tests, and evaluation commands

```bash
npm run typecheck                       # Whole-repo strict TypeScript check
npm run test                            # Full Vitest suite
npm run test -- --maxWorkers=1          # Avoids CPU contention on the 15 ms p95 rules-engine timing test
npx tsx eval/validate.ts                # Validates the 71-item dataset in eval/dataset/
npm run eval -- --limit 8               # Runs a stratified 8-item paired eval (requires GEMINI_API_KEY in .env)
npm run eval                            # Runs the full 71-item paired eval (supports --only baseline|system, --resume)
```

Optional server-side CLI smoke tools:

```bash
npx tsx --env-file=.env scripts/smoke-pipeline.ts "Industrial Ethernet pressure transmitter with 4-20 mA output"
npx tsx --env-file=.env scripts/smoke-pipeline.ts --link https://www.axis.com/products/axis-m3085-v
npx tsx --env-file=.env scripts/daily-watch.ts
```

## What is simulated vs. real

| Simulated / fictional | Real |
| --- | --- |
| **Plant:** "Bebidas del Norte, Line 3" is a fictional 36,000 bottle/h cola line (labelled simulated in the top bar). | **Model calls:** All Gemini 4, Decisions, Live, TTS, Image, and Antigravity calls hit the real Google GenAI APIs. Zero mocked model responses or hard-coded AI outputs exist. |
| **Process telemetry & idle patrol:** Deterministic mass/energy balance ticks (`src/sim/process/`) with bounded synthetic noise; idle crew rounds are explicitly labelled `idle patrol` and never emit findings. | **Rules engine:** `src/rules/engine.ts` runs 13 deterministic OT/physical/compliance rules and a bounded BFS reachability graph on the real twin state in both browser and server. |
| **Incident replays:** Tabletop exercises (`src/sim/scenarios/`) use illustrative stage timings and modeled safeguard checks rather than calibrated gas dispersion or RF field propagation. | **Product fetching & Threat Watch feeds:** `src/link/` fetches live HTML and product images with SSRF guards; `src/watch/` downloads live CISA KEV JSON, CISA ICS RSS, and UK NCSC RSS feeds. |
| **Risk index:** Ordinal 0–100 screening index over modeled graph reachability and rule severities. | **Evaluation & mitigations:** `eval/` executes both systems on 71 curated inputs and computes statistical intervals; human mitigation approvals mutate the twin and re-evaluate live risk. |

## Limits and honest gaps

Documented directly from the build logs in [`docs/log/`](docs/log/) and code inspection:

- **Live Gemini API execution was unverified during feature builds:** `.env` had no `GEMINI_API_KEY` while the individual feature lanes were built and verified. SDK request serialization, API versions, schemas, header-only authentication, and error handling were verified in unit and intercepted-transport tests, but live model completions (pipeline, Fit Preview, TTS/Live voice, Threat Watch, Antigravity) must be smoke-tested with the configured key before presenting.
- **Evaluation report not yet generated:** `eval/report/latest.json` does not exist yet and `eval/report/REPORT.md` still contains the pre-run placeholder (citing 38 items from before the dataset expanded to 71). Run `npm run eval` with `GEMINI_API_KEY` to populate `/proof` and `eval/report/REPORT.md`.
- **Hardware and browser gaps:** Physical laptop cameras, Safari/WebKit, iOS and Android phones, physical-device pinch zoom, and sustained 60 fps rendering were not verified on hardware. Phone QR handoff requires the venue Wi-Fi to allow LAN device-to-device traffic.
- **Rules and simulation scope:** Inspector checks and tabletop replays are preliminary screening tools, not field-calibrated RF surveys, structured firewall ACL parsers, or physical dispersion/contamination models. Under parallel Vitest execution, CPU contention can push the 120-asset rules-engine benchmark past its 15 ms p95 test assertion (use `--maxWorkers=1`).
- **Product link fetcher:** Retrieves raw server HTML without executing JavaScript (client-rendered SPAs yield only initial HTML/meta/JSON-LD), cannot bypass WAFs or CAPTCHAs, skips images over 4 MB or in unsupported formats (AVIF/SVG), and has a narrow DNS-rebinding window between `dns.lookup` and `undici` socket connect. `src/pipeline/server/run.ts` currently collapses `LinkFetchError` codes into one generic failure message.
- **Minor integration gaps:** Live voice's `useChiefPath` store is not yet subscribed by `src/floor/` or `src/purdue/` (the voice bar displays the exact path and selects its target asset, but diagrams highlight by asset rather than exact path ID). A sixth simulation scenario (`carbonation`, "CO2 Upset") is registered in `ALL_SCENARIOS` and tested, but `SimControls.tsx` exposes only the five `SCENARIOS` buttons.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Directory map, shared contracts, Mermaid data-flow diagrams, rules reference, scenario list, and evaluation design.
- [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md) — Chronological build record across all 20 workstreams with verification status and links to every detailed log in `docs/log/`.

## Credits and licences

- **MITRE ATT&CK for ICS:** Technique catalogue in [`src/data/attack-ics.ts`](src/data/attack-ics.ts) is generated from the official STIX bundle (`github.com/mitre-attack/attack-stix-data`, `ics-attack` v20.1, 104 active techniques). `(c) The MITRE Corporation. Reproduced and distributed with the permission of The MITRE Corporation.`
- **Public advisory feeds:** [CISA Known Exploited Vulnerabilities Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog), [CISA ICS Advisories](https://www.cisa.gov/news-events/cybersecurity-advisories), and [UK NCSC News Feed](https://www.ncsc.gov.uk/).
- **Compliance references:** Catalogue in [`src/data/compliance.ts`](src/data/compliance.ts) links to official landing pages from ISA/IEC, NIST, EUR-Lex, OSHA, EPA, IIAR, NIOSH/CDC, NFPA, ISO, FDA/eCFR, 3-A, EHEDG, and NSF.
- **Evaluation dataset imagery:** The 54 photographs in `eval/dataset/images/` are third-party Wikimedia Commons works licensed under CC0, Public Domain, CC BY, and CC BY-SA terms. Complete per-file attribution, authors, source URLs, and licence links are maintained in [`eval/dataset/SOURCES.md`](eval/dataset/SOURCES.md).
