# Pyre Witness: overview

Long-form companion to [`README.md`](../README.md). Architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md). Timeline: [`BUILD_LOG.md`](BUILD_LOG.md). Judges: [`JUDGES.md`](JUDGES.md).

**Snap any device. See where it belongs in your plant, and what risk it brings, before you plug it in.**

An engineer gives 1 to 3 photos, a product link, or a description. Gemini 4 identifies the item and reasons over a digital twin of the plant. The app answers:

1. Where should it go? Plant area and Purdue level.
2. Where must it never go?
3. What risk does it bring? Physical, cyber, compliance; MITRE ATT&CK for ICS.
4. Which new attack paths does it open?

The twin updates live: the device appears on the floor and the Purdue map, new paths are drawn, the risk score changes.

> **Demo plant:** *Bebidas del Norte, Line 3*, a fictional 36,000 bottle/h cola line. `92` assets, `13` areas, `6` entry points, `75` connections. Seed risk score `46.09` (elevated). Source: `docs/log/plant-design.md`.

## What is on the screen

| Part | What it does | Code |
| --- | --- | --- |
| Plant floor | Top-down drawing, `29` parametric equipment kinds, animated pipes, attack paths | `src/floor`, `src/equipment` |
| Lens | `Material` / `Both` / `Data` (keys `1` `2` `3`); `Levels` in Data shows Purdue levels | `src/layers` |
| Purdue map | L0 to L5 and the L3.5 DMZ, conduits, linked selection | `src/purdue` |
| Capture rail | `Camera`, `Upload`, `Product link`, `Describe device`, `Pin location`, `Phone QR` | `src/capture`, `src/handoff` |
| Crew | Scout, Architect, Inspector, Chief move with real pipeline events; `idle patrol` otherwise | `src/crew` |
| Results panel | Risk dial, plant loss exposure, placement answer, `Move there`, risks, paths, mitigations, `Model the twin`, `Fit preview` | `src/panel`, `src/econ`, `src/modeler`, `src/fit` |
| Simulate | `6` tabletop scenarios, `1×` / `4×`, approval of safeguards | `src/sim` |
| Top bar | `Watch`, `Gemini n/10`, `Proof`, risk score | `src/shell/TopBar.tsx` |
| Voice | `Hold to talk` (or Space); briefing read aloud | `src/voice` |
| Transcript | `T`: every prompt and raw response | `src/transcript` |

## Models and their jobs

Ids from `src/gemini/models.ts` only.

| Job | Model | Why this one |
| --- | --- | --- |
| Input gate (`6` questions), Watch triage, modeller gate, eval judge | `gemini-decision-1` (Decisions API) | Calibrated answers, no generated text; gate `1.125 s` p50 |
| Scout: perception | `gemini-4-hydrogen` (`low`) | Fast vision; `8.969 s` p50 |
| Architect: placement, risk, revision | `gemini-4-carbon` (`low`) | Deep reasoning over the twin; `12.542 s` p50 |
| Chief: briefing, Watch reassessment | `gemini-4-neon` (`low`) | Short grounded text; `4.117 s` p50 |
| Inspector | Rules engine (not a model) | Deterministic checks; `0.175 ms` warmed median |
| Voice | `gemini-3.8-live`, `gemini-3.8-flash-tts` | Push-to-talk with `5` tools; streamed speech |
| Fit preview | `gemini-nano-banana-2.1` | Image of the device in place, labelled AI-generated |
| Watch comparison | `antigravity-preview-09-2026` | Managed agent on the same feeds |
| Twin modeller | Files API + Decisions + Hydrogen + Neon | Video, photos, PDF, CSV to proposed assets |

Latencies: 6-worker reliability batch (`docs/log/pipeline-speed.md`) and `docs/log/rules-engine.md`.

## How a capture runs

1. Optional product page fetch (SSRF-guarded).
2. Decisions gate and Scout start together. A gate rejection stops the run; a gate timeout continues, labelled.
3. Rules engine checks the device at the pinned spot (`as-dropped`). First verdict `6.605 s` p50.
4. Architect proposes placement, risks, mitigations. Server grounding removes unknown asset and ATT&CK ids.
5. Rules engine checks the recommendation. If it disagrees, Carbon gets one revision through `previous_interaction_id`. Still blocked: hold.
6. Chief writes 2 to 3 lines from the checked facts.

Every step is a typed SSE event; the crew, panel, transcript and twin read the same stream. Full capture `28.905 s` p50 in the reliability batch, `24.6 s` median in eval Run 4.

Passive objects (a mug, a chair) get physical and food-safety findings only, no cyber claims.

## Beyond one capture

- **Simulation** (simulated): process mass and energy model; `6` replays: `CIP Crossover`, `Ammonia Release`, `Chiller Trip`, `CO₂ Upset`, `Site Ransomware`, `Rogue Wireless`. Mitigations wait for approval; the rerun is compared with the original.
- **Threat Watch**: CISA KEV, CISA ICS, UK NCSC and openFDA beverage recalls; each item scored against the plant inventory; Decisions triage; Neon summary; human `Approve` / `Reject`. Live check: `21` KEV, `19` ICS, `2` NCSC, `4` openFDA events gave `7` rows matched to plant assets and `39` other items behind one disclosure. Recalls are mapped to plant consequences with a loss figure (Voila juice on `FIL-3`, `$3M est.` per comparable event). Source: `docs/log/watch-relevance.md`.
- **Escalation call**: when an estimated loss (default `$100,000` per event) or the plant risk (default `60`, or `8` points over baseline) crosses a threshold, the app raises a call to a paired phone. The Chief's briefing is spoken by `gemini-3.8-flash-tts`. The phone can `Approve action` (applied to the twin) or `Acknowledge`. A real cellular call can be placed from the paired phone's own dialer: no carrier integration. Sources: `docs/CALL_DEMO.md`, `docs/log/escalation-call.md`.
- **3D view**: `2D` / `3D` switch in the top bar. The same live twin, drawn by a hand-written WebGL2 renderer, no 3D library. Heights are illustrative. Source: `docs/log/view3d.md`.
- **Samples tray**: `Samples` on the capture rail, six credited photos that run the real pipeline (`docs/DEMO_KIT.md`).
- **Theme**: dark and light (`src/theme`).
- **Managed-agent comparison**: Antigravity on the same feeds, `72.05 s`, marked partial when a feed failed.
- **Twin modeller**: drop CSV, photos, PDF or video; review ghost assets; apply.
- **Fit preview**: image of the device at the recommended and dropped spots.
- **Health**: `10` live service probes behind the `Gemini n/10` chip.
- **Economic loss**: see below.

## Rules engine and risk score

`17` rule ids: `16` registered rules plus `PLACE-01` (`src/rules/registry.ts`). List and references: README and `docs/log/rules-engine.md`. Attack paths: breadth-first search up to `6` steps from `6` entry points to critical or safety targets; techniques from ATT&CK for ICS v20.1 (`104` techniques). Compliance references: `58` clauses (`src/data/compliance.ts`).

Score `0–100`: `round(100 × E / (600 + E), 2)`, `E` from finding severities and path likelihoods. Bands: low < 20, guarded 20 to 39, elevated 40 to 59, high 60 to 79, critical ≥ 80. A screening heuristic, not a certification.

## Economic loss estimate

Deterministic, Open FAIR structure (`src/econ`, `docs/log/loss-model.md`):

- Frequency from the rules-engine route × a vulnerability prior. Magnitude = downtime + repair + product + response + liability (PERT three-point estimates).
- `10,000` fixed-seed draws; same input, same number.
- Each loss figure shows the asset drawing, one estimated USD number, and `Show more` with every line of the calculation.
- Plant total under the risk dial: `$110k est. / yr` (seed: `43` detections, each asset and consequence counted once). Audited today; it read `$280k / yr` before the audit.
- Worked examples (seed): `HMI-F3` USB finding `$29k` per event, `$2.5k / yr`; `PLC-F3` safety finding `$94k` per event, `$8.6k / yr`; ammonia tabletop evacuation `$2.3M` per event, `$37k / yr` (`src/econ/README.md`).
- Published: only the OSHA reference `$165,514`, shown for context, not a model input. Everything else is assumed (simulated plant).

## Evaluation

Harness in `eval/`, results on `/proof`. Dataset: `71` items (`54` Wikimedia Commons photos, `8` product links, `9` text). Baseline: one `gemini-4-hydrogen` call with a prose plant description.

Run 4 against the saved fair baseline, `66` of `71` answered by both (`eval/report/SUMMARY.md`, `eval/report/REPORT.md`):

| Metric (shared answers) | Single-call Hydrogen | Pyre Witness |
| --- | ---: | ---: |
| Forbidden-area recommendations | `5.6%` (3/54) | `0.0%` (0/54) |
| Key-risk recall | `51.7%` (61/118) | `58.5%` (69/118) |
| Equipment kind | `94.8%` (55/58) | `98.3%` (57/58) |
| Plant area (`n=57`) | `87.7%` | `89.5%` |
| Purdue level (`n=54`) | `96.3%` | `94.4%` |
| Device vs non-device (`n=66`) | `100%` | `100%` |
| Valid ATT&CK ids | `86.0%` (`n=50`) | `100.0%` (`n=28`) |
| Median latency | `13.3 s` | `24.6 s` |

One Hydrogen call is a strong baseline. Run 3 lost to it on equipment kind and key-risk recall. The fix (kind definitions in the Scout prompt; a final risk list that is complete by construction) produced Run 4, which ties or leads on every metric in this table except Purdue level. The single call still leads on radio recall (`100.0%` vs `33.3%`), cloud flags (`88.5%` vs `23.1%`), device category and device-type naming (`eval/report/REPORT.md`). On the headline metrics no difference is statistically significant on `71` items (area `p=1.00`, kind `p=0.625`, forbidden areas `p=0.250`); the single call is significantly better on radio recall and cloud flags. One development set that informed the iterations; no held-out set. Run history is in `BUILD_LOG.md`.

Reliability batch: `61/63` completed at 6 workers, `2` correct rejections, `0` operational failures (`docs/log/pipeline-speed.md`).

## Run it

```bash
npm install
cp .env.example .env     # set GEMINI_API_KEY (server only)
npm run dev              # http://localhost:4119
```

| Command | Does |
| --- | --- |
| `npm run typecheck` | Strict TypeScript |
| `npm run test` | Vitest; `498` passed, `3` skipped at 13:37 EST |
| `npx tsx eval/validate.ts` | Validates the 71-item dataset |
| `npm run eval` | Paired evaluation (needs the key) |
| `npx tsx --env-file=.env scripts/smoke-pipeline.ts "<description>"` | One live capture from the CLI |
| `npx tsx --env-file=.env scripts/bench-pipeline.ts --suite reliability --workers 6` | Reliability batch |
| `npx tsx --env-file=.env scripts/health.ts --all` | Service probes |
| `npx tsx --env-file=.env scripts/daily-watch.ts` | Headless Threat Watch |

Pages: `/` app, `/gallery` symbols, `/proof` evaluation, `/capture` phone capture (QR), `/lens` lens reference, `/crew-review` crew review.

## Real and simulated

| Real | Simulated and labelled |
| --- | --- |
| Every model call; product page fetch; CISA, NCSC and openFDA feeds; evaluation runs | The plant, inventory, telemetry; tabletop replays; cost inputs |
| Rules engine and attack-path search (deterministic code) | Crew `idle patrol` between runs |

## Limits

- Radio recall `33.3%` and cloud-flag accuracy `23.1%` in Run 4; the single call leads on both (`100.0%`, `88.5%`).
- Escalation call: physical handset audio, vibration and a carrier connection unverified.
- Security: single-user demo, no login, plain HTTP on the LAN (`docs/SECURITY.md`).
- Rules and replays are screening tools, not RF surveys, ACL parsers or dispersion models.
- Product links: no JavaScript rendering; WAF and CAPTCHA pages fail.
- Physical cameras, microphones, speakers, Safari and phones not tested; headless Chromium only.
- Loss figures depend on assumed costs; calibration needs site data.

## Credits

- **MITRE ATT&CK for ICS** v20.1 in `src/data/attack-ics.ts`, from the official STIX bundle. © The MITRE Corporation, reproduced with permission.
- **Feeds:** [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog), [CISA ICS advisories](https://www.cisa.gov/news-events/cybersecurity-advisories), [UK NCSC](https://www.ncsc.gov.uk/).
- **Compliance:** `src/data/compliance.ts` links to official pages (ISA/IEC, NIST, OSHA, FDA/eCFR, NFPA, IIAR, EHEDG, 3-A and others).
- **Dataset photos:** `54` Wikimedia Commons works (CC0, public domain, CC BY, CC BY-SA); attribution in `eval/dataset/SOURCES.md`.
